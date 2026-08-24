const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
    if (!_transporter) {
        const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
        const port = process.env.BREVO_SMTP_PORT || 587;
        const user = process.env.BREVO_SMTP_USER;
        const pass = process.env.BREVO_SMTP_PASSWORD;

        if (!user || !pass) {
            return null;
        }

        _transporter = nodemailer.createTransport({
            host,
            port,
            secure: false, // true for 465, false for other ports
            auth: {
                user,
                pass,
            }
        });
    }
    return _transporter;
}

/**
 * Send an email using Nodemailer and Brevo.
 * @param {Object} options 
 * @param {string} options.to - Recipient email(s)
 * @param {string} [options.cc] - CC email(s)
 * @param {string} [options.bcc] - BCC email(s)
 * @param {string} options.subject - Email subject
 * @param {string} [options.html] - Email HTML body
 * @param {string} [options.text] - Email Plain Text body
 * @param {string} [options.fromEmail] - Custom from email
 * @param {string} [options.fromName] - Custom from name
 */
async function sendEmail({ to, cc, bcc, subject, html, text, fromEmail, fromName }) {
    const transporter = getTransporter();
    if (!transporter) {
        throw new Error("Email service is not configured. Set BREVO_SMTP_USER and BREVO_SMTP_PASSWORD in environment variables.");
    }

    const defaultFromEmail = process.env.BREVO_FROM_EMAIL;
    const defaultFromName = process.env.BREVO_FROM_NAME || "LeadFlow AI";
    
    if (!defaultFromEmail) {
        throw new Error("BREVO_FROM_EMAIL is not configured in environment variables.");
    }

    const senderEmail = fromEmail || defaultFromEmail;
    const senderName = fromName || defaultFromName;
    const fromString = `"${senderName}" <${senderEmail}>`;

    console.log(`[EMAIL] EMAIL_SEND_STARTED`);
    console.log(`[EMAIL] From: ${fromString}`);
    console.log(`[EMAIL] To: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);

    try {
        console.log(`[EMAIL] EMAIL_SMTP_CONNECTED`);
        const mailOptions = {
            from: fromString,
            to,
            subject,
        };

        if (cc) mailOptions.cc = cc;
        if (bcc) mailOptions.bcc = bcc;
        if (html) mailOptions.html = html;
        if (text) mailOptions.text = text;

        console.log(`[EMAIL] EMAIL_SEND_ATTEMPT`);
        const info = await transporter.sendMail(mailOptions);

        // Sanitize the messageId (Nodemailer wraps it in <>)
        let messageId = info.messageId || "";
        if (messageId.startsWith("<") && messageId.endsWith(">")) {
            messageId = messageId.substring(1, messageId.length - 1);
        }

        console.log(`[EMAIL] EMAIL_SEND_ACCEPTED - Message ID: ${messageId}`);
        
        return {
            id: messageId,
            response: info.response
        };
    } catch (err) {
        console.error(`[EMAIL] EMAIL_SEND_FAILED - Failed to send email to ${to}: ${err.message}`);
        
        // Do not leak SMTP credentials to frontend in case of auth error
        if (err.message && (err.message.includes('Invalid login') || err.message.includes('Authentication failed'))) {
             throw new Error("Email service authentication failed. The SMTP user or password might be incorrect, or IP authorization is blocking the connection.");
        }
        throw new Error(`Email delivery failed: ${err.message}`);
    }
}

/**
 * Check SMTP Connection safely without sending an email.
 */
async function checkSmtpConnection() {
    const transporter = getTransporter();
    if (!transporter) {
        return {
            configured: false,
            message: "Email service is not configured. Missing BREVO_SMTP_USER or BREVO_SMTP_PASSWORD."
        };
    }
    
    try {
        await transporter.verify();
        return {
            configured: true,
            provider: "brevo",
            smtpHost: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
            smtpPort: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
            sender: process.env.BREVO_FROM_EMAIL
        };
    } catch (error) {
        console.error("[EMAIL] SMTP Health Check Failed:", error.message);
        let safeError = "Failed to connect to SMTP server";
        if (error.message.includes('Authentication failed')) {
            safeError = "SMTP Authentication failed (Check Credentials or IP Authorization)";
        }
        return {
            configured: false,
            error: safeError
        };
    }
}

/**
 * Send a test email to verify configuration.
 */
async function sendTestEmail(to) {
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #2563EB; margin-top: 0;">LeadFlow AI Email Test</h2>
      <p>This is a test email from LeadFlow AI.</p>
      <p>If you received this email, your email configuration via Brevo is working correctly.</p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">Sent at: ${new Date().toISOString()}</p>
      <br/>
      <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow AI Team</p>
    </div>
    `;

    return sendEmail({
        to,
        subject: "LeadFlow AI Email Test",
        html
    });
}

/**
 * Build the HTML body for a password-reset OTP email.
 */
function buildOtpEmail(firstName, otp) {
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #2563EB 0%, #6C5CE7 100%); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">LeadFlow AI</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Password Reset Request</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #1f2937; font-size: 16px; margin: 0 0 8px;">Hi ${firstName || "there"},</p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          You requested a password reset for your LeadFlow AI account. Use the verification code below to continue:
        </p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: 700; border-radius: 10px; margin: 0 0 24px; color: #1f2937; font-family: 'Courier New', Courier, monospace;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px;">
          ⏱ This code will expire in <strong>10 minutes</strong>.
        </p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
          If you did not request this password reset, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>
      <div style="background-color: #f9fafb; padding: 20px 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #6C5CE7; font-weight: 600; margin: 0; font-size: 14px;">The LeadFlow AI Team</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0;">This is an automated email. Please do not reply.</p>
      </div>
    </div>
    `;
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

function buildApprovalEmail(leadName) {
    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #00D68F; margin-top: 0;">Request Approved!</h2>
      <p>Hi ${leadName},</p>
      <p>Great news! Your lead request has been approved by our team.</p>
      <p>A member of our sales team will reach out to you shortly to discuss next steps.</p>
      <br/>
      <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow Team</p>
    </div>
    `;
}

function buildRejectionEmail(leadName, reason) {
    return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #6b7280; margin-top: 0;">Request Update</h2>
      <p>Hi ${leadName},</p>
      <p>Thank you for your interest. After careful review, we are unable to proceed with your request at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>Please feel free to reach out if you have any questions or would like to discuss further.</p>
      <br/>
      <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow Team</p>
    </div>
    `;
}

/**
 * Check if the email service is properly configured.
 */
function isConfigured() {
    return !!(process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASSWORD && process.env.BREVO_FROM_EMAIL);
}

module.exports = {
    sendEmail,
    sendTestEmail,
    buildOtpEmail,
    buildWelcomeEmail,
    buildFollowUpEmail,
    buildApprovalEmail,
    buildRejectionEmail,
    isConfigured,
    checkSmtpConnection
};
