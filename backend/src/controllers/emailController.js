const emailService = require("../services/emailService");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * POST /api/email/test
 * Send a test email to verify Brevo configuration.
 */
const sendTestEmail = asyncHandler(async (req, res) => {
    const { to } = req.body;

    if (!to) {
        return res.status(400).json({ success: false, message: "Recipient email is required" });
    }

    try {
        await emailService.sendTestEmail(to);
        res.json({
            success: true,
            message: "Test email sent successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Unable to send email",
            error: err.message
        });
    }
});

module.exports = {
    sendTestEmail
};
