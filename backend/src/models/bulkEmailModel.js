const pool = require("../config/db");

const bulkEmailModel = {
    async create({ userId, name, totalRecipients }) {
        const { rows } = await pool.query(
            `INSERT INTO bulk_email_jobs (user_id, name, total_recipients, status, created_at, updated_at)
             VALUES ($1, $2, $3, 'pending', NOW(), NOW())
             RETURNING *`,
            [userId, name || "Bulk Email Campaign", totalRecipients]
        );
        return rows[0];
    },

    async updateStatus(id, status) {
        const { rows } = await pool.query(
            `UPDATE bulk_email_jobs 
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );
        return rows[0];
    },

    async updateCounts(id, sentCount, failedCount) {
        const { rows } = await pool.query(
            `UPDATE bulk_email_jobs 
             SET sent_count = $1, failed_count = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [sentCount, failedCount, id]
        );
        return rows[0];
    },

    async getById(id) {
        const { rows } = await pool.query(
            `SELECT * FROM bulk_email_jobs WHERE id = $1`,
            [id]
        );
        return rows[0] || null;
    }
};

module.exports = bulkEmailModel;
