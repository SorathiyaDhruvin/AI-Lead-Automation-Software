/**
 * Automation Engine — Core backend service for event-driven workflow execution.
 * 
 * Listens for events (lead_created, lead_scored, lead_status_changed, etc.),
 * finds matching active workflows, evaluates conditions, and executes actions
 * with idempotency protection and execution logging.
 */

const workflowModel = require("../models/workflowModel");
const executionModel = require("../models/executionModel");
const leadModel = require("../models/leadModel");
const activityModel = require("../models/activityModel");
const notificationModel = require("../models/notificationModel");
const emailLogModel = require("../models/emailLogModel");
const emailTemplateModel = require("../models/emailTemplateModel");
const { sendEmail } = require("./emailService");
const pool = require("../config/db");
const scheduledActionModel = require("../models/scheduledActionModel");
const emailService = require("./emailService");

// Lazy-load geminiService to avoid circular dependency issues at startup
let _geminiService = null;
function getGeminiService() {
    if (!_geminiService) {
        _geminiService = require("./geminiService");
    }
    return _geminiService;
}

/**
 * Trigger an automation event. Finds all matching active workflows and executes them.
 * @param {string} eventType - e.g. "lead_created", "lead_scored", "lead_status_changed"
 * @param {object} lead - The lead object
 * @param {string} userId - The user who owns the lead
 * @param {object} eventData - Additional event data (e.g. { oldStatus, newStatus, score })
 */
async function triggerEvent(eventType, lead, userId, eventData = {}) {
    try {
        // Validate lead payload
        if (!lead || !lead.id || !lead.email) {
            console.log(`[AutomationEngine] Invalid lead payload for trigger event ${eventType}. Skipping.`);
            return { executed: 0, skipped: 0, message: 'Invalid lead payload' };
        }

        // Check duplicate lead by email + workspace/user
        if (eventType === "lead_created") {
            const { rows: duplicateRows } = await pool.query(
                `SELECT id FROM leads WHERE email = $1 AND user_id = $2 AND id != $3`,
                [lead.email, userId, lead.id]
            );
            if (duplicateRows.length > 0) {
                console.log(`[AutomationEngine] Lead ${lead.id} is a duplicate of an existing lead with email ${lead.email}. Skipping automation.`);
                return { executed: 0, skipped: 0, message: 'Duplicate lead' };
            }
        }

        // 1. Check Global Automation Engine toggle
        const { rows: settingsRows } = await pool.query(`SELECT value FROM platform_settings WHERE key = 'automation_engine_enabled'`);
        let globalEnabled = true; // default true
        if (settingsRows.length > 0) {
            const val = settingsRows[0].value;
            globalEnabled = val === 'true' || val === true;
        }

        if (!globalEnabled) {
            console.log(`[AutomationEngine] Global engine is disabled. Skipping event ${eventType} for lead ${lead?.id}`);
            return { executed: 0, skipped: 0, message: 'Global engine disabled' };
        }

        // 2. Check User-level automation preference
        const { rows: userRows } = await pool.query(`SELECT automation_enabled FROM users WHERE id = $1`, [userId]);
        if (userRows.length > 0 && !userRows[0].automation_enabled) {
            console.log(`[AutomationEngine] User ${userId} has disabled automations. Skipping.`);
            return { executed: 0, skipped: 0, message: 'User automation disabled' };
        }

        // Find active workflows matching this trigger
        const workflows = await workflowModel.getActiveByTrigger(eventType);

        if (workflows.length === 0) {
            return { executed: 0, skipped: 0 };
        }

        let executed = 0;
        let skipped = 0;

        for (const workflow of workflows) {
            // Only execute workflows owned by this user
            if (workflow.user_id !== userId) continue;

            try {
                const result = await executeWorkflow(workflow, lead, userId, eventType, eventData);
                if (result.skipped) {
                    skipped++;
                } else {
                    executed++;
                }
            } catch (err) {
                console.error(`[AutomationEngine] Workflow "${workflow.name}" failed for lead ${lead.id}:`, err.message);
            }
        }

        return { executed, skipped };
    } catch (err) {
        console.error("[AutomationEngine] triggerEvent error:", err.message);
        return { executed: 0, skipped: 0, error: err.message };
    }
}

