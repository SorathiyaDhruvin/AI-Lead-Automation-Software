const leadModel = require("../models/leadModel");
const activityModel = require("../models/activityModel");
const { asyncHandler } = require("../middleware/errorHandler");
const { OpenAI } = require("openai");

const ai = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: "https://api.x.ai/v1",
});

/**
 * GET /api/leads
 * Get all leads for the authenticated user. Supports filters via query params.
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
 * Get a single lead by ID with ownership check.
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
 * Create a new lead and log the creation activity.
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

    // Auto-log creation activity (fire-and-forget)
    activityModel.create({
        leadId: lead.id,
        userId: req.userId,
        type: "lead_created",
        description: `Lead created from ${lead.source} source`,
    }).catch((err) => console.error("Activity log error:", err));

    res.status(201).json({
        success: true,
        message: "Lead created successfully",
        data: lead,
    });
});

/**
 * PUT /api/leads/:id
 * Update a lead with ownership check. Logs status changes.
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

    // Log status change if applicable
    if (req.body.status && req.body.status !== existing.status) {
        activityModel.create({
            leadId: lead.id,
            userId: req.userId,
            type: "status_changed",
            description: `Status changed from "${existing.status}" to "${lead.status}"`,
        }).catch((err) => console.error("Activity log error:", err));
    }

    res.json({
        success: true,
        message: "Lead updated successfully",
        data: lead,
    });
});

/**
 * DELETE /api/leads/:id
 * Delete a lead with ownership check.
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
 * Generate an AI score for a lead using OpenAI.
 */
const scoreLead = asyncHandler(async (req, res) => {
    const existing = await leadModel.getById(req.params.id);

    if (!existing) {
        return res.status(404).json({ success: false, message: "Lead not found" });
    }

    if (existing.user_id !== req.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (!ai.apiKey) {
        return res.status(500).json({ success: false, message: "xAI API key is not configured on the server." });
    }

    try {
        const prompt = `
        Evaluate this lead and provide a score from 0 to 100 based on their potential to convert.
        Lead Data:
        Name: ${existing.name}
        Email: ${existing.email}
        Company: ${existing.company || "Unknown"}
        Phone: ${existing.phone || "Unknown"}
        Source: ${existing.source}
        Status: ${existing.status}
        Notes: ${existing.notes || "None"}

        Respond strictly with JSON in the following format:
        {
          "score": <number between 0-100>,
          "reason": "<short explanation>"
        }
        `;

        const response = await ai.chat.completions.create({
            model: "grok-beta",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const aiResponse = JSON.parse(response.choices[0].message.content);
        const score = typeof aiResponse.score === "number" ? aiResponse.score : parseInt(aiResponse.score);
        const reason = aiResponse.reason || "AI evaluation completed.";

        if (isNaN(score) || score < 0 || score > 100) {
            throw new Error("AI returned an invalid score.");
        }

        const updatedLead = await leadModel.update(existing.id, {
            ai_score: score,
            ai_insights: reason,
        });

        activityModel.create({
            leadId: existing.id,
            userId: req.userId,
            type: "scored",
            description: `AI scored lead at ${score}/100. Reason: ${reason}`,
        }).catch(err => console.error("Activity log error:", err));

        res.json({
            success: true,
            data: updatedLead,
        });

    } catch (error) {
        console.error("AI Scoring Error:", error);
        res.status(500).json({ success: false, message: "Failed to score lead. " + error.message });
    }
});

module.exports = { getLeads, getLeadById, createLead, updateLead, deleteLead, scoreLead };
