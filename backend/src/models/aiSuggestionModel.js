const pool = require("../config/db");

const aiSuggestionModel = {
    /**
     * Get leads with their AI scoring fields for a user.
     * Returns only leads that have been scored (ai_score IS NOT NULL).
     */
    async getScoredLeads(userId) {
        const { rows } = await pool.query(
            `SELECT id, name, email, company, status, source,
                    ai_score, ai_category, ai_prediction,
                    ai_insights, ai_recommended_action, created_at
             FROM leads
             WHERE user_id = $1 AND ai_score IS NOT NULL
             ORDER BY ai_score DESC`,
            [userId]
        );
        return rows;
    },

    /**
     * Get a single lead for AI processing.
     */
    async getLeadForScoring(leadId) {
        const { rows } = await pool.query(
            `SELECT * FROM leads WHERE id = $1`,
            [leadId]
        );
        return rows[0] || null;
    },

    /**
     * Update AI-specific fields on a lead after scoring.
     */
    async updateAIFields(leadId, { ai_score, ai_category, ai_prediction, ai_insights, ai_recommended_action }) {
        const { rows } = await pool.query(
            `UPDATE leads
             SET ai_score = $1,
                 ai_category = $2,
                 ai_prediction = $3,
                 ai_insights = $4,
                 ai_recommended_action = $5,
                 updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [ai_score, ai_category, ai_prediction, ai_insights, ai_recommended_action, leadId]
        );
        return rows[0] || null;
    },
};

module.exports = aiSuggestionModel;
