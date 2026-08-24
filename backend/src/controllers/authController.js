const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const userModel = require("../models/userModel");
const passwordResetModel = require("../models/passwordResetModel");
const emailLogModel = require("../models/emailLogModel");
const { sendEmail, buildOtpEmail, sendTestEmail: sendTestEmailService } = require("../services/emailService");
const { asyncHandler } = require("../middleware/errorHandler");

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SECRET_KEY || ""
);

/**
 * POST /api/auth/forgot-password
 * Generates a 6-digit OTP (crypto-safe) and sends it via Resend.
 * If email delivery fails, the OTP row is cleaned up.
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await userModel.getByEmail(normalizedEmail);
    if (!user) {
        // Return success to prevent email enumeration
        return res.json({ success: true, message: "If that email exists, an OTP has been sent." });
    }

    // Invalidate previous active OTPs for this user/email
    await passwordResetModel.invalidateAllForUser(user.email);

    // Generate crypto-safe 6-digit OTP (100000–999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    const otpRecord = await passwordResetModel.create({
        userId: user.id,
        email: user.email,
        otp,
        otpExpiresAt,
    });

    console.log(`[OTP EMAIL] Sending password reset email to ${user.email}`);

    // Send OTP email via Brevo
    let emailLog;
    try {
        emailLog = await emailLogModel.create({
            userId: user.id,
            recipient: user.email,
            subject: "Your LeadFlow AI Password Reset Code",
            status: "pending",
            provider: "brevo"
        });

        const emailHtml = buildOtpEmail(user.first_name, otp);
        const responseData = await sendEmail({
            to: user.email,
            subject: "Your LeadFlow AI Password Reset Code",
            html: emailHtml
        });
        
        await emailLogModel.updateStatus(emailLog.id, "sent", responseData?.id || null, null);
        console.log(`[OTP EMAIL] Brevo accepted email: ${responseData?.id}`);
    } catch (err) {
        if (emailLog) {
            try {
                await emailLogModel.updateStatus(emailLog.id, "failed", null, err.message);
            } catch (updateErr) {
                console.error(`[OTP EMAIL] Failed to update email log status: ${updateErr.message}`);
            }
        }
        console.error(`[OTP EMAIL ERROR] ${err.message}`);

        // Clean up the OTP record since email was never delivered
        try {
            await passwordResetModel.deleteById(otpRecord.id);
            console.log(`[OTP EMAIL] Cleaned up undelivered OTP record ${otpRecord.id}`);
        } catch (cleanupErr) {
            console.error(`[OTP EMAIL] Failed to clean up OTP record: ${cleanupErr.message}`);
        }

        return res.status(500).json({
            success: false,
            message: "Unable to send password reset email. Please try again later."
        });
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

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    const resetRecord = await passwordResetModel.getByEmailAndOtp(normalizedEmail, normalizedOtp);

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

    // Find the correct Supabase Auth user by email, since local DB ID
    // may not match the Supabase Auth UUID
    let supabaseAuthUserId = user.id;

    try {
        const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError && authUsers?.users) {
            const authUser = authUsers.users.find(
                u => u.email?.toLowerCase() === user.email?.toLowerCase()
            );
            if (authUser) {
                supabaseAuthUserId = authUser.id;
                console.log(`[RESET PASSWORD] Found Supabase Auth user: ${authUser.id} for email: ${user.email}`);
            } else {
                console.warn(`[RESET PASSWORD] No Supabase Auth user found for email: ${user.email}`);
                return res.status(404).json({ success: false, message: "User not found in authentication provider" });
            }
        } else if (listError) {
            console.error("[RESET PASSWORD] Failed to list Supabase Auth users:", listError.message);
        }
    } catch (lookupErr) {
        console.error("[RESET PASSWORD] Supabase Auth lookup error:", lookupErr.message);
        // Fall back to local user ID
    }

    // Update password in Supabase Auth securely using Admin API
    const { error } = await supabase.auth.admin.updateUserById(supabaseAuthUserId, {
        password: newPassword
    });

    if (error) {
        console.error("Supabase Auth admin password update failed:", error.message);
        return res.status(500).json({ success: false, message: "Failed to reset password in Auth provider: " + error.message });
    }

    // Expire reset token and invalidate OTP immediately
    await passwordResetModel.update(resetRecord.id, {
        reset_token_expires_at: new Date(0),
    });

    res.json({ success: true, message: "Password updated successfully" });
});

/**
 * POST /api/auth/test-email (development/admin only)
 * Sends a test email to verify Brevo configuration.
 */
const testEmail = asyncHandler(async (req, res) => {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ success: false, message: "Test email endpoint is not available in production" });
    }

    const { email } = req.body;
    if (!email || typeof email !== "string") {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const data = await sendTestEmailService(normalizedEmail);
        res.json({
            success: true,
            message: "Test email sent successfully",
            data: {
                emailId: data.id,
                recipient: normalizedEmail,
            }
        });
    } catch (err) {
        console.error(`[TEST EMAIL ERROR] ${err.message}`);
        res.status(500).json({
            success: false,
            message: `Failed to send test email: ${err.message}`,
        });
    }
});

module.exports = {
    forgotPassword,
    verifyOtp,
    resetPassword,
    testEmail
};
