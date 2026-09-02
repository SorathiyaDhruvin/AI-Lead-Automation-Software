const aiSuggestionModel = require("../models/aiSuggestionModel");
const activityModel = require("../models/activityModel");
const geminiService = require("../services/geminiService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * GET /api/ai-suggestions
 * Get all AI-scored leads for the authenticated user.
 */
const getSuggestions = asyncHandler(async (req, res) => {
    const leads = await aiSuggestionModel.getScoredLeads(req.userId);

    res.json({
        success: true,
        data: leads,
    });
});

/**
 * POST /api/ai-suggestions/:leadId
 * Generate AI suggestions for a specific lead.
 */
const generateSuggestion = asyncHandler(async (req, res) => {
    const lead = await aiSuggestionModel.getLeadForScoring(req.params.leadId);

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

    try {
        const result = await geminiService.scoreLead(lead);

        const updatedLead = await aiSuggestionModel.updateAIFields(lead.id, {
            ai_score: result.score,
            ai_category: result.category,
            ai_prediction: result.prediction,
            ai_insights: result.insights,
            ai_recommended_action: result.recommendation,
            ai_rating: result.rating,
            ai_reason: result.reason,
            ai_strengths: JSON.stringify(result.strengths),
            ai_weaknesses: JSON.stringify(result.weaknesses),
            ai_recommendation: result.recommendation
        });

        // Log the scoring activity
        await activityModel.create({
            leadId: lead.id,
            userId: req.userId,
            type: "scored",
            description: `AI score updated to ${result.score}/100 (${result.category})`,
        });

        res.json({
            success: true,
            message: "AI suggestions generated",
            data: updatedLead,
        });
    } catch (error) {
        console.error("AI Generate Suggestion Controller Error:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "AI suggestion generation failed: " + error.message 
        });
    }
});

/**
 * POST /api/ai-suggestions/generate-email
 */
const generateEmail = asyncHandler(async (req, res) => {
    const { leadId, objective, tone, previousInteractions } = req.body;
    const lead = await aiSuggestionModel.getLeadForScoring(leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    if (lead.user_id !== req.userId) return res.status(403).json({ success: false, message: "Access denied" });

    const emailData = await geminiService.generateEmail({
        lead,
        objective,
        tone,
        previousInteractions
    });

    res.json({ success: true, data: emailData });
});

/**
 * POST /api/ai-suggestions/generate-followup
 */
const generateFollowUp = asyncHandler(async (req, res) => {
    const { leadId, step, previousEmails, objective } = req.body;
    const lead = await aiSuggestionModel.getLeadForScoring(leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    if (lead.user_id !== req.userId) return res.status(403).json({ success: false, message: "Access denied" });

    const followUpData = await geminiService.generateFollowUp({
        lead,
        step,
        previousEmails,
        objective
    });

    res.json({ success: true, data: followUpData });
});

/**
 * POST /api/ai-suggestions/analyze-reply
 */
const analyzeReply = asyncHandler(async (req, res) => {
    const { leadId, replyText } = req.body;
    if (!replyText || typeof replyText !== "string") {
        return res.status(400).json({ success: false, message: "Reply text is required" });
    }
    const lead = await aiSuggestionModel.getLeadForScoring(leadId);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
    if (lead.user_id !== req.userId) return res.status(403).json({ success: false, message: "Access denied" });

    const analysis = await geminiService.analyzeReply({
        lead,
        replyText
    });

    res.json({ success: true, data: analysis });
});

module.exports = {
    getSuggestions,
    generateSuggestion,
    generateEmail,
    generateFollowUp,
    analyzeReply
};

