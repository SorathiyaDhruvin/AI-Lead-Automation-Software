const activityModel = require("../models/activityModel");
const leadModel = require("../models/leadModel");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * GET /api/activities
 * Get all activities across the authenticated user's leads.
 */
const getActivities = asyncHandler(async (req, res) => {
    const activities = await activityModel.getByUser(req.userId);

    res.json({
        success: true,
        data: activities,
    });
});

/**
 * GET /api/activities/lead/:leadId
 * Get activities for a specific lead (with ownership check).
 */
const getActivitiesByLead = asyncHandler(async (req, res) => {
    const lead = await leadModel.getById(req.params.leadId);

    if (!lead) {
        return res.status(404).json({
            success: false,
            message: "Lead not found",
        });
    }

    if (lead.user_id !== req.userId) {
        return res.status(403).json({
            success: false,
            message: "Access denied",
        });
    }

    const activities = await activityModel.getByLead(req.params.leadId);

    res.json({
        success: true,
        data: activities,
    });
});

module.exports = { getActivities, getActivitiesByLead };
