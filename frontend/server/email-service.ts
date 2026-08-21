import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject,
      html
    });
    console.log(`[email] Sent "${subject}" to ${to}`, data);
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
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
