const pool = require("../config/db");

const emailLogModel = {
    async create({ leadId, userId, recipient, subject, templateId, workflowExecutionId, provider = "resend", status = "pending", providerMessageId, error }) {
        const { rows } = await pool.query(
            `INSERT INTO email_logs (lead_id, user_id, recipient, subject, template_id, workflow_execution_id, provider, status, provider_message_id, error, sent_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             RETURNING *`,
            [leadId || null, userId || null, recipient, subject, templateId || null, workflowExecutionId || null, provider, status, providerMessageId || null, error || null]
        );
        return rows[0];
    },

    async updateStatus(id, status, providerMessageId, error) {
        const { rows } = await pool.query(
            `UPDATE email_logs SET status = $1, provider_message_id = $2, error = $3
             WHERE id = $4
             RETURNING *`,
            [status, providerMessageId || null, error || null, id]
        );
        return rows[0] || null;
    },

    async getByLead(leadId, limit = 50) {
        const { rows } = await pool.query(
            `SELECT el.*, et.name AS template_name
             FROM email_logs el
             LEFT JOIN email_templates et ON el.template_id = et.id
             WHERE el.lead_id = $1
             ORDER BY el.sent_at DESC
             LIMIT $2`,
            [leadId, limit]
        );
        return rows;
    },

    async getByUser(userId, limit = 100) {
        const { rows } = await pool.query(
            `SELECT el.*, et.name AS template_name
             FROM email_logs el
             LEFT JOIN email_templates et ON el.template_id = et.id
             WHERE el.user_id = $1
             ORDER BY el.sent_at DESC
             LIMIT $2`,
            [userId, limit]
        );
        return rows;
    },

    async getStatsByUser(userId) {
        const { rows } = await pool.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
                COUNT(*) FILTER (WHERE status = 'bounced')::int AS bounced
             FROM email_logs
             WHERE user_id = $1`,
            [userId]
        );
        return rows[0];
    }
};

module.exports = emailLogModel;
