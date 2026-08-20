const aiSuggestionModel = require("../models/aiSuggestionModel");
const activityModel = require("../models/activityModel");
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
 *
 * Currently returns mock/placeholder AI data.
 * Replace the scoring logic below with OpenAI or your preferred AI service.
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

    // ──────────────────────────────────────────────
    // 🤖 AI Scoring Logic (placeholder)
    //
    // Replace this block with a real AI service call, e.g.:
    //   const result = await openai.chat.completions.create({ ... });
    //
    // The placeholder below generates deterministic mock data
    // based on the lead's properties.
    // ──────────────────────────────────────────────

    const hasCompany = !!lead.company;
    const hasPhone = !!lead.phone;
    const baseScore = 40 + (hasCompany ? 20 : 0) + (hasPhone ? 15 : 0);
    const score = Math.min(baseScore + Math.floor(Math.random() * 25), 100);

    let category, prediction, recommendedAction;

    if (score >= 70) {
        category = "hot";
        prediction = "High conversion probability — engage immediately";
        recommendedAction = "Schedule a demo call within 24 hours";
    } else if (score >= 40) {
        category = "warm";
        prediction = "Moderate interest — needs nurturing";
        recommendedAction = "Send a personalized follow-up email";
    } else {
        category = "cold";
        prediction = "Low engagement signals — long-term prospect";
        recommendedAction = "Add to drip email campaign";
    }

    const insights = `Lead from ${lead.source || "unknown"} source. ${hasCompany ? `Works at ${lead.company}.` : "No company info."} ${hasPhone ? "Phone available for outreach." : "No phone — use email."}`;

    const updatedLead = await aiSuggestionModel.updateAIFields(lead.id, {
        ai_score: score,
        ai_category: category,
        ai_prediction: prediction,
        ai_insights: insights,
        ai_recommended_action: recommendedAction,
    });

    // Log the scoring activity
    activityModel.create({
        leadId: lead.id,
        userId: req.userId,
        type: "scored",
        description: `AI score updated to ${score}/100 (${category})`,
    }).catch((err) => console.error("Activity log error:", err));

    res.json({
        success: true,
        message: "AI suggestions generated",
        data: updatedLead,
    });
});

module.exports = { getSuggestions, generateSuggestion };