/**
 * Execute a single workflow for a lead.
 */
async function executeWorkflow(workflow, lead, userId, eventType, eventData = {}) {
    const actions = Array.isArray(workflow.actions) ? workflow.actions : [];
    const conditions = Array.isArray(workflow.conditions) ? workflow.conditions : [];

    // Build idempotency key
    const idempotencyKey = `${lead.id}:${workflow.id}:${eventType}:${new Date().toISOString().slice(0, 13)}`;

    // Check idempotency — prevent duplicate execution within the same hour
    const existing = await executionModel.checkIdempotency(idempotencyKey);
    if (existing) {
        console.log(`[AutomationEngine] Skipping duplicate execution: ${idempotencyKey}`);
        return { skipped: true };
    }

    // Evaluate conditions
    if (conditions.length > 0 && !evaluateConditions(conditions, lead, eventData)) {
        // Conditions not met — log as skipped
        await executionModel.create({
            workflowId: workflow.id,
            leadId: lead.id,
            userId,
            triggerEvent: eventType,
            totalActions: actions.length,
            idempotencyKey,
        }).then(exec => executionModel.updateStatus(exec.id, "skipped", 0, "Conditions not met"))
          .catch(err => console.error("[AutomationEngine] Failed to log skipped execution:", err.message));
        return { skipped: true };
    }

    // Create execution record
    const execution = await executionModel.create({
        workflowId: workflow.id,
        leadId: lead.id,
        userId,
        triggerEvent: eventType,
        totalActions: actions.length,
        idempotencyKey,
    });

    let actionsCompleted = 0;
    let error = null;

    // Execute each action in sequence
    for (const action of actions) {
        try {
            // Check for delay actions
            if (action.type === "delay" || action.type === "wait") {
                await scheduleDelay(action, workflow, lead, userId, execution.id, actions, actionsCompleted);
                // Stop execution here; remaining actions will be picked up by the scheduler
                await executionModel.updateStatus(execution.id, "running", actionsCompleted, null);
                return { skipped: false, delayed: true };
            }

            await executeAction(action, lead, userId, execution.id);
            actionsCompleted++;
            await executionModel.incrementActions(execution.id);
        } catch (err) {
            error = `Action "${action.name || action.type}" failed: ${err.message}`;
            console.error(`[AutomationEngine] ${error}`);
            break;
        }
    }

    // Mark execution complete
    const finalStatus = error ? "failed" : "success";
    await executionModel.updateStatus(execution.id, finalStatus, actionsCompleted, error);

    // Log activity
    await activityModel.create({
        leadId: lead.id,
        userId,
        type: "automation",
        description: `Workflow "${workflow.name}" ${finalStatus}${error ? ` - ${error}` : ""}`,
    }).catch(err => console.error("[AutomationEngine] Activity log error:", err.message));

    return { skipped: false, status: finalStatus };
}

/**
 * Evaluate conditions against a lead.
 */
function evaluateConditions(conditions, lead, eventData) {
    for (const condition of conditions) {
        switch (condition.type) {
            case "score_threshold":
            case "score_gte": {
                const score = parseInt(lead.ai_score) || 0;
                if (score < (parseInt(condition.value) || 0)) return false;
                break;
            }
            case "score_lte": {
                const score = parseInt(lead.ai_score) || 0;
                if (score > (parseInt(condition.value) || 100)) return false;
                break;
            }
            case "status_equals": {
                if (lead.status !== condition.value) return false;
                break;
            }
            case "status_changed_to": {
                if (eventData.newStatus !== condition.value) return false;
                break;
            }
            case "category_equals": {
                const category = (lead.ai_category || "").toLowerCase();
                if (category !== (condition.value || "").toLowerCase()) return false;
                break;
            }
            case "has_email": {
                if (!lead.email) return false;
                break;
            }
            default:
                // Unknown condition — skip it (permissive)
                break;
        }
    }
    return true;
}

