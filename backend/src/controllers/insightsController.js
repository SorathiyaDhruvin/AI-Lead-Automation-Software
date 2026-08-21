const leadModel = require("../models/leadModel");
const geminiService = require("../services/geminiService");
const activityModel = require("../models/activityModel");
const { asyncHandler } = require("../middleware/errorHandler");

const generateInsights = asyncHandler(async (req, res) => {
    const leads = await leadModel.getByUser(req.userId);
    
    // Find all unscored leads
    const unscoredLeads = leads.filter(l => l.ai_score === null || l.ai_score === undefined);
    
    if (unscoredLeads.length === 0) {
        return res.json({ success: true, message: "All leads already have AI insights generated." });
    }

    let scoredCount = 0;
    const errors = [];

    // Loop and generate scores
    for (const lead of unscoredLeads) {
        try {
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
                ai_recommendation: result.recommendation
            });

            await activityModel.create({
                leadId: lead.id,
                userId: req.userId,
                type: "scored",
                description: `AI score updated to ${result.score}/100 (${result.category})`,
            });
            scoredCount++;
        } catch (err) {
            console.error(`[Insights Generate] Failed for lead ${lead.id}:`, err.message);
            errors.push(`Lead "${lead.name}": ${err.message}`);
        }
    }

    res.json({
        success: true,
        message: `Insights generation complete. Scored ${scoredCount} leads.`,
        data: {
            scoredCount,
            failedCount: errors.length,
            errors
        }
    });
});

module.exports = { generateInsights };
