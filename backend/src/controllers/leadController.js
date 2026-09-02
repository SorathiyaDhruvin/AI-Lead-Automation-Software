const leadModel = require("../models/leadModel");
const activityModel = require("../models/activityModel");
const noteModel = require("../models/noteModel");
const notificationModel = require("../models/notificationModel");
const geminiService = require("../services/geminiService");
const emailService = require("../services/emailService");
const automationEngine = require("../services/automationEngine");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * GET /api/leads
 */
const getLeads = asyncHandler(async (req, res) => {
    const filters = {
        search: req.query.search,
        status: req.query.status,
        minScore: req.query.minScore ? parseInt(req.query.minScore) : undefined,
        maxScore: req.query.maxScore ? parseInt(req.query.maxScore) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    };

    const leads = await leadModel.getByUser(req.userId, filters);

    res.json({
        success: true,
        data: leads,
    });
});

/**
 * GET /api/leads/:id
 */
const getLeadById = asyncHandler(async (req, res) => {
    const lead = await leadModel.getById(req.params.id);

    if (!lead) {
        return res.status(404).json({
            success: false,
            message: "Lead not found",
        });
    }

    if (lead.user_id !== req.userId) {
        return res.status(403).json({
            success: false,
            message: "Access denied",
        });
    }

    res.json({
        success: true,
        data: lead,
    });
});

/**
 * POST /api/leads
 */
const createLead = asyncHandler(async (req, res) => {
    const { name, email, company, phone, source, status, notes } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: "Name and email are required",
        });
    }

    const lead = await leadModel.create({
        userId: req.userId,
        name,
        email,
        company,
        phone,
        source,
        status,
        notes,
    });

    // Auto-log creation activity
    activityModel.create({
        leadId: lead.id,
        userId: req.userId,
        type: "lead_created",
        description: `Lead created from ${lead.source || "manual"} source`,
    }).catch((err) => console.error("Activity log error:", err));

    // Create in-app notification
    notificationModel.create({
        userId: req.userId,
        type: "lead_created",
        message: `New lead added: ${lead.name} (${lead.email})`
    }).catch((err) => console.error("Notification creation error:", err));

    // Async trigger welcome email if lead has email
    if (lead.email && emailService.isConfigured()) {
        emailService.sendEmail({
            to: lead.email,
            subject: "Welcome to LeadFlow!",
            html: emailService.buildWelcomeEmail(lead.name)
        })
            .then(result => console.log(`Welcome email accepted by Brevo for ${lead.email}: ${result?.id}`))
            .catch(err => console.error(`Failed to send welcome email to ${lead.email}:`, err.message));
    }

    // Trigger automation workflows for lead_created event
    automationEngine.triggerEvent("lead_created", lead, req.userId)
        .catch((err) => console.error("Automation trigger error:", err.message));

    res.status(201).json({
        success: true,
        message: "Lead created successfully",
        data: lead,
    });
});

/**
 * PUT /api/leads/:id
 */
const updateLead = asyncHandler(async (req, res) => {
    const existing = await leadModel.getById(req.params.id);

    if (!existing) {
        return res.status(404).json({
            success: false,
            message: "Lead not found",
        });
    }

    if (existing.user_id !== req.userId) {
        return res.status(403).json({
            success: false,
            message: "Access denied",
        });
    }

    const lead = await leadModel.update(req.params.id, req.body);

    // Log status change activity + notification
    if (req.body.status && req.body.status !== existing.status) {
        activityModel.create({
            leadId: lead.id,
            userId: req.userId,
            type: "status_changed",
            description: `Status changed from "${existing.status}" to "${lead.status}"`,
        }).catch((err) => console.error("Activity log error:", err));

        notificationModel.create({
            userId: req.userId,
            type: "status_changed",
            message: `${lead.name} moved to "${lead.status}"`
        }).catch((err) => console.error("Notification creation error:", err));

        // Trigger automation for status change
        automationEngine.triggerEvent("lead_status_changed", lead, req.userId, {
            oldStatus: existing.status,
            newStatus: lead.status,
        }).catch((err) => console.error("Automation trigger error:", err.message));
    }

    res.json({
        success: true,
        message: "Lead updated successfully",
        data: lead,
    });
});

/**
 * DELETE /api/leads/:id
 */
const deleteLead = asyncHandler(async (req, res) => {
    const existing = await leadModel.getById(req.params.id);

    if (!existing) {
        return res.status(404).json({
            success: false,
            message: "Lead not found",
        });
    }

    if (existing.user_id !== req.userId) {
        return res.status(403).json({
            success: false,
            message: "Access denied",
        });
    }

    await leadModel.delete(req.params.id);

    res.json({
        success: true,
        message: "Lead deleted successfully",
    });
});

/**
 * POST /api/leads/:id/score
 */
