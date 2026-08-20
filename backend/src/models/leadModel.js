const pool = require("../config/db");

const leadModel = {
    /**
     * Get leads for a user with optional filters.
     * Builds WHERE clauses dynamically for search, status, score range, and limit.
     */
    async getByUser(userId, filters = {}) {
        const conditions = ["user_id = $1"];
        const values = [userId];
        let paramIndex = 2;

        if (filters.search) {
            conditions.push(
                `(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR company ILIKE $${paramIndex})`
            );
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters.status && filters.status !== "all") {
            conditions.push(`status = $${paramIndex}`);
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.minScore !== undefined) {
            conditions.push(`ai_score >= $${paramIndex}`);
            values.push(filters.minScore);
            paramIndex++;
        }

        if (filters.maxScore !== undefined) {
            conditions.push(`ai_score <= $${paramIndex}`);
            values.push(filters.maxScore);
            paramIndex++;
        }

        let query = `SELECT * FROM leads WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;

        if (filters.limit) {
            query += ` LIMIT $${paramIndex}`;
            values.push(filters.limit);
        }

        const { rows } = await pool.query(query, values);
        return rows;
    },

    /**
     * Get a single lead by ID.
     */
    async getById(id) {
        const { rows } = await pool.query(
            `SELECT * FROM leads WHERE id = $1`,
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Create a new lead.
     */
    async create({ userId, name, email, company, phone, source = "manual", status = "new", notes }) {
        const { rows } = await pool.query(
            `INSERT INTO leads (user_id, name, email, company, phone, source, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [userId, name, email, company || null, phone || null, source, status, notes || null]
        );
        return rows[0];
    },

    /**
     * Update a lead. Only updates provided fields.
     */
    async update(id, fields) {
        const allowed = [
            "name", "email", "company", "phone", "source", "status",
            "ai_score", "ai_category", "ai_prediction", "ai_insights",
            "ai_recommended_action", "segment_id", "notes", "last_contact",
        ];
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

        // Always update the updated_at timestamp
        updates.push(`updated_at = NOW()`);

        values.push(id);
        const { rows } = await pool.query(
            `UPDATE leads SET ${updates.join(", ")}
             WHERE id = $${paramIndex}
             RETURNING *`,
            values
        );
        return rows[0] || null;
    },

    /**
     * Delete a lead by ID.
     */
    async delete(id) {
        const { rowCount } = await pool.query(
            `DELETE FROM leads WHERE id = $1`,
            [id]
        );
        return rowCount > 0;
    },

    /**
     * Get lead statistics for a user.
     * Optimized: uses SQL aggregation instead of fetching all rows.
     */
    async getStats(userId) {
        const { rows } = await pool.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE ai_score >= 70)::int AS hot,
                COALESCE(ROUND(AVG(ai_score))::int, 0) AS avg_score
             FROM leads
             WHERE user_id = $1`,
            [userId]
        );

        const statusResult = await pool.query(
            `SELECT status, COUNT(*)::int AS count
             FROM leads
             WHERE user_id = $1
             GROUP BY status`,
            [userId]
        );

        const statusCounts = {};
        for (const row of statusResult.rows) {
            statusCounts[row.status] = row.count;
        }

        return {
            total: rows[0].total,
            hot: rows[0].hot,
            avgScore: rows[0].avg_score,
            statusCounts,
        };
    },
};

module.exports = leadModel;
