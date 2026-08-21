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

    res.json({
        success: true,
        data: {
            totalLeads: stats.total,
            hotLeads: stats.hot,
            segments: segments.length,
            avgScore: stats.avgScore,
            conversionRate,
            statusCounts: normalizedStatusCounts,
            dailyTrend,
            leadsTrend: 0,
            scoreTrend: 0,
        }
    });
});

module.exports = { getStats };
