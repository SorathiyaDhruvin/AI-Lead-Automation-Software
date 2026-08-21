const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const leadRequestModel = {
    async getById(id) {
        const { rows } = await pool.query(
            `SELECT * FROM lead_requests WHERE id = $1`,
            [id]
        );
        return rows[0] || null;
    },

    async getByUser(userId) {
        const { rows } = await pool.query(
            `SELECT * FROM lead_requests WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return rows;
    },

    async getAll() {
        const { rows } = await pool.query(
            `SELECT * FROM lead_requests ORDER BY created_at DESC`
        );
        return rows;
    },

    async create({ userId, companyName, contactName, email, phone, industry, budget, description, priority = "medium", status = "pending" }) {
        const id = uuidv4();
        const { rows } = await pool.query(
            `INSERT INTO lead_requests (id, user_id, company_name, contact_name, email, phone, industry, budget, description, priority, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
             RETURNING *`,
            [id, userId, companyName, contactName, email, phone, industry, budget, description, priority, status]
        );
        return rows[0];
    },

    async update(id, fields) {
        const fieldMapping = {
            status: "status",
            adminNotes: "admin_notes",
            reviewedBy: "reviewed_by",
            reviewedAt: "reviewed_at"
        };
        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const [key, dbCol] of Object.entries(fieldMapping)) {
            if (fields[key] !== undefined) {
                updates.push(`${dbCol} = $${paramIndex}`);
                values.push(fields[key]);
                paramIndex++;
            }
        }

        if (updates.length === 0) return null;

        updates.push("updated_at = NOW()");

        values.push(id);
        const { rows } = await pool.query(
            `UPDATE lead_requests SET ${updates.join(", ")}
             WHERE id = $${paramIndex}
             RETURNING *`,
            values
        );
        return rows[0] || null;
    }
};

module.exports = leadRequestModel;
