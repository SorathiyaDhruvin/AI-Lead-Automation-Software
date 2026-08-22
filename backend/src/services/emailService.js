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
 * Explicitly validates the Resend response including email ID.
 */
async function sendEmail(to, subject, html) {
    const client = getResendClient();
    if (!client) {
        throw new Error("Email service is not configured. Set RESEND_API_KEY in environment variables.");
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
        throw new Error("RESEND_FROM_EMAIL is not configured in environment variables.");
    }

    console.log(`[OTP EMAIL] Sending "${subject}" to ${to}...`);

    try {
        const { data, error } = await client.emails.send({
            from: fromEmail,
            to: [to],
            subject,
            html
        });

        if (error) {
            console.error("[RESEND ERROR]", error);
            throw new Error(error.message || "Resend email failed");
        }

        if (!data || !data.id) {
            throw new Error("Resend did not return an email ID");
        }

        console.log(`[OTP EMAIL] Resend accepted email: ${data.id}`);
        return data;
    } catch (err) {
        console.error(`[OTP EMAIL] Failed to send email to ${to}: ${err.message}`);
        throw err;
    }
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

/**
 * Send a test email to verify Resend configuration.
 * Returns the Resend response data including email ID.
 */
async function sendTestEmail(to) {
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #2563EB; margin-top: 0;">LeadFlow AI Email Test</h2>
      <p>This is a test email from LeadFlow AI.</p>
      <p>If you received this email, your email configuration is working correctly.</p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">Sent at: ${new Date().toISOString()}</p>
      <br/>
      <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow AI Team</p>
    </div>
    `;

    return sendEmail(to, "LeadFlow AI Email Test", html);
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
    sendTestEmail,
    buildOtpEmail,
    buildWelcomeEmail,
    buildFollowUpEmail
};
