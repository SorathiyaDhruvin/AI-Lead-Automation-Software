const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const automationModel = {
    async getByUser(userId) {
        const { rows } = await pool.query(
            `SELECT * FROM automation_rules WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return rows;
    },

    async getActive() {
        const { rows } = await pool.query(
            `SELECT * FROM automation_rules WHERE is_active = true`
        );
        return rows;
    },

    async create({ userId, name, triggerType, triggerValue, actionType, actionValue, isActive = true }) {
        const id = uuidv4();
        const { rows } = await pool.query(
            `INSERT INTO automation_rules (id, user_id, name, trigger_type, trigger_value, action_type, action_value, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING *`,
            [id, userId, name, triggerType, triggerValue, actionType, actionValue, isActive]
        );
        return rows[0];
    },

    async delete(id, userId) {
        const { rowCount } = await pool.query(
            `DELETE FROM automation_rules WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        return rowCount > 0;
    },

    async toggle(id, isActive, userId) {
        const { rows } = await pool.query(
            `UPDATE automation_rules SET is_active = $1 
             WHERE id = $2 AND user_id = $3
             RETURNING *`,
            [isActive, id, userId]
        );
        return rows[0] || null;
    }
};

module.exports = automationModel;
