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

module.exports = { getHealth };
