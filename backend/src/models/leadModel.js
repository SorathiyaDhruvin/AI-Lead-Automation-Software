const pool = require("../config/db");

const leadModel = {
    /**
     * Get leads for a user with optional filters.
     * Builds WHERE clauses dynamically for search, status, score range, and limit.
     */
    /**
     * Get leads for a user with optional filters.
     * Builds WHERE clauses dynamically for search, status, score range, and limit.
     */
    async getByUser(userId, filters = {}, isAdmin = false) {
        const conditions = [];
        const values = [];
        let paramIndex = 1;

        if (!isAdmin) {
            conditions.push(`l.user_id = $${paramIndex}`);
            values.push(userId);
            paramIndex++;
        }

        if (filters.search) {
            conditions.push(
                `(l.name ILIKE $${paramIndex} OR l.email ILIKE $${paramIndex} OR l.company ILIKE $${paramIndex})`
            );
            values.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters.status && filters.status !== "all") {
            conditions.push(`l.status = $${paramIndex}`);
            values.push(filters.status);
            paramIndex++;
        }

        if (filters.minScore !== undefined) {
            conditions.push(`l.ai_score >= $${paramIndex}`);
            values.push(filters.minScore);
            paramIndex++;
        }

        if (filters.maxScore !== undefined) {
            conditions.push(`l.ai_score <= $${paramIndex}`);
            values.push(filters.maxScore);
            paramIndex++;
        }

        let query = `
            SELECT l.*, 
                   u.email AS owner_email,
                   (SELECT status FROM workflow_executions WHERE lead_id = l.id ORDER BY started_at DESC LIMIT 1) AS automation_status
            FROM leads l
            LEFT JOIN users u ON l.user_id = u.id
        `;

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(" AND ")}`;
        }

        query += ` ORDER BY l.created_at DESC`;

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
    async create({ userId, name, email, company, phone, source = "manual", status = "new", processing_status = "accepted", notes }) {
        const { rows } = await pool.query(
            `INSERT INTO leads (user_id, name, email, company, phone, source, status, processing_status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [userId, name, email, company || null, phone || null, source, status, processing_status, notes || null]
        );
        return rows[0];
    },

    async update(id, fields) {
        // Map frontend camelCase to database snake_case
        const fieldMapping = {
            name: "name",
            email: "email",
            company: "company",
            phone: "phone",
            source: "source",
            status: "status",
            processingStatus: "processing_status",
            processing_status: "processing_status",
            aiScore: "ai_score",
            aiCategory: "ai_category",
            aiPrediction: "ai_prediction",
            aiInsights: "ai_insights",
            aiRecommendedAction: "ai_recommended_action",
            aiRating: "ai_rating",
            aiReason: "ai_reason",
            aiStrengths: "ai_strengths",
            aiWeaknesses: "ai_weaknesses",
            aiRecommendation: "ai_recommendation",
            segmentId: "segment_id",
            notes: "notes",
            lastContact: "last_contact",
            // Also allow snake_case directly
            ai_score: "ai_score",
            ai_category: "ai_category",
            ai_prediction: "ai_prediction",
            ai_insights: "ai_insights",
            ai_recommended_action: "ai_recommended_action",
            ai_rating: "ai_rating",
            ai_reason: "ai_reason",
            ai_strengths: "ai_strengths",
            ai_weaknesses: "ai_weaknesses",
            ai_recommendation: "ai_recommendation",
            segment_id: "segment_id",
            last_contact: "last_contact",
        };

        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const [inputKey, dbColumn] of Object.entries(fieldMapping)) {
            if (fields[inputKey] !== undefined) {
                updates.push(`${dbColumn} = $${paramIndex}`);
                values.push(fields[inputKey]);
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
        // Safe casting to handle ai_score regardless of if it's integer or text in the DB
        const { rows } = await pool.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE NULLIF(ai_score::text, '')::numeric >= 70)::int AS hot,
                COALESCE(ROUND(AVG(NULLIF(ai_score::text, '')::numeric))::int, 0) AS avg_score
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
