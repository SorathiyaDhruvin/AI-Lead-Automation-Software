const emailService = require("../services/emailService");
const bulkEmailService = require("../services/bulkEmailService");
const bulkEmailModel = require("../models/bulkEmailModel");
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
        const result = await emailService.sendTestEmail(to);
        res.json({
            success: true,
            message: "Email accepted by Brevo",
            messageId: result.id
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Unable to send email",
            error: err.message
        });
    }
});

/**
 * GET /api/email/health
 * Safe health check for SMTP connection.
 */
const getEmailHealth = asyncHandler(async (req, res) => {
    const status = await emailService.checkSmtpConnection();
    res.json(status);
});

/**
 * POST /api/email/bulk
 * Send bulk emails.
 */
const sendBulkEmail = asyncHandler(async (req, res) => {
    const { recipients, templateId, name } = req.body;
    if (!recipients || !templateId) {
        return res.status(400).json({ success: false, message: "Missing recipients or templateId" });
    }
    const job = await bulkEmailService.startBulkJob(req.userId, recipients, templateId, name);
    res.json({ success: true, job });
});

/**
 * GET /api/email/bulk/:id/progress
 * Get progress of a bulk job.
 */
const getBulkJobProgress = asyncHandler(async (req, res) => {
    const job = await bulkEmailModel.getById(req.params.id);
    if (!job || job.user_id !== req.userId) {
        return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.json({ success: true, job });
});

/**
 * POST /api/email/bulk/:id/retry
 * Retry failed emails in a bulk job.
 */
const retryBulkJob = asyncHandler(async (req, res) => {
    const result = await bulkEmailService.retryFailedEmails(req.params.id, req.userId);
    res.json({ success: true, message: result.message });
});

module.exports = {
    sendTestEmail,
    getEmailHealth,
    sendBulkEmail,
    getBulkJobProgress,
    retryBulkJob
};
