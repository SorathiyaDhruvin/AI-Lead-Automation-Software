require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

const host = process.env.BREVO_SMTP_HOST;
const port = process.env.BREVO_SMTP_PORT;
const user = process.env.BREVO_SMTP_USER;
// Use the new password from user prompt
const pass = process.env.BREVO_SMTP_PASSWORD;
const fromEmail = process.env.BREVO_FROM_EMAIL;

console.log({ host, port, user, fromEmail });

const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
        user,
        pass,
    }
});

async function run() {
    try {
        const info = await transporter.sendMail({
            from: `"LeadFlow AI" <${fromEmail}>`,
            to: 'sorathiyadhruvin2005@gmail.com',
            subject: 'Test Email Direct',
            text: 'Hello from Node'
        });
        console.log('Success:', info);
    } catch (err) {
        console.error('Error:', err);
    }
}
run();
