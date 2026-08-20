const pool = require("../config/db");

/**
 * GET /api/health
 * Returns API health status and database connectivity.
 */
const getHealth = async (req, res) => {
    let dbStatus = "disconnected";

    try {
        const result = await pool.query("SELECT NOW()");
        if (result.rows.length > 0) {
            dbStatus = "connected";
        }
    } catch {
        dbStatus = "error";
    }

    res.json({
        success: true,
        message: "API is healthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        database: dbStatus,
    });
};

module.exports = { getHealth };
