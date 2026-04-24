import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transport = createTransport();

  if (!transport) {
    console.log(`[email] SMTP not configured — would have sent to ${to}`);
    console.log(`[email] Subject: ${subject}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  console.log(`[email] Sent "${subject}" to ${to}`);
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
