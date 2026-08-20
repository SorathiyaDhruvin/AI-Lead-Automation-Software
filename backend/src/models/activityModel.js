const pool = require("../config/db");

const activityModel = {
    /**
     * Get all activities for a user's leads.
     * Joins with leads table to filter by user ownership.
     */
    async getByUser(userId) {
        const { rows } = await pool.query(
            `SELECT a.*
             FROM activities a
             INNER JOIN leads l ON a.lead_id = l.id
             WHERE l.user_id = $1
             ORDER BY a.created_at DESC`,
            [userId]
        );
        return rows;
    },

    /**
     * Get all activities for a specific lead.
     */
    async getByLead(leadId) {
        const { rows } = await pool.query(
            `SELECT * FROM activities
             WHERE lead_id = $1
             ORDER BY created_at DESC`,
            [leadId]
        );
        return rows;
    },

    /**
     * Create a new activity log entry.
     */
    async create({ leadId, userId, type, description }) {
        const { rows } = await pool.query(
            `INSERT INTO activities (lead_id, user_id, type, description)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [leadId, userId, type, description]
        );
        return rows[0];
    },
};

module.exports = activityModel;
