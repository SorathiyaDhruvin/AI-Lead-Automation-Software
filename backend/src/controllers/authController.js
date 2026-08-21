const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const userModel = require("../models/userModel");
const passwordResetModel = require("../models/passwordResetModel");
const { sendEmail } = require("../services/emailService");
const { asyncHandler } = require("../middleware/errorHandler");

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SECRET_KEY || ""
);

/**
 * POST /api/auth/forgot-password
 * Generates an OTP and sends it via Resend.
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await userModel.getByEmail(email.trim().toLowerCase());
    if (!user) {
        // Return success to prevent email enumeration
        return res.json({ success: true, message: "If that email exists, an OTP has been sent." });
    }

    // Generate 6 digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await passwordResetModel.create({
        userId: user.id,
        email: user.email,
        otp,
        otpExpiresAt,
    });

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #2563EB; margin-top: 0;">Password Reset Request</h2>
        <p>Hi ${user.first_name || "there"},</p>
        <p>You requested a password reset. Here is your 6-digit verification code:</p>
        <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 24px; letter-spacing: 4px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        <br/>
        <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow Team</p>
      </div>
    `;

    try {
        await sendEmail(user.email, "Your Password Reset Code", emailHtml);
    } catch (err) {
        console.error("Failed to send OTP email:", err.message);
        // Do not crash, still report success to prevent enumeration
    }

    res.json({ success: true, message: "If that email exists, an OTP has been sent." });
});

/**
 * POST /api/auth/verify-otp
 * Verifies OTP and returns a secure, short-lived reset token.
 */
const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const resetRecord = await passwordResetModel.getByEmailAndOtp(email.trim().toLowerCase(), otp.trim());

    if (!resetRecord) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    if (resetRecord.used) {
        return res.status(400).json({ success: false, message: "OTP has already been used" });
    }

    if (new Date() > new Date(resetRecord.otp_expires_at)) {
        return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    const resetToken = crypto.randomUUID();
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await passwordResetModel.update(resetRecord.id, {
        used: true,
        reset_token: resetToken,
        reset_token_expires_at: resetTokenExpiresAt,
    });

    res.json({ success: true, data: { resetToken } });
});

/**
 * POST /api/auth/reset-password
 * Resets the password in Supabase Auth using Supabase Admin API.
 */
const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Invalid request or password too short (min 8 characters)" });
    }

    const resetRecord = await passwordResetModel.getByToken(token);

    if (!resetRecord || !resetRecord.reset_token_expires_at) {
        return res.status(400).json({ success: false, message: "Invalid reset token" });
    }

    if (new Date() > new Date(resetRecord.reset_token_expires_at)) {
        return res.status(400).json({ success: false, message: "Reset token has expired" });
    }

    const user = await userModel.getById(resetRecord.user_id);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update password in Supabase Auth securely using Admin API
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
    });

    if (error) {
        console.error("Supabase Auth admin password update failed:", error.message);
        return res.status(500).json({ success: false, message: "Failed to reset password in Auth provider: " + error.message });
    }

    // Expire reset token immediately
    await passwordResetModel.update(resetRecord.id, {
        reset_token_expires_at: new Date(0),
    });

    res.json({ success: true, message: "Password updated successfully" });
});

module.exports = {
    forgotPassword,
    verifyOtp,
    resetPassword
};
