const pool = require("../config/db");

const workflowModel = {
    async getByUser(userId) {
        const { rows } = await pool.query(
            `SELECT * FROM automation_workflows WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return rows;
    },

    async getById(id) {
        const { rows } = await pool.query(
            `SELECT * FROM automation_workflows WHERE id = $1`,
            [id]
        );
        return rows[0] || null;
    },

    async getActiveByTrigger(triggerType) {
        const { rows } = await pool.query(
            `SELECT * FROM automation_workflows WHERE trigger_type = $1 AND is_active = true`,
            [triggerType]
        );
        return rows;
    },

    async getAllActive() {
        const { rows } = await pool.query(
            `SELECT * FROM automation_workflows WHERE is_active = true`
        );
        return rows;
    },

    async create({ userId, name, description, triggerType, conditions = [], actions = [], isActive = true }) {
        const { rows } = await pool.query(
            `INSERT INTO automation_workflows (user_id, name, description, trigger_type, conditions, actions, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, name, description, triggerType, JSON.stringify(conditions), JSON.stringify(actions), isActive]
        );
        return rows[0];
    },

    async update(id, userId, fields) {
        const allowed = {
            name: "name",
            description: "description",
            triggerType: "trigger_type",
            trigger_type: "trigger_type",
            conditions: "conditions",
            actions: "actions",
            isActive: "is_active",
            is_active: "is_active",
        };

        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const [inputKey, dbCol] of Object.entries(allowed)) {
            if (fields[inputKey] !== undefined) {
                const value = (dbCol === "conditions" || dbCol === "actions")
                    ? JSON.stringify(fields[inputKey])
                    : fields[inputKey];
                updates.push(`${dbCol} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (updates.length === 0) return null;

        updates.push("updated_at = NOW()");

        values.push(id, userId);
        const { rows } = await pool.query(
            `UPDATE automation_workflows SET ${updates.join(", ")}
             WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
             RETURNING *`,
            values
        );
        return rows[0] || null;
    },

    async toggle(id, isActive, userId) {
        const { rows } = await pool.query(
            `UPDATE automation_workflows SET is_active = $1, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [isActive, id, userId]
        );
        return rows[0] || null;
    },

    async delete(id, userId) {
        const { rowCount } = await pool.query(
            `DELETE FROM automation_workflows WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        return rowCount > 0;
    },

    async countByUser(userId) {
        const { rows } = await pool.query(
            `SELECT 
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE is_active = true)::int AS active
             FROM automation_workflows WHERE user_id = $1`,
            [userId]
        );
        return rows[0];
    }
};

module.exports = workflowModel;