const scoreLead = asyncHandler(async (req, res) => {
    const existing = await leadModel.getById(req.params.id);

    if (!existing) {
        return res.status(404).json({ success: false, message: "Lead not found" });
    }

    if (existing.user_id !== req.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    try {
        const result = await geminiService.scoreLead(existing);

        // Map all rating, category, and insights fields to keep compatibility with UI schemas
        const updatedLead = await leadModel.update(existing.id, {
            ai_score: result.score,
            ai_category: result.category, // Hot/Warm/Cold
            ai_rating: result.rating, // high/medium/low
            ai_prediction: result.prediction,
            ai_reason: result.reason,
            ai_insights: result.insights,
            ai_strengths: JSON.stringify(result.strengths),
            ai_weaknesses: JSON.stringify(result.weaknesses),
            ai_recommended_action: result.recommendation,
            ai_recommendation: result.recommendation
        });

        // Log scoring activity
        await activityModel.create({
            leadId: existing.id,
            userId: req.userId,
            type: "scored",
            description: `AI score updated to ${result.score}/100 (${result.category})`,
        });

        res.json({
            success: true,
            data: updatedLead,
        });

        // Trigger automation for lead_scored event (fire-and-forget, after response)
        automationEngine.triggerEvent("lead_scored", updatedLead, req.userId, {
            score: result.score,
            category: result.category,
        }).catch((err) => console.error("Automation trigger error:", err.message));

    } catch (error) {
        console.error("AI Lead Scoring Controller Error:", error.message);
        res.status(500).json({
            success: false,
            message: "AI scoring failed: " + error.message
        });
    }
});

/**
 * GET /api/leads/:id/notes
 */
const getNotes = asyncHandler(async (req, res) => {
    const lead = await leadModel.getById(req.params.id);
    if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found" });
    }
    if (lead.user_id !== req.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    const notes = await noteModel.getByLead(req.params.id);
    res.json({ success: true, data: notes });
});

/**
 * POST /api/leads/:id/notes
 */
const createNote = asyncHandler(async (req, res) => {
    const lead = await leadModel.getById(req.params.id);
    if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found" });
    }
    if (lead.user_id !== req.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
        return res.status(400).json({ success: false, message: "Note text is required" });
    }

    const note = await noteModel.create({
        leadId: req.params.id,
        userId: req.userId,
        text: text.trim()
    });

    // Auto-log note activity
    await activityModel.create({
        leadId: req.params.id,
        userId: req.userId,
        type: "note_added",
        description: text.length > 80 ? text.slice(0, 80) + "…" : text,
    });

    res.status(201).json({ success: true, data: note });
});

/**
 * GET /api/leads/:id/activity
 */
const getLeadActivities = asyncHandler(async (req, res) => {
    const lead = await leadModel.getById(req.params.id);
    if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found" });
    }
    if (lead.user_id !== req.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    const activities = await activityModel.getByLead(req.params.id);
    res.json({ success: true, data: activities });
});

/**
 * POST /api/leads/:id/send-email
 */
const sendLeadEmail = asyncHandler(async (req, res) => {
    const lead = await leadModel.getById(req.params.id);
    if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found" });
    }
    if (lead.user_id !== req.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { subject, message } = req.body;
    if (!subject || !message) {
        return res.status(400).json({ success: false, message: "Subject and message are required" });
    }

    try {
        await emailService.sendEmail({
            to: lead.email,
            subject,
            html: emailService.buildFollowUpEmail(lead.name, message)
        });

        await activityModel.create({
            leadId: lead.id,
            userId: req.userId,
            type: "email",
            description: `Follow-up email sent: "${subject}"`,
        });

        res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Email failed: " + error.message
        });
    }
});

/**
 * Helper to prevent CSV Injection vulnerabilities by neutralizing formula triggers (=, +, -, @, tab, cr)
 */
function sanitizeCsvValue(val) {
    if (val === null || val === undefined) return "";
    let str = String(val).trim();
    if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
        str = "'" + str; // Prefix apostrophe disables formula execution in Excel/Sheets
    }
    return `"${str.replace(/"/g, '""')}"`;
}

/**
 * GET /api/leads/export
 */
