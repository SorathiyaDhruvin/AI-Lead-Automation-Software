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
        Evaluate this lead and provide a score and detailed insights based on their potential to convert.
        Lead Data:
        Name: ${existing.name}
        Email: ${existing.email}
        Company: ${existing.company || "Unknown"}
        Phone: ${existing.phone || "Unknown"}
        Source: ${existing.source}
        Status: ${existing.status}
        Notes: ${existing.notes || "None"}

        Respond strictly with JSON in the following exact format:
        {
          "score": <integer from 0 to 100>,
          "rating": "<one of: low, medium, high>",
          "reason": "<short explanation of the score>",
          "strengths": ["<strength 1>", "<strength 2>"],
          "weaknesses": ["<weakness 1>"],
          "recommendation": "<specific recommended action>"
        }
        `;

        const modelConfig = process.env.AI_MODEL || "grok-4.6";

        const response = await ai.chat.completions.create({
            model: modelConfig,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        if (!response.choices || !response.choices[0] || !response.choices[0].message) {
            throw new Error("AI provider returned an empty or invalid response.");
        }

        const aiResponse = JSON.parse(response.choices[0].message.content);
        const score = parseInt(aiResponse.score);
        
        if (isNaN(score) || score < 0 || score > 100) {
            throw new Error("AI returned an invalid score: " + aiResponse.score);
        }

        const validRatings = ["low", "medium", "high"];
        const rating = validRatings.includes(aiResponse.rating) ? aiResponse.rating : "medium";

        const updatedLead = await leadModel.update(existing.id, {
            ai_score: score,
            ai_rating: rating,
            ai_reason: aiResponse.reason || "AI evaluation completed.",
            ai_strengths: JSON.stringify(aiResponse.strengths || []),
            ai_weaknesses: JSON.stringify(aiResponse.weaknesses || []),
            ai_recommendation: aiResponse.recommendation || "Follow up with the lead."
        });

        activityModel.create({
            leadId: existing.id,
            userId: req.userId,
            type: "scored",
            description: `AI scored lead at ${score}/100. Rating: ${rating}.`,
        }).catch(err => console.error("Activity log error:", err));

        res.json({
            success: true,
            data: updatedLead,
        });

    } catch (error) {
        console.error("AI Scoring Error:", error);
        
        let statusCode = 500;
        let errorMessage = "Failed to score lead. " + error.message;

        if (error.status === 401) {
            statusCode = 401;
            errorMessage = "AI API key is invalid or missing.";
        } else if (error.status === 429) {
            statusCode = 429;
            errorMessage = "AI rate limit reached.";
        } else if (error.status === 400) {
            statusCode = 400;
            errorMessage = "AI request is invalid. " + error.message;
        } else if (error.message.includes("JSON")) {
            statusCode = 500;
            errorMessage = "AI returned malformed JSON data.";
        }

        res.status(statusCode).json({ success: false, message: errorMessage });
    }
});

module.exports = { getLeads, getLeadById, createLead, updateLead, deleteLead, scoreLead };
