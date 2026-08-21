const leadModel = require("../models/leadModel");
const activityModel = require("../models/activityModel");
const noteModel = require("../models/noteModel");
const notificationModel = require("../models/notificationModel");
const geminiService = require("../services/geminiService");
const emailService = require("../services/emailService");
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

    // Send welcome email (fire-and-forget)
    emailService.sendEmail(lead.email, "Welcome to LeadFlow!", emailService.buildWelcomeEmail(lead.name))
        .catch((err) => console.error("Welcome email send error:", err.message));

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
        await emailService.sendEmail(lead.email, subject, emailService.buildFollowUpEmail(lead.name, message));
        
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
        `"${(l.name || "").replace(/"/g, '""')}"`,
        `"${(l.email || "").replace(/"/g, '""')}"`,
        `"${(l.company || "").replace(/"/g, '""')}"`,
        `"${(l.phone || "").replace(/"/g, '""')}"`,
        `"${(l.source || "").replace(/"/g, '""')}"`,
        `"${(l.status || "").replace(/"/g, '""')}"`,
        l.ai_score ?? "",
        `"${(l.ai_category || "").replace(/"/g, '""')}"`,
        `"${l.created_at ? new Date(l.created_at).toISOString().slice(0, 10) : ""}"`,
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

    const headerRow = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const idx = (name) => headerRow.indexOf(name);

    let created = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseRow(lines[i]);
        const name = row[idx("name")] || "";
        const email = row[idx("email")] || "";
        const company = row[idx("company")] || undefined;
        const phone = row[idx("phone")] || undefined;
        const source = row[idx("source")] || "csv_import";

        if (!name || !email) {
            errors.push(`Row ${i + 1}: missing required name or email`);
            continue;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push(`Row ${i + 1}: invalid email "${email}"`);
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
            created++;
        } catch (err) {
            errors.push(`Row ${i + 1}: failed to create lead for "${email}". Error: ${err.message}`);
        }
    }

    if (created > 0) {
        notificationModel.create({
            userId: req.userId,
            type: "lead_created",
            message: `CSV import: ${created} lead${created !== 1 ? "s" : ""} imported successfully`
        }).catch(() => {});
    }

    res.json({
        success: true,
        data: {
            created,
            failed: errors.length,
            errors: errors.slice(0, 20)
        }
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
    importCsv
};
