const pool = require("../config/db");

const scheduledActionModel = {
    async create({ workflowExecutionId, workflowId, leadId, userId, actionConfig, scheduledAt }) {
        const { rows } = await pool.query(
            `INSERT INTO scheduled_actions (workflow_execution_id, workflow_id, lead_id, user_id, action_config, scheduled_at, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')
             RETURNING *`,
            [workflowExecutionId, workflowId, leadId, userId, JSON.stringify(actionConfig), scheduledAt]
        );
        return rows[0];
    },

    async getPending() {
        const { rows } = await pool.query(
            `SELECT sa.*, aw.name AS workflow_name
             FROM scheduled_actions sa
             LEFT JOIN automation_workflows aw ON sa.workflow_id = aw.id
             WHERE sa.status = 'pending' AND sa.scheduled_at <= NOW()
             ORDER BY sa.scheduled_at ASC
             LIMIT 50`
        );
        return rows;
    },

    async markRunning(id) {
        const { rows } = await pool.query(
            `UPDATE scheduled_actions 
             SET status = 'running', attempts = attempts + 1
             WHERE id = $1 AND status = 'pending'
             RETURNING *`,
            [id]
        );
        return rows[0] || null;
    },

    async markCompleted(id) {
        const { rows } = await pool.query(
            `UPDATE scheduled_actions 
             SET status = 'completed', executed_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [id]
        );
        return rows[0] || null;
    },

    async markFailed(id, error) {
        const { rows } = await pool.query(
            `UPDATE scheduled_actions 
             SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
                 error = $2
             WHERE id = $1
             RETURNING *`,
            [id, error]
        );
        return rows[0] || null;
    },

    async cancel(id) {
        const { rows } = await pool.query(
            `UPDATE scheduled_actions SET status = 'cancelled' WHERE id = $1 RETURNING *`,
            [id]
        );
        return rows[0] || null;
    },

    async getByUser(userId, limit = 50) {
        const { rows } = await pool.query(
            `SELECT sa.*, aw.name AS workflow_name, l.name AS lead_name
             FROM scheduled_actions sa
             LEFT JOIN automation_workflows aw ON sa.workflow_id = aw.id
             LEFT JOIN leads l ON sa.lead_id = l.id
             WHERE sa.user_id = $1
             ORDER BY sa.scheduled_at DESC
             LIMIT $2`,
            [userId, limit]
        );
        return rows;
    }
};

module.exports = scheduledActionModel;
