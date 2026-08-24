const pool = require("../config/db");

const executionModel = {
    async getByUser(userId, limit = 50) {
        const { rows } = await pool.query(
            `SELECT we.*, 
                    aw.name AS workflow_name,
                    l.name AS lead_name, l.email AS lead_email
             FROM workflow_executions we
             LEFT JOIN automation_workflows aw ON we.workflow_id = aw.id
             LEFT JOIN leads l ON we.lead_id = l.id
             WHERE we.user_id = $1
             ORDER BY we.started_at DESC
             LIMIT $2`,
            [userId, limit]
        );
        return rows;
    },

    async getById(id) {
        const { rows } = await pool.query(
            `SELECT we.*, aw.name AS workflow_name, l.name AS lead_name
             FROM workflow_executions we
             LEFT JOIN automation_workflows aw ON we.workflow_id = aw.id
             LEFT JOIN leads l ON we.lead_id = l.id
             WHERE we.id = $1`,
            [id]
        );
        return rows[0] || null;
    },

    async create({ workflowId, leadId, userId, triggerEvent, totalActions, idempotencyKey }) {
        const { rows } = await pool.query(
            `INSERT INTO workflow_executions (workflow_id, lead_id, user_id, trigger_event, status, total_actions, idempotency_key, started_at)
             VALUES ($1, $2, $3, $4, 'running', $5, $6, NOW())
             RETURNING *`,
            [workflowId, leadId, userId, triggerEvent, totalActions, idempotencyKey]
        );
        return rows[0];
    },

    async updateStatus(id, status, actionsCompleted, error = null) {
        const completedAt = (status === "success" || status === "failed") ? "NOW()" : "NULL";
        const { rows } = await pool.query(
            `UPDATE workflow_executions 
             SET status = $1, actions_completed = $2, error = $3, 
                 completed_at = ${completedAt}
             WHERE id = $4
             RETURNING *`,
            [status, actionsCompleted, error, id]
        );
        return rows[0] || null;
    },

    async incrementActions(id) {
        const { rows } = await pool.query(
            `UPDATE workflow_executions SET actions_completed = actions_completed + 1
             WHERE id = $1
             RETURNING *`,
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Check if an execution with this idempotency key already exists and is not failed.
     * This prevents duplicate executions.
     */
    async checkIdempotency(key) {
        const { rows } = await pool.query(
            `SELECT id, status FROM workflow_executions 
             WHERE idempotency_key = $1 AND status != 'failed'
             LIMIT 1`,
            [key]
        );
        return rows[0] || null;
    },

    async getStatsByUser(userId) {
        const { rows } = await pool.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                COUNT(*) FILTER (WHERE status = 'running')::int AS running,
                COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped
             FROM workflow_executions
             WHERE user_id = $1`,
            [userId]
        );
        const stats = rows[0];
        stats.successRate = stats.total > 0 
            ? Math.round((stats.successful / stats.total) * 100)
            : 0;
        return stats;
    },

    async getByWorkflow(workflowId, limit = 20) {
        const { rows } = await pool.query(
            `SELECT we.*, l.name AS lead_name, l.email AS lead_email
             FROM workflow_executions we
             LEFT JOIN leads l ON we.lead_id = l.id
             WHERE we.workflow_id = $1
             ORDER BY we.started_at DESC
             LIMIT $2`,
            [workflowId, limit]
        );
        return rows;
    }
};

module.exports = executionModel;
