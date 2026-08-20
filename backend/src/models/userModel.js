const pool = require("../config/db");

const userModel = {
    /**
     * Get all users (admin use). Never returns passwords.
     */
    async getAll() {
        const { rows } = await pool.query(
            `SELECT id, email, name, role, created_at
             FROM users
             ORDER BY created_at DESC`
        );
        return rows;
    },

    /**
     * Get a single user by ID. Returns password hash (needed for auth checks).
     */
    async getById(id) {
        const { rows } = await pool.query(
            `SELECT * FROM users WHERE id = $1`,
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Get a single user by email. Returns password hash (needed for login).
     */
    async getByEmail(email) {
        const { rows } = await pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );
        return rows[0] || null;
    },

    /**
     * Create a new user. Returns the created user (with id, without password).
     */
    async create({ email, password, name, role = "user" }) {
        const { rows } = await pool.query(
            `INSERT INTO users (email, password, name, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, name, role, created_at`,
            [email, password, name, role]
        );
        return rows[0];
    },

    /**
     * Update user fields. Only updates provided fields.
     */
    async update(id, fields) {
        const allowed = ["email", "password", "name", "role"];
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
        const { rows } = await pool.query(
            `UPDATE users SET ${updates.join(", ")}
             WHERE id = $${paramIndex}
             RETURNING id, email, name, role, created_at`,
            values
        );
        return rows[0] || null;
    },
};

module.exports = userModel;
