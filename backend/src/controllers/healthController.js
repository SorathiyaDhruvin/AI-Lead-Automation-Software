const pool = require("../config/db");

/**
 * GET /api/health
 * Returns API health status including DB, AI (Gemini), and Email (Resend) configuration checks.
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
    const emailStatus = process.env.RESEND_API_KEY ? "configured" : "missing";

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
    const hasApiKey = !!process.env.RESEND_API_KEY;
    const hasFromEmail = !!process.env.RESEND_FROM_EMAIL;

    res.json({
        configured: hasApiKey && hasFromEmail,
        provider: "resend",
        from: hasFromEmail ? "configured" : "missing",
        apiKey: hasApiKey ? "configured" : "missing",
    });
};

module.exports = { getHealth, getEmailHealth };
