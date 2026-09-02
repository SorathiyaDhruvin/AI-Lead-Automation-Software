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

/**
 * GET /api/email/track/open/:logId
 * Serves a 1x1 transparent PNG pixel and records email open event.
 */
const trackOpen = asyncHandler(async (req, res) => {
    const { logId } = req.params;
    if (logId) {
        const emailLogModel = require("../models/emailLogModel");
        const activityModel = require("../models/activityModel");
        
        emailLogModel.recordOpen(logId).then(log => {
            if (log && log.lead_id) {
                activityModel.create({
                    leadId: log.lead_id,
                    userId: log.user_id,
                    type: "email_opened",
                    description: `Email opened: "${log.subject}" by ${log.recipient}`,
                }).catch(() => {});
            }
        }).catch(err => console.error("Track open error:", err.message));
    }

    // 1x1 transparent PNG gif
    const transparentPixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
    );
    res.writeHead(200, {
        "Content-Type": "image/gif",
        "Content-Length": transparentPixel.length,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    });
    res.end(transparentPixel);
});

/**
 * GET /api/email/track/click/:logId
 * Records link click event and redirects to target URL.
 */
const trackClick = asyncHandler(async (req, res) => {
    const { logId } = req.params;
    const targetUrl = req.query.url;

    if (logId) {
        const emailLogModel = require("../models/emailLogModel");
        const activityModel = require("../models/activityModel");

        emailLogModel.recordClick(logId).then(log => {
            if (log && log.lead_id) {
                activityModel.create({
                    leadId: log.lead_id,
                    userId: log.user_id,
                    type: "email_clicked",
                    description: `Email link clicked: "${log.subject}" by ${log.recipient}`,
                }).catch(() => {});
            }
        }).catch(err => console.error("Track click error:", err.message));
    }

    if (targetUrl && typeof targetUrl === "string") {
        return res.redirect(targetUrl);
    }
    res.redirect("/");
});

module.exports = {
    sendTestEmail,
    getEmailHealth,
    sendBulkEmail,
    getBulkJobProgress,
    retryBulkJob,
    trackOpen,
    trackClick
};

