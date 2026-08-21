const { Resend } = require('resend');

let _resend = null;

function getResendClient() {
    if (!_resend) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            return null;
        }
        _resend = new Resend(apiKey);
    }
    return _resend;
}

/**
 * Send an email using Resend.
 * Propagates errors instead of swallowing them.
 */
async function sendEmail(to, subject, html) {
    const client = getResendClient();
    if (!client) {
        throw new Error("Email service is not configured. Set RESEND_API_KEY in environment variables.");
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    
    try {
        const { data, error } = await client.emails.send({
            from: fromEmail,
            to,
            subject,
            html
        });

        if (error) {
            console.error("[Email Service] Resend error:", error);
            throw new Error(`Email failed: ${error.message || JSON.stringify(error)}`);
        }

        console.log(`[Email Service] Sent "${subject}" to ${to} successfully. ID: ${data?.id}`);
        return data;
    } catch (err) {
        console.error(`[Email Service] Failed to send email to ${to}:`, err.message);
        throw err;
    }
}

function buildWelcomeEmail(leadName) {
    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #0066FF; margin-top: 0;">Welcome to LeadFlow!</h2>
      <p>Hi ${leadName},</p>
      <p>Thank you for your interest. Our team will be in touch with you shortly.</p>
      <p>In the meantime, feel free to reach out if you have any questions.</p>
      <br/>
      <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow Team</p>
    </div>
    `;
}

function buildFollowUpEmail(leadName, message) {
    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #0066FF; margin-top: 0;">Following Up</h2>
      <p>Hi ${leadName},</p>
      <p>${message}</p>
      <br/>
      <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow Team</p>
    </div>
    `;
}

module.exports = {
    sendEmail,
    buildWelcomeEmail,
    buildFollowUpEmail
};
