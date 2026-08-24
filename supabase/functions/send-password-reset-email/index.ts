import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow all or explicitly https://ai-lead-automation-software.vercel.app
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ success: false, message: "Email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Initialize Supabase Client using Service Role to access users securely
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
       console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
       throw new Error("Internal Configuration Error");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Find user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, first_name, email")
      .eq("email", normalizedEmail)
      .single();

    if (userError || !user) {
      // Return success to prevent email enumeration
      return new Response(
        JSON.stringify({ success: true, message: "If that email exists, an OTP has been sent." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Invalidate old active OTPs for this user
    await supabaseAdmin
      .from("password_resets")
      .update({ used: true })
      .eq("email", user.email)
      .eq("used", false);

    // 3. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // 4. Save new OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("password_resets")
      .insert([
        {
          user_id: user.id,
          email: user.email,
          otp,
          otp_expires_at: expiresAt,
        },
      ])
      .select()
      .single();

    if (otpError || !otpRecord) {
      console.error("Failed to insert OTP:", otpError);
      throw new Error("Database error saving OTP");
    }

    // 5. Create pending email_logs
    const { data: emailLog } = await supabaseAdmin
      .from("email_logs")
      .insert([
        {
          user_id: user.id,
          recipient: user.email,
          subject: "Your LeadFlow AI Password Reset Code",
          status: "pending",
          provider: "brevo",
        },
      ])
      .select()
      .single();

    // 6. Send email via Brevo REST API
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      console.error("Missing BREVO_API_KEY");
      throw new Error("Email configuration error");
    }

    const fromEmail = Deno.env.get("BREVO_FROM_EMAIL") || "leadflowai94@gmail.com";
    const fromName = Deno.env.get("BREVO_FROM_NAME") || "LeadFlow AI";

    const emailPayload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: user.email, name: user.first_name || "User" }],
      subject: "Your LeadFlow AI Password Reset Code",
      textContent: `Hello,\n\nWe received a request to reset your LeadFlow AI password.\n\nYour verification code is:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this password reset, you can safely ignore this email.\n\nRegards,\nLeadFlow AI`,
      htmlContent: `<p>Hello,</p><p>We received a request to reset your LeadFlow AI password.</p><p>Your verification code is:</p><h2>${otp}</h2><p>This code will expire in 10 minutes.</p><p>If you did not request this password reset, you can safely ignore this email.</p><p>Regards,<br/>LeadFlow AI</p>`
    };

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "api-key": brevoApiKey
      },
      body: JSON.stringify(emailPayload)
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error("Brevo API Error:", brevoResponse.status, errorText);

      // Clean up OTP since email failed
      await supabaseAdmin.from("password_resets").delete().eq("id", otpRecord.id);

      // Update email_logs
      if (emailLog) {
        await supabaseAdmin
          .from("email_logs")
          .update({ status: "failed", error: "Brevo API returned error" })
          .eq("id", emailLog.id);
      }

      throw new Error("Email delivery failed");
    }

    const brevoData = await brevoResponse.json();
    
    // Update email_logs with success
    if (emailLog) {
      await supabaseAdmin
        .from("email_logs")
        .update({ status: "sent", provider_message_id: brevoData.messageId })
        .eq("id", emailLog.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset code sent successfully",
        messageId: brevoData.messageId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Error in send-password-reset-email:", error.message);
    return new Response(
      JSON.stringify({ success: false, message: "Unable to send password reset email" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
