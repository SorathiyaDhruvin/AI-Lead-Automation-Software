const pool = require("../config/db");
const leadModel = require("../models/leadModel");
const segmentModel = require("../models/segmentModel");
const { asyncHandler } = require("../middleware/errorHandler");

const getStats = asyncHandler(async (req, res) => {
    const userId = req.userId;

    // Get stats from lead model
    const stats = await leadModel.getStats(userId);
    
    // Get segments
    const segments = await segmentModel.getByUser(userId);

    // Get daily trend for last 7 days
    const { rows: trendRows } = await pool.query(
        `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
         FROM leads
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
         ORDER BY date ASC`,
        [userId]
    );

    // Generate date map to ensure all 7 days exist in response
    const dailyTrend = [];
    const trendMap = {};
    trendRows.forEach(row => {
        trendMap[row.date] = row.count;
    });

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        dailyTrend.push({
            date: dateStr,
            count: trendMap[dateStr] || 0
        });
    }

    const conversionRate = stats.total > 0
        ? Math.round(((stats.statusCounts.won || 0) / stats.total) * 100)
        : 0;

    const allStatuses = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
    const normalizedStatusCounts = {};
    for (const s of allStatuses) {
        normalizedStatusCounts[s] = stats.statusCounts[s] || 0;
    }

    // ── Warm and Cold lead counts (from real AI categories) ──
    let warmLeads = 0;
    let coldLeads = 0;
    try {
        const { rows: categoryRows } = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE LOWER(ai_category) = 'warm')::int AS warm,
                COUNT(*) FILTER (WHERE LOWER(ai_category) = 'cold')::int AS cold
             FROM leads WHERE user_id = $1`,
            [userId]
        );
        warmLeads = categoryRows[0]?.warm || 0;
        coldLeads = categoryRows[0]?.cold || 0;
    } catch (e) {
        // Columns may not exist yet
    }

    // ── Automation execution stats (real data from workflow_executions table) ──
    let automationStats = { total: 0, successful: 0, failed: 0, running: 0, successRate: 0 };
    try {
        const { rows: execRows } = await pool.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                COUNT(*) FILTER (WHERE status = 'running')::int AS running
             FROM workflow_executions
             WHERE user_id = $1`,
            [userId]
        );
        if (execRows[0]) {
            automationStats = execRows[0];
            automationStats.successRate = automationStats.total > 0
                ? Math.round((automationStats.successful / automationStats.total) * 100)
                : 0;
        }
    } catch (e) {
        // Table may not exist yet
    }

    // ── Email stats (real data from email_logs table) ──
    let emailStats = { total: 0, sent: 0, failed: 0 };
    try {
        const { rows: emailRows } = await pool.query(
            `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'sent' OR status = 'delivered')::int AS sent,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
             FROM email_logs
             WHERE user_id = $1`,
            [userId]
        );
        if (emailRows[0]) {
            emailStats = emailRows[0];
        }
    } catch (e) {
        // Table may not exist yet
    }

    res.json({
        success: true,
        data: {
            totalLeads: stats.total,
            hotLeads: stats.hot,
            warmLeads,
            coldLeads,
            segments: segments.length,
            avgScore: stats.avgScore,
            conversionRate,
            statusCounts: normalizedStatusCounts,
            dailyTrend,
            leadsTrend: 0,
            scoreTrend: 0,
            automationExecutions: automationStats.total,
            automationSuccessful: automationStats.successful,
            automationFailed: automationStats.failed,
            automationSuccessRate: automationStats.successRate,
            emailsSent: emailStats.sent,
            emailsFailed: emailStats.failed,
        }
    });
});

module.exports = { getStats };
