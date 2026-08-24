const pool = require("../config/db");
const emailService = require("../services/emailService");

/**
 * GET /api/health
 * Returns API health status including DB, AI (Gemini), and Email configuration checks.
 */
const getHealth = async (req, res) => {
    let dbStatus = "disconnected";

    try {
        const result = await pool.query("SELECT NOW()");
        if (result.rows.length > 0) {
            dbStatus = "connected";
        }
    } catch (err) {
        console.error("[Health Check DB Error]:", err.message);
        dbStatus = "disconnected";
    }

    const aiStatus = process.env.GEMINI_API_KEY ? "configured" : "missing";
    const emailStatus = emailService.isConfigured() ? "configured" : "missing";

    res.json({
        success: true,
        database: dbStatus,
        ai: aiStatus,
        email: emailStatus
    });
};

/**
 * GET /api/health/email
 * Returns email service configuration status without exposing secrets.
 */
const getEmailHealth = async (req, res) => {
    const health = await emailService.checkSmtpConnection();
    res.json(health);
};

module.exports = { getHealth, getEmailHealth };