/**
 * Execute a single action.
 */
async function executeAction(action, lead, userId, executionId) {
    const actionType = action.type || action.actionType || action.action;

    switch (actionType) {
        case "run_ai_scoring":
        case "ai_score": {
            try {
                const geminiService = getGeminiService();
                const result = await geminiService.scoreLead(lead);
                await leadModel.update(lead.id, {
                    ai_score: result.score,
                    ai_category: result.category,
                    ai_rating: result.rating,
                    ai_prediction: result.prediction,
                    ai_reason: result.reason,
                    ai_insights: result.insights,
                    ai_strengths: JSON.stringify(result.strengths),
                    ai_weaknesses: JSON.stringify(result.weaknesses),
                    ai_recommended_action: result.recommendation,
                    ai_recommendation: result.recommendation,
                });
                // Update the lead object in-place for subsequent actions
                lead.ai_score = result.score;
                lead.ai_category = result.category;
                await activityModel.create({
                    leadId: lead.id,
                    userId,
                    type: "scored",
                    description: `AI score updated to ${result.score}/100 (${result.category}) via automation`,
                });
            } catch (err) {
                // AI scoring failure should not block other actions — log and continue
                console.error("[AutomationEngine] AI scoring failed:", err.message);
                await activityModel.create({
                    leadId: lead.id,
                    userId,
                    type: "automation_error",
                    description: `AI scoring failed: ${err.message}`,
                });
                // Don't rethrow — this is a non-critical action
            }
            break;
        }

        case "update_lead_status":
        case "update_status": {
            const newStatus = action.value || action.config?.status || "contacted";
            await leadModel.update(lead.id, { status: newStatus });
            await activityModel.create({
                leadId: lead.id,
                userId,
                type: "status_changed",
                description: `Status changed to "${newStatus}" via automation`,
            });
            lead.status = newStatus;
            break;
        }

        case "assign_segment": {
            const segmentModel = require("../models/segmentModel");
            const segmentName = action.value || action.config?.segment;
            if (segmentName) {
                let segment = await segmentModel.getByName(userId, segmentName);
                if (segment) {
                    await leadModel.update(lead.id, { segmentId: segment.id });
                    await activityModel.create({
                        leadId: lead.id,
                        userId,
                        type: "segment_assigned",
                        description: `Assigned to segment "${segmentName}" via automation`,
                    });
                }
            }
            break;
        }

        case "send_email": {
            let recipientInput = action.config?.recipient === "[ Lead Email ]" ? lead.email : (action.config?.recipient || lead.email);
            if (recipientInput === "{{email}}") recipientInput = lead.email;
            
            if (!recipientInput) {
                throw new Error("Recipient email address is missing");
            }

            const templateName = action.value || action.config?.template || "Welcome Email";
            const template = await emailTemplateModel.getByName(templateName);

            let subject, body;
            if (template) {
                const nameParts = (lead.name || "").split(" ");
                const firstName = nameParts[0] || "";
                const lastName = nameParts.slice(1).join(" ") || "";

                const vars = {
                    "firstName": firstName,
                    "lastName": lastName,
                    "email": lead.email || "",
                    "company": lead.company || "",
                    "phone": lead.phone || "",
                    "lead.name": lead.name || "",
                    "lead.email": lead.email || "",
                    "lead.company": lead.company || "N/A",
                    "lead.score": String(lead.ai_score || "N/A"),
                    "lead.status": lead.status || "",
                    "lead.source": lead.source || "",
                    "lead.category": lead.ai_category || "N/A",
                    "company.name": "LeadFlow AI",
                };
                
                body = emailTemplateModel.renderTemplate(template, vars);
                
                subject = template.subject;
                Object.keys(vars).forEach(key => {
                    const regex = new RegExp(`{{${key}}}`, "g");
                    subject = subject.replace(regex, vars[key] || "");
                });
            } else {
                // Fallback: use basic email
                subject = action.config?.subject || `Hello ${lead.name}`;
                body = emailService.buildWelcomeEmail(lead.name);
            }

            // Support comma-separated emails
            const recipients = recipientInput.split(",").map(r => r.trim()).filter(Boolean);

            for (const r of recipients) {
                // Log the email attempt
                const emailLog = await emailLogModel.create({
                    leadId: lead.id,
                    userId,
                    recipient: r,
                    subject,
                    templateId: template?.id || null,
                    workflowExecutionId: executionId,
                    status: "pending",
                    provider: "brevo"
                });

                try {
                    const result = await emailService.sendEmail({
                        to: r,
                        cc: action.config?.cc,
                        bcc: action.config?.bcc,
                        subject,
                        html: body,
                        fromEmail: action.config?.fromEmail,
                        fromName: action.config?.fromName
                    });
                    await emailLogModel.updateStatus(emailLog.id, "sent", result?.id || null, null);
                    await activityModel.create({
                        leadId: lead.id,
                        userId,
                        type: "email_sent",
                        description: `Email sent: "${subject}" to ${r} via automation`,
                    });
                } catch (err) {
                    await emailLogModel.updateStatus(emailLog.id, "failed", null, err.message);
                    await activityModel.create({
                        leadId: lead.id,
                        userId,
                        type: "email_failed",
                        description: `Email failed: "${subject}" to ${r} - ${err.message}`,
                    });
                    // Don't throw here if we are looping multiple emails, maybe just record the failure
                }
            }
            break;
        }

        case "notify_team": {
            const message = action.value || action.config?.message || `Action required for lead: ${lead.name} (${lead.email})`;
            await notificationModel.create({
                userId,
                type: "automation_alert",
                message,
            });
            break;
        }

        case "create_task":
        case "schedule_task": {
            const taskDescription = action.value || action.config?.description || `Follow up with ${lead.name}`;
            await activityModel.create({
                leadId: lead.id,
                userId,
                type: "task_created",
                description: taskDescription,
            });
            await notificationModel.create({
                userId,
                type: "task",
                message: `Task created: ${taskDescription}`,
            });
            break;
        }

        case "add_activity": {
            await activityModel.create({
                leadId: lead.id,
                userId,
                type: action.config?.activityType || "automation",
                description: action.value || action.config?.description || `Automation action recorded`,
            });
            break;
        }

        default:
            console.warn(`[AutomationEngine] Unknown action type: ${actionType}`);
            break;
    }
}