const exportCsv = asyncHandler(async (req, res) => {
    const filters = {
        search: req.query.search,
        status: req.query.status,
        minScore: req.query.minScore ? parseInt(req.query.minScore) : undefined,
        maxScore: req.query.maxScore ? parseInt(req.query.maxScore) : undefined,
    };

    const userLeads = await leadModel.getByUser(req.userId, filters);

    const header = "name,email,company,phone,source,status,ai_score,ai_category,created_at";
    const rows = userLeads.map((l) => [
        sanitizeCsvValue(l.name),
        sanitizeCsvValue(l.email),
        sanitizeCsvValue(l.company),
        sanitizeCsvValue(l.phone),
        sanitizeCsvValue(l.source),
        sanitizeCsvValue(l.status),
        l.ai_score ?? "",
        sanitizeCsvValue(l.ai_category),
        sanitizeCsvValue(l.created_at ? new Date(l.created_at).toISOString().slice(0, 10) : ""),
    ].join(","));

    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="leads-export-${Date.now()}.csv"`);
    res.send(csv);
});

/**
 * POST /api/leads/import
 */
const importCsv = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const text = req.file.buffer.toString("utf-8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
        return res.status(400).json({ success: false, message: "CSV must have a header row and at least one data row" });
    }

    const parseRow = (line) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (ch === "," && !inQuotes) {
                result.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        result.push(current.trim());
        return result;
    };

    const cleanField = (str) => {
        if (!str) return "";
        let cleaned = str.trim();
        if (cleaned.startsWith("'") && (cleaned.startsWith("'=") || cleaned.startsWith("'+") || cleaned.startsWith("'-") || cleaned.startsWith("'@"))) {
            cleaned = cleaned.substring(1);
        }
        return cleaned;
    };

    const headerRow = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const idx = (name) => headerRow.indexOf(name);

    let created = 0;
    let skippedDuplicates = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseRow(lines[i]);
        const name = cleanField(row[idx("name")]);
        const email = cleanField(row[idx("email")]).toLowerCase();
        const company = cleanField(row[idx("company")]) || undefined;
        const phone = cleanField(row[idx("phone")]) || undefined;
        const source = cleanField(row[idx("source")]) || "csv_import";

        if (!name || !email) {
            errors.push(`Row ${i + 1}: missing required name or email`);
            continue;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push(`Row ${i + 1}: invalid email "${email}"`);
            continue;
        }

        // Duplicate email prevention check
        const existingLead = await leadModel.getByEmailAndUser(req.userId, email);
        if (existingLead) {
            skippedDuplicates++;
            continue;
        }

        try {
            const lead = await leadModel.create({
                userId: req.userId,
                name,
                email,
                company,
                phone,
                source,
                status: "new"
            });
            await activityModel.create({
                leadId: lead.id,
                userId: req.userId,
                type: "lead_created",
                description: `Lead imported from CSV`,
            });
            
            // Trigger autonomous workflow for lead creation
            automationEngine.triggerEvent("lead_created", lead, req.userId)
                .catch((err) => console.error("[CSV Import] Automation trigger error:", err.message));

            created++;
        } catch (err) {
            errors.push(`Row ${i + 1}: failed to create lead for "${email}". Error: ${err.message}`);
        }
    }

    if (created > 0) {
        notificationModel.create({
            userId: req.userId,
            type: "lead_created",
            message: `CSV import: ${created} lead${created !== 1 ? "s" : ""} imported successfully${skippedDuplicates > 0 ? ` (${skippedDuplicates} duplicates skipped)` : ""}`
        }).catch(() => { });
    }

    res.json({
        success: true,
        data: {
            created,
            skippedDuplicates,
            failed: errors.length,
            errors: errors.slice(0, 20)
        }
    });
});

/**
 * POST /api/leads/public-capture
 * Public endpoint for website lead forms.
 */
const createPublicLead = asyncHandler(async (req, res) => {
    const { userId, name, email, company, phone, jobTitle, message } = req.body;

    if (!userId || typeof userId !== "string") {
        return res.status(400).json({ success: false, message: "Valid userId is required" });
    }

    if (!name || !email || typeof name !== "string" || typeof email !== "string") {
        return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Check if user exists in database
    const userModel = require("../models/userModel");
    const targetUser = await userModel.getById(userId);
    if (!targetUser) {
        return res.status(404).json({ success: false, message: "Target account not found" });
    }

    // Duplicate check
    const existing = await leadModel.getByEmailAndUser(userId, normalizedEmail);
    if (existing) {
        return res.json({
            success: true,
            message: "Thank you! Your submission has been received.",
            data: { leadId: existing.id }
        });
    }

    const leadNotes = [
        jobTitle ? `Job Title: ${jobTitle}` : null,
        message ? `Message: ${message}` : null
    ].filter(Boolean).join("\n");

    const lead = await leadModel.create({
        userId,
        name: name.trim(),
        email: normalizedEmail,
        company: company ? company.trim() : null,
        phone: phone ? phone.trim() : null,
        source: "website_form",
        status: "new",
        notes: leadNotes || "Submitted via website form"
    });

    // Auto-log activity & notification
    await activityModel.create({
        leadId: lead.id,
        userId,
        type: "lead_created",
        description: `New lead submitted via Website Form (${lead.name})`
    }).catch(() => {});

    await notificationModel.create({
        userId,
        type: "lead_created",
        message: `New Website Lead: ${lead.name} (${lead.email})`
    }).catch(() => {});

    // Trigger automation workflows for lead_created event
    automationEngine.triggerEvent("lead_created", lead, userId)
        .catch((err) => console.error("Public Form Automation trigger error:", err.message));

    res.status(201).json({
        success: true,
        message: "Thank you! Your information has been submitted successfully.",
        data: { leadId: lead.id }
    });
});

module.exports = {
    getLeads,
    getLeadById,
    createLead,
    updateLead,
    deleteLead,
    scoreLead,
    getNotes,
    createNote,
    getLeadActivities,
    sendLeadEmail,
    exportCsv,
    importCsv,
    createPublicLead
};

