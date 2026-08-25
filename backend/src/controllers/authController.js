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

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user by email
    const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, first_name, email")
        .eq("email", normalizedEmail)
        .single();

    if (userError || !user) {
        // Return success to prevent email enumeration
        return res.json({ success: true, message: "If that email exists, an OTP has been sent." });
    }

    // 2. Invalidate old active OTPs for this user
    await passwordResetModel.invalidateAllForUser(normalizedEmail);

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 4. Save new OTP
    const otpRecord = await passwordResetModel.create({
        userId: user.id,
        email: user.email,
        otp,
        otpExpiresAt: expiresAt,
    });

    if (!otpRecord) {
        console.error("[AUTH] Failed to save OTP in database");
        return res.status(500).json({ success: false, message: "Internal server error generating OTP" });
    }

    // 5. Create pending email_logs
    const emailLog = await emailLogModel.create({
        userId: user.id,
        recipient: user.email,
        subject: "Your LeadFlow AI Password Reset Code",
        status: "pending",
        provider: "brevo",
    });

    // 6. Send email using our backend emailService
    try {
        const html = buildOtpEmail(user.first_name, otp);
        const result = await sendEmail({
            to: user.email,
            subject: "Your LeadFlow AI Password Reset Code",
            html: html,
        });

        // Update email_logs with success
        if (emailLog) {
            await emailLogModel.updateStatus(emailLog.id, "sent", result?.id || null, null);
        }

        return res.json({
            success: true,
            message: "Password reset code sent successfully"
        });
    } catch (error) {
        console.error("[AUTH] Error sending password reset email:", error.message);
        
        // Clean up OTP since email failed
        await passwordResetModel.update(otpRecord.id, { used: true });

        // Update email_logs
        if (emailLog) {
            await emailLogModel.updateStatus(emailLog.id, "failed", null, error.message);
        }

        return res.status(500).json({ 
            success: false, 
            message: "Unable to send password reset email" 
        });
    }
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
