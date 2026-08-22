import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL is not configured in environment variables.");
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html
    });

    if (error) {
      console.error(`[email] Resend error for "${subject}" to ${to}:`, error);
      throw new Error(error.message || "Resend email failed");
    }

    console.log(`[email] Sent "${subject}" to ${to}`, data);
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
    throw error;
  }
}

export function buildWelcomeEmail(leadName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0066FF;">Welcome to LeadFlow!</h2>
      <p>Hi ${leadName},</p>
      <p>Thank you for your interest. Our team will be in touch with you shortly.</p>
      <p>In the meantime, feel free to reach out if you have any questions.</p>
      <br/>
      <p style="color: #6C5CE7; font-weight: bold;">The LeadFlow Team</p>
    </div>
  `;
}

export function buildFollowUpEmail(leadName: string, message: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0066FF;">Following Up</h2>
      <p>Hi ${leadName},</p>
      <p>${message}</p>
      <br/>
      <p style="color: #6C5CE7; font-weight: bold;">The LeadFlow Team</p>
    </div>
  `;
}