/**
 * Schedule a delayed action for future execution.
 */
async function scheduleDelay(delayAction, workflow, lead, userId, executionId, remainingActions, completedIndex) {
    const delayMs = calculateDelayMs(delayAction);
    const scheduledAt = new Date(Date.now() + delayMs);

    // Store remaining actions after the delay as a scheduled action
    const futureActions = remainingActions.slice(completedIndex + 1);

    await scheduledActionModel.create({
        workflowExecutionId: executionId,
        workflowId: workflow.id,
        leadId: lead.id,
        userId,
        actionConfig: { remainingActions: futureActions, delayAction },
        scheduledAt,
    });

    await activityModel.create({
        leadId: lead.id,
        userId,
        type: "automation",
        description: `Workflow "${workflow.name}" delayed - next action scheduled at ${scheduledAt.toISOString()}`,
    });
}

/**
 * Calculate delay in milliseconds from a delay action config.
 */
function calculateDelayMs(action) {
    const config = action.config || action;
    if (config.minutes) return config.minutes * 60 * 1000;
    if (config.hours) return config.hours * 60 * 60 * 1000;
    if (config.days) return config.days * 24 * 60 * 60 * 1000;
    // Default 1 hour
    return 60 * 60 * 1000;
}

module.exports = {
    triggerEvent,
    executeWorkflow,
    executeAction,
    evaluateConditions,
};
