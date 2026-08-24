const bulkEmailModel = require("../models/bulkEmailModel");
const emailLogModel = require("../models/emailLogModel");
const emailTemplateModel = require("../models/emailTemplateModel");
const leadModel = require("../models/leadModel");
const emailService = require("./emailService");
const pool = require("../config/db");

// Regex for basic email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bulkEmailService = {
    /**
     * Start a new bulk email job.
     * @param {string} userId - ID of the user starting the job
     * @param {Array} recipients - Array of recipient objects: { email, leadId (optional) }
     * @param {string} templateId - ID of the email template
     * @param {string} name - Optional name for the campaign
     */
    async startBulkJob(userId, recipients, templateId, name) {
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            throw new Error("No recipients provided");
        }

        // Validate and deduplicate emails
        const validEmails = new Map();
        for (const r of recipients) {
            const email = (r.email || "").trim().toLowerCase();
            if (email && emailRegex.test(email)) {
                if (!validEmails.has(email)) {
                    validEmails.set(email, r);
                }
            }
        }

        const uniqueRecipients = Array.from(validEmails.values());
        if (uniqueRecipients.length === 0) {
            throw new Error("No valid recipient emails found");
        }

        const template = await emailTemplateModel.getById(userId, templateId);
        if (!template) {
            throw new Error("Template not found");
        }

        // Create the job record
        const job = await bulkEmailModel.create({
            userId,
            name,
            totalRecipients: uniqueRecipients.length
        });

        // Insert pending email logs in a single transaction for speed
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const r of uniqueRecipients) {
                const leadId = r.leadId || null;
                const email = r.email.trim();
                await client.query(
                    `INSERT INTO email_logs (bulk_job_id, user_id, lead_id, recipient, subject, template_id, provider, status, sent_at)
                     VALUES ($1, $2, $3, $4, $5, $6, 'brevo', 'pending', NOW())`,
                    [job.id, userId, leadId, email, template.subject, template.id]
                );
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        await bulkEmailModel.updateStatus(job.id, "processing");

        // Start processing asynchronously in the background
        this.processBulkJob(job.id, userId, template).catch(err => {
            console.error(`[BULK EMAIL] Unhandled error processing job ${job.id}:`, err);
        });

        return job;
    },

    /**
     * Process a bulk job in the background with batching and rate limiting.
     */
    async processBulkJob(jobId, userId, template) {
        console.log(`[BULK EMAIL] Starting processing for job ${jobId}`);
        
        let sentCount = 0;
        let failedCount = 0;
        const BATCH_SIZE = 5; // Safe batch size
        const DELAY_MS = 1000; // 1 second delay between batches

        try {
            while (true) {
                // Fetch next batch of pending emails for this job
                const { rows: pendingLogs } = await pool.query(
                    `SELECT * FROM email_logs WHERE bulk_job_id = $1 AND status = 'pending' LIMIT $2`,
                    [jobId, BATCH_SIZE]
                );

                if (pendingLogs.length === 0) {
                    break; // No more pending emails
                }

                console.log(`[BULK EMAIL] Job ${jobId}: Processing batch of ${pendingLogs.length}`);

                // Process batch concurrently
                await Promise.all(pendingLogs.map(async (log) => {
                    let lead = null;
                    if (log.lead_id) {
                        lead = await leadModel.getById(log.lead_id);
                    }

                    // Prepare interpolation variables
                    const nameParts = lead?.name ? lead.name.split(" ") : [];
                    const firstName = nameParts[0] || "";
                    const lastName = nameParts.slice(1).join(" ") || "";

                    const vars = {
                        "firstName": firstName,
                        "lastName": lastName,
                        "email": log.recipient || lead?.email || "",
                        "company": lead?.company || "",
                        "phone": lead?.phone || "",
                        "lead.name": lead?.name || "",
                        "lead.email": lead?.email || log.recipient,
                        "lead.company": lead?.company || "N/A",
                    };

                    const renderedBody = emailTemplateModel.renderTemplate(template, vars);
                    
                    // Simple subject interpolation
                    let renderedSubject = template.subject;
                    Object.keys(vars).forEach(key => {
                        const regex = new RegExp(`{{${key}}}`, "g");
                        renderedSubject = renderedSubject.replace(regex, vars[key] || "");
                    });

                    try {
                        const result = await emailService.sendEmail({
                            to: log.recipient,
                            subject: renderedSubject,
                            html: renderedBody
                        });
                        await emailLogModel.updateStatus(log.id, "sent", result.id, null);
                        sentCount++;
                    } catch (err) {
                        await emailLogModel.updateStatus(log.id, "failed", null, err.message);
                        failedCount++;
                    }
                }));

                // Update job progress
                await bulkEmailModel.updateCounts(jobId, sentCount, failedCount);

                // Rate limiting delay
                await new Promise(r => setTimeout(r, DELAY_MS));
            }

            await bulkEmailModel.updateStatus(jobId, "completed");
            console.log(`[BULK EMAIL] Completed job ${jobId} (Sent: ${sentCount}, Failed: ${failedCount})`);
        } catch (err) {
            console.error(`[BULK EMAIL] Job ${jobId} failed completely:`, err);
            await bulkEmailModel.updateStatus(jobId, "failed");
        }
    },

    /**
     * Retry failed emails for a given bulk job.
     */
    async retryFailedEmails(jobId, userId) {
        const job = await bulkEmailModel.getById(jobId);
        if (!job || job.user_id !== userId) throw new Error("Job not found");

        const { rows } = await pool.query(
            `UPDATE email_logs SET status = 'pending', error = null 
             WHERE bulk_job_id = $1 AND status = 'failed' 
             RETURNING template_id`,
            [jobId]
        );

        if (rows.length === 0) return { message: "No failed emails to retry" };

        const template = await emailTemplateModel.getById(userId, rows[0].template_id);
        
        await bulkEmailModel.updateStatus(jobId, "processing");
        
        this.processBulkJob(jobId, userId, template).catch(err => {
            console.error(`[BULK EMAIL] Unhandled error retrying job ${jobId}:`, err);
        });

        return { message: `Retrying ${rows.length} emails` };
    }
};

module.exports = bulkEmailService;
