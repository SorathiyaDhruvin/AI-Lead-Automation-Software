const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const noteModel = {
    async getByLead(leadId) {
        const { rows } = await pool.query(
            `SELECT n.*, concat(u.first_name, ' ', u.last_name) AS author_name
             FROM lead_notes n
             LEFT JOIN users u ON n.user_id = u.id
             WHERE n.lead_id = $1
             ORDER BY n.created_at DESC`,
            [leadId]
        );
        // Map db columns to match UI names (e.g. authorName instead of author_name)
        return rows.map(r => ({
            id: r.id,
            leadId: r.lead_id,
            userId: r.user_id,
            text: r.text,
            createdAt: r.created_at,
            authorName: r.author_name || "Unknown"
        }));
    },

    async create({ leadId, userId, text }) {
        const id = uuidv4();
        const { rows } = await pool.query(
            `INSERT INTO lead_notes (id, lead_id, user_id, text, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING *`,
            [id, leadId, userId, text]
        );
        return rows[0];
    }
};

module.exports = noteModel;
