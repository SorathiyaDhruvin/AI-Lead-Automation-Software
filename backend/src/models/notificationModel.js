const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const notificationModel = {
    async getByUser(userId, limit = 50) {
        const { rows } = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [userId, limit]
        );
        return rows;
    },

    async getUnreadCount(userId) {
        const { rows } = await pool.query(
            `SELECT COUNT(*)::int AS count FROM notifications 
             WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        return rows[0]?.count || 0;
    },

    async create({ userId, type, message }) {
        const id = uuidv4();
        const { rows } = await pool.query(
            `INSERT INTO notifications (id, user_id, type, message, is_read, created_at)
             VALUES ($1, $2, $3, $4, false, NOW())
             RETURNING *`,
            [id, userId, type, message]
        );
        return rows[0];
    },

    async markRead(id, userId) {
        const { rows } = await pool.query(
            `UPDATE notifications SET is_read = true 
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );
        return rows[0] || null;
    },

    async markAllRead(userId) {
        await pool.query(
            `UPDATE notifications SET is_read = true 
             WHERE user_id = $1`,
            [userId]
        );
    }
};

module.exports = notificationModel;
