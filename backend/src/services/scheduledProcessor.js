/**
 * Scheduled Action Processor — Runs periodically to execute delayed automation actions.
 * 
 * This processor queries the scheduled_actions table for pending actions whose
 * scheduled_at time has passed, and executes them. It handles retries (max 3 attempts)
 * and prevents duplicate execution.
 */

const scheduledActionModel = require("../models/scheduledActionModel");
const executionModel = require("../models/executionModel");
const leadModel = require("../models/leadModel");
const activityModel = require("../models/activityModel");
const automationEngine = require("./automationEngine");

let isRunning = false;

/**
 * Process all pending scheduled actions.
 * Called on an interval from server.js.
 */
async function processScheduledActions() {
    // Prevent concurrent runs
    if (isRunning) return;
    isRunning = true;

    try {
        const pendingActions = await scheduledActionModel.getPending();

        if (pendingActions.length === 0) {
            isRunning = false;
            return;
        }

        console.log(`[ScheduledProcessor] Processing ${pendingActions.length} scheduled actions...`);

        for (const scheduledAction of pendingActions) {
            try {
                // Mark as running (also increments attempt count)
                const locked = await scheduledActionModel.markRunning(scheduledAction.id);
                if (!locked) {
                    // Another process got it
                    continue;
                }

                // Get the lead
                const lead = await leadModel.getById(scheduledAction.lead_id);
                if (!lead) {
                    await scheduledActionModel.markFailed(scheduledAction.id, "Lead not found");
                    continue;
                }

                // Execute remaining actions
                const config = scheduledAction.action_config;
                const remainingActions = config.remainingActions || [];

                let actionsCompleted = 0;
                let error = null;

                for (const action of remainingActions) {
                    try {
                        // Handle nested delays
                        if (action.type === "delay" || action.type === "wait") {
                            // Re-schedule remaining actions
                            await scheduledActionModel.create({
                                workflowExecutionId: scheduledAction.workflow_execution_id,
                                workflowId: scheduledAction.workflow_id,
                                leadId: scheduledAction.lead_id,
                                userId: scheduledAction.user_id,
                                actionConfig: {
                                    remainingActions: remainingActions.slice(actionsCompleted + 1),
                                    delayAction: action,
                                },
                                scheduledAt: new Date(Date.now() + calculateDelayMs(action)),
                            });
                            break;
                        }

                        await automationEngine.executeAction(
                            action,
                            lead,
                            scheduledAction.user_id,
                            scheduledAction.workflow_execution_id
                        );
                        actionsCompleted++;

                        // Update execution record
                        if (scheduledAction.workflow_execution_id) {
                            await executionModel.incrementActions(scheduledAction.workflow_execution_id);
                        }
                    } catch (actionErr) {
                        error = `Action "${action.name || action.type}" failed: ${actionErr.message}`;
                        console.error(`[ScheduledProcessor] ${error}`);
                        break;
                    }
                }

                if (error) {
                    await scheduledActionModel.markFailed(scheduledAction.id, error);
                    if (scheduledAction.workflow_execution_id) {
                        await executionModel.updateStatus(
                            scheduledAction.workflow_execution_id,
                            "failed",
                            actionsCompleted,
                            error
                        );
                    }
                } else {
                    await scheduledActionModel.markCompleted(scheduledAction.id);
                    if (scheduledAction.workflow_execution_id) {
                        // Check if all actions are done
                        const exec = await executionModel.getById(scheduledAction.workflow_execution_id);
                        if (exec && exec.actions_completed >= exec.total_actions) {
                            await executionModel.updateStatus(exec.id, "success", exec.actions_completed, null);
                        }
                    }
                }

                // Log activity
                await activityModel.create({
                    leadId: scheduledAction.lead_id,
                    userId: scheduledAction.user_id,
                    type: "automation",
                    description: `Scheduled action ${error ? "failed" : "completed"} for workflow "${scheduledAction.workflow_name || "Unknown"}"`,
                }).catch(() => {});

            } catch (err) {
                console.error(`[ScheduledProcessor] Error processing action ${scheduledAction.id}:`, err.message);
                await scheduledActionModel.markFailed(scheduledAction.id, err.message).catch(() => {});
            }
        }
    } catch (err) {
        console.error("[ScheduledProcessor] Process error:", err.message);
    } finally {
        isRunning = false;
    }
}

function calculateDelayMs(action) {
    const config = action.config || action;
    if (config.minutes) return config.minutes * 60 * 1000;
    if (config.hours) return config.hours * 60 * 60 * 1000;
    if (config.days) return config.days * 24 * 60 * 60 * 1000;
    return 60 * 60 * 1000;
}

/**
 * Start the scheduled processor on an interval.
 * @param {number} intervalMs - How often to check (default: 60 seconds)
 */
function startProcessor(intervalMs = 60000) {
    console.log(`⏰ Scheduled action processor started (interval: ${intervalMs / 1000}s)`);
    setInterval(processScheduledActions, intervalMs);
    // Also run immediately on start
    processScheduledActions();
}

module.exports = {
    processScheduledActions,
    startProcessor,
};
