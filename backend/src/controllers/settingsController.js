const userModel = require("../models/userModel");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * GET /api/settings
 * Get user settings (notification prefs, theme, timezone, automation).
 */
const getSettings = asyncHandler(async (req, res) => {
    const user = await userModel.getById(req.userId);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
        success: true,
        data: {
            emailNotifications: user.email_notifications ?? true,
            smsNotifications: user.sms_notifications ?? false,
            marketingEmails: user.marketing_emails ?? false,
            leadAlerts: user.lead_alerts ?? true,
            automationAlerts: user.automation_alerts ?? true,
            dailyDigest: user.daily_digest ?? false,
            automationEnabled: user.automation_enabled ?? true,
            theme: user.theme || "system",
            timezone: user.timezone || "UTC",
        },
    });
});

/**
 * PUT /api/settings
 * Save user settings to database.
 */
const updateSettings = asyncHandler(async (req, res) => {
    const {
        emailNotifications,
        smsNotifications,
        marketingEmails,
        leadAlerts,
        automationAlerts,
        dailyDigest,
        automationEnabled,
        theme,
        timezone,
    } = req.body;

    // Build DB update fields
    const dbUpdates = {};
    if (emailNotifications !== undefined) dbUpdates.email_notifications = emailNotifications;
    if (smsNotifications !== undefined) dbUpdates.sms_notifications = smsNotifications;
    if (marketingEmails !== undefined) dbUpdates.marketing_emails = marketingEmails;
    if (leadAlerts !== undefined) dbUpdates.lead_alerts = leadAlerts;
    if (automationAlerts !== undefined) dbUpdates.automation_alerts = automationAlerts;
    if (dailyDigest !== undefined) dbUpdates.daily_digest = dailyDigest;
    if (automationEnabled !== undefined) dbUpdates.automation_enabled = automationEnabled;
    if (theme !== undefined) dbUpdates.theme = theme;
    if (timezone !== undefined) dbUpdates.timezone = timezone;

    if (Object.keys(dbUpdates).length === 0) {
        return res.status(400).json({ success: false, message: "No settings to update" });
    }

    // We need to add these columns to the allowed list in userModel
    const pool = require("../config/db");
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(dbUpdates)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
    }

    updates.push("updated_at = NOW()");
    values.push(req.userId);

    const { rows } = await pool.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
    );

    if (!rows[0]) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = rows[0];
    res.json({
        success: true,
        data: {
            emailNotifications: user.email_notifications ?? true,
            smsNotifications: user.sms_notifications ?? false,
            marketingEmails: user.marketing_emails ?? false,
            leadAlerts: user.lead_alerts ?? true,
            automationAlerts: user.automation_alerts ?? true,
            dailyDigest: user.daily_digest ?? false,
            automationEnabled: user.automation_enabled ?? true,
            theme: user.theme || "system",
            timezone: user.timezone || "UTC",
        },
    });
});

module.exports = { getSettings, updateSettings };
