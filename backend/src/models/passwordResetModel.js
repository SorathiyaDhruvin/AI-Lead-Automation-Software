const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const passwordResetModel = {
    async invalidateAllForUser(email) {
        await pool.query(
            `UPDATE password_resets SET used = true 
             WHERE email = $1 AND used = false`,
            [email.toLowerCase()]
        );
    },

    async create({ userId, email, otp, otpExpiresAt }) {
        const id = uuidv4();
        const { rows } = await pool.query(
            `INSERT INTO password_resets (id, user_id, email, otp, otp_expires_at, used, created_at)
             VALUES ($1, $2, $3, $4, $5, false, NOW())
             RETURNING *`,
            [id, userId, email.toLowerCase(), otp, otpExpiresAt]
        );
        return rows[0];
    },

    async getByEmailAndOtp(email, otp) {
        const { rows } = await pool.query(
            `SELECT * FROM password_resets 
             WHERE email = $1 AND otp = $2 AND used = false 
             ORDER BY created_at DESC LIMIT 1`,
            [email.toLowerCase(), otp]
        );
        return rows[0] || null;
    },

    async getByToken(token) {
        const { rows } = await pool.query(
            `SELECT * FROM password_resets 
             WHERE reset_token = $1
             ORDER BY created_at DESC LIMIT 1`,
            [token]
        );
        return rows[0] || null;
    },

    async update(id, fields) {
        const allowed = ["used", "reset_token", "reset_token_expires_at", "attempts"];
        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const key of allowed) {
            if (fields[key] !== undefined) {
                // Map camelCase to snake_case if necessary, but Drizzle database columns for resets:
                // used, reset_token, reset_token_expires_at, attempts
                const colName = key === "resetToken" ? "reset_token" : 
                                key === "resetTokenExpiresAt" ? "reset_token_expires_at" : key;
                updates.push(`${colName} = $${paramIndex}`);
                values.push(fields[key]);
                paramIndex++;
            }
        }

        if (updates.length === 0) return null;

        values.push(id);
        const { rows } = await pool.query(
            `UPDATE password_resets SET ${updates.join(", ")}
             WHERE id = $${paramIndex}
             RETURNING *`,
            values
        );
        return rows[0] || null;
    }
};

module.exports = passwordResetModel;
