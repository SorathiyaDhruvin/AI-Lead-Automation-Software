const pool = require("../config/db");
const { v4: uuidv4 } = require('uuid');

const segmentModel = {
    async getByUser(userId) {
        const { rows } = await pool.query(
            `SELECT * FROM segments WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return rows;
    },

    async create({ userId, name, description, criteria, color, leadCount = 0 }) {
        const id = uuidv4();
        const { rows } = await pool.query(
            `INSERT INTO segments (id, user_id, name, description, criteria, color, lead_count, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             RETURNING *`,
            [id, userId, name, description, criteria, color, leadCount]
        );
        return rows[0];
    },

    async update(userId, id, fields) {
        const allowed = ["name", "description", "criteria", "color", "lead_count"];
        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const key of allowed) {
            if (fields[key] !== undefined) {
                updates.push(`${key} = $${paramIndex}`);
                values.push(fields[key]);
                paramIndex++;
            }
        }

        if (updates.length === 0) return null;

        values.push(id);
        values.push(userId);
        const { rows } = await pool.query(
            `UPDATE segments SET ${updates.join(", ")}
             WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
             RETURNING *`,
            values
        );
        return rows[0] || null;
    },

    async delete(userId, id) {
        const { rowCount } = await pool.query(
            `DELETE FROM segments WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        return rowCount > 0;
    },
    
    async getByName(userId, name) {
        const { rows } = await pool.query(
            `SELECT * FROM segments WHERE user_id = $1 AND name = $2`,
            [userId, name]
        );
        return rows[0] || null;
    }
};

module.exports = segmentModel;
