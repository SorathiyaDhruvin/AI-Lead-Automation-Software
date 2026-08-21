import type { Express, Request, Response, RequestHandler } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { generateToken, hashPassword, comparePassword, authMiddleware, adminMiddleware } from "./auth";
import { scoreLead, segmentLeads } from "./ai-service";
import { registerSchema, loginSchema, insertLeadSchema, insertSegmentSchema, insertLeadNoteSchema, insertLeadRequestSchema, updateLeadRequestSchema, insertAutomationRuleSchema } from "@shared/schema";
import { z } from "zod";
import { setupGoogleOAuth } from "./google-oauth";
import { sendEmail, buildWelcomeEmail, buildFollowUpEmail } from "./email-service";
import crypto from "crypto";
import ImageKit from "imagekit";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Google OAuth for native Google Sign-In
  setupGoogleOAuth(app);
  

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return 200 even if user not found to prevent email enumeration
        return res.status(200).json({ message: "If that email exists, an OTP has been sent." });
      }

      // Generate 6 digit OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createPasswordReset({
        userId: user.id,
        email: user.email,
        otp,
        otpExpiresAt,
      });

      // Send Email
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563EB;">Password Reset Request</h2>
          <p>Hi ${user.firstName},</p>
          <p>You requested a password reset. Here is your 6-digit verification code:</p>
          <div style="background-color: #f3f4f6; padding: 16px; text-align: center; font-size: 24px; letter-spacing: 4px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `;
      await sendEmail(user.email, "Your Password Reset Code", emailHtml);
      // In a real environment without SMTP, this will just log to console.

      res.status(200).json({ message: "If that email exists, an OTP has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const resetRecord = await storage.getPasswordResetByEmailAndOtp(email, otp);

      if (!resetRecord) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      if (resetRecord.used) {
        return res.status(400).json({ message: "OTP has already been used" });
      }

      if (new Date() > new Date(resetRecord.otpExpiresAt)) {
        return res.status(400).json({ message: "OTP has expired" });
      }

      // Valid OTP. Generate a reset token
      const resetToken = crypto.randomUUID();
      const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins for reset token

      await storage.updatePasswordReset(resetRecord.id, {
        used: true, // Mark OTP as used
        resetToken,
        resetTokenExpiresAt,
      });

      res.status(200).json({ resetToken });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Invalid request or password too short (min 8 characters)" });
      }

      const resetRecord = await storage.getPasswordResetByToken(token);

      if (!resetRecord || !resetRecord.resetTokenExpiresAt) {
        return res.status(400).json({ message: "Invalid reset token" });
      }

      if (new Date() > new Date(resetRecord.resetTokenExpiresAt)) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      const user = await storage.getUser(resetRecord.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });

      // Invalidate the reset token by expiring it
      await storage.updatePasswordReset(resetRecord.id, {
        resetTokenExpiresAt: new Date(0), // expire immediately
      });

      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });


  // Dashboard routes
  app.get("/api/dashboard/stats", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const [stats, segments, dailyTrend] = await Promise.all([
        storage.getLeadStats(userId),
        storage.getSegmentsByUser(userId),
        storage.getDailyLeadStats(userId, 7),
      ]);
      
      const conversionRate = stats.total > 0
        ? Math.round(((stats.statusCounts.won || 0) / stats.total) * 100)
        : 0;

      // Normalize status counts — always include all statuses with zero default
      const allStatuses = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
      const normalizedStatusCounts: Record<string, number> = {};
      for (const s of allStatuses) {
        normalizedStatusCounts[s] = stats.statusCounts[s] || 0;
      }

      res.json({
        totalLeads: stats.total,
        hotLeads: stats.hot,
        segments: segments.length,
        avgScore: stats.avgScore,
        conversionRate,
        statusCounts: normalizedStatusCounts,
        dailyTrend,
        leadsTrend: 0,
        scoreTrend: 0,
      });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Lead routes
  app.get("/api/leads", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const limit = req.query.limit ? parseInt(String(req.query.limit)) : undefined;
      const filters = {
        search: req.query.search ? String(req.query.search) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        minScore: req.query.minScore ? parseInt(String(req.query.minScore)) : undefined,
        maxScore: req.query.maxScore ? parseInt(String(req.query.maxScore)) : undefined,
        dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
        dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
      };
      const leads = await storage.getLeadsByUser(userId, limit, filters);
      res.json(leads);
    } catch (error) {
      console.error("Get leads error:", error);
      res.status(500).json({ message: "Failed to get leads" });
    }
  });

  // CSV Export — must be registered BEFORE /api/leads/:id to avoid param collision
  app.get("/api/leads/export", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const filters = {
        search: req.query.search ? String(req.query.search) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        minScore: req.query.minScore ? parseInt(String(req.query.minScore)) : undefined,
        maxScore: req.query.maxScore ? parseInt(String(req.query.maxScore)) : undefined,
        dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
        dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
      };
      const userLeads = await storage.getLeadsByUser(userId, undefined, filters);

      const header = "name,email,company,phone,source,status,ai_score,ai_category,created_at";
      const rows = userLeads.map((l) => [
        `"${(l.name || "").replace(/"/g, '""')}"`,
        `"${(l.email || "").replace(/"/g, '""')}"`,
        `"${(l.company || "").replace(/"/g, '""')}"`,
        `"${(l.phone || "").replace(/"/g, '""')}"`,
        `"${(l.source || "").replace(/"/g, '""')}"`,
        `"${(l.status || "").replace(/"/g, '""')}"`,
        l.aiScore ?? "",
        `"${(l.aiCategory || "").replace(/"/g, '""')}"`,
        `"${new Date(l.createdAt).toISOString().slice(0, 10)}"`,
      ].join(","));

      const csv = [header, ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="leads-export-${Date.now()}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ message: "Failed to export leads" });
    }
  });

  app.get("/api/leads/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const lead = await storage.getLead((req.params.id as string));
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Get lead error:", error);
      res.status(500).json({ message: "Failed to get lead" });
    }
  });

  app.post("/api/leads", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const data = insertLeadSchema.parse({ ...req.body, userId });
      const lead = await storage.createLead(data);
      // Auto-log creation activity
      await storage.createActivity({
        leadId: lead.id,
        userId,
        type: "lead_created",
        description: `Lead created from ${lead.source} source`,
      }).catch((err) => console.error("Activity logging error:", err));
      // Create in-app notification
      storage.createNotification({
        userId,
        type: "lead_created",
        message: `New lead added: ${lead.name} (${lead.email})`,
        isRead: false,
      }).catch((err) => console.error("Notification error:", err));
      // Send welcome email (fire-and-forget, never block response)
      sendEmail(lead.email, "Welcome to LeadFlow!", buildWelcomeEmail(lead.name)).catch((err) =>
        console.error("Welcome email error:", err)
      );
      res.status(201).json(lead);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create lead error:", error);
      const message = error.message || "Failed to create lead";
      // Send a safe error message without exposing full stack trace
      res.status(500).json({ message: `Failed to create lead: ${message}` });
    }
  });

  app.put("/api/leads/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const leadId = (req.params.id as string) as string;
      const existing = await storage.getLead(leadId);
      if (!existing) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const lead = await storage.updateLead(leadId, req.body);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      // Auto-log status change activity + notification
      if (req.body.status && req.body.status !== existing.status) {
        await storage.createActivity({
          leadId: lead.id,
          userId,
          type: "status_changed",
          description: `Status changed from "${existing.status}" to "${lead.status}"`,
        });
        storage.createNotification({
          userId,
          type: "status_changed",
          message: `${existing.name} moved to "${lead!.status}"`,
          isRead: false,
        }).catch((err) => console.error("Notification error:", err));
      }
      res.json(lead);
    } catch (error) {
      console.error("Update lead error:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      await storage.deleteLead((req.params.id as string));
      res.status(204).send();
    } catch (error) {
      console.error("Delete lead error:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // AI Scoring route
  app.post("/api/leads/:id/score", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const lead = await storage.getLead((req.params.id as string));
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Verify the lead belongs to the authenticated user
      if (lead.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const result = await scoreLead(lead);
      
      const updatedLead = await storage.updateLead(lead.id, {
        aiScore: result.score,
        aiCategory: result.category,
        aiPrediction: result.prediction,
        aiInsights: result.insights,
        aiRecommendedAction: result.recommendedAction,
      });

      // Auto-log scoring activity
      await storage.createActivity({
        leadId: lead.id,
        userId,
        type: "scored",
        description: `AI score updated to ${result.score}/100 (${result.category})`,
      });

      res.json(updatedLead);
    } catch (error) {
      console.error("Score lead error:", error);
      res.status(500).json({ message: "Failed to score lead" });
    }
  });

  // Lead notes routes
  app.get("/api/leads/:id/notes", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const lead = await storage.getLead((req.params.id as string));
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.userId !== userId) return res.status(403).json({ message: "Access denied" });
      const notes = await storage.getNotesByLead((req.params.id as string));
      res.json(notes);
    } catch (error) {
      console.error("Get notes error:", error);
      res.status(500).json({ message: "Failed to get notes" });
    }
  });

  app.post("/api/leads/:id/notes", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const lead = await storage.getLead((req.params.id as string));
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (lead.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const data = insertLeadNoteSchema.parse({ leadId: (req.params.id as string), userId, text: req.body.text });
      const note = await storage.createNote(data);
      // Auto-log note activity
      await storage.createActivity({
        leadId: (req.params.id as string),
        userId,
        type: "note_added",
        description: req.body.text.length > 80 ? req.body.text.slice(0, 80) + "…" : req.body.text,
      });
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create note error:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  // Manual email endpoint
  app.post("/api/leads/:id/send-email", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const lead = await storage.getLead((req.params.id as string));
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.userId !== userId) return res.status(403).json({ message: "Access denied" });

      const emailPayloadSchema = z.object({
        subject: z.string().min(1, "Subject is required").max(300),
        message: z.string().min(1, "Message is required").max(5000),
      });
      const parsed = emailPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { subject, message } = parsed.data;

      await sendEmail(lead.email, subject, buildFollowUpEmail(lead.name, message));

      await storage.createActivity({
        leadId: lead.id,
        userId,
        type: "email",
        description: `Follow-up email sent: "${subject}"`,
      });

      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error("Send email error:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Lead activity route
  app.get("/api/leads/:id/activity", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const lead = await storage.getLead((req.params.id as string));
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.userId !== userId) return res.status(403).json({ message: "Access denied" });
      const activities = await storage.getActivitiesByLead((req.params.id as string));
      res.json(activities);
    } catch (error) {
      console.error("Get activity error:", error);
      res.status(500).json({ message: "Failed to get activity" });
    }
  });

  // Automation rules routes
  app.get("/api/automation/rules", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const rules = await storage.getAutomationRulesByUser(userId);
      res.json(rules);
    } catch (error) {
      console.error("Get automation rules error:", error);
      res.status(500).json({ message: "Failed to get automation rules" });
    }
  });

  app.post("/api/automation/rules", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const data = insertAutomationRuleSchema.parse({ ...req.body, userId });
      const existing = await storage.getAutomationRulesByUser(userId);
      const duplicate = existing.find(
        (r) => r.name.trim().toLowerCase() === data.name.trim().toLowerCase()
      );
      if (duplicate) {
        return res.status(409).json({ message: `A rule named "${data.name}" already exists. Please use a different name.` });
      }
      const rule = await storage.createAutomationRule(data);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create automation rule error:", error);
      res.status(500).json({ message: "Failed to create automation rule" });
    }
  });

  app.delete("/api/automation/rules/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const deleted = await storage.deleteAutomationRule((req.params.id as string), userId);
      if (!deleted) return res.status(404).json({ message: "Rule not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Delete automation rule error:", error);
      res.status(500).json({ message: "Failed to delete automation rule" });
    }
  });

  app.patch("/api/automation/rules/:id/toggle", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { isActive } = req.body;
      const rule = await storage.toggleAutomationRule((req.params.id as string), Boolean(isActive), userId);
      if (!rule) return res.status(404).json({ message: "Rule not found" });
      res.json(rule);
    } catch (error) {
      console.error("Toggle automation rule error:", error);
      res.status(500).json({ message: "Failed to toggle automation rule" });
    }
  });

  // Segment routes
  app.get("/api/segments", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const segments = await storage.getSegmentsByUser(userId);
      res.json(segments);
    } catch (error) {
      console.error("Get segments error:", error);
      res.status(500).json({ message: "Failed to get segments" });
    }
  });

  app.post("/api/segments", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const data = insertSegmentSchema.parse({ ...req.body, userId });
      const existing = await storage.getSegmentsByUser(userId);
      const duplicate = existing.find(
        (s) => s.name.trim().toLowerCase() === data.name.trim().toLowerCase()
      );
      if (duplicate) {
        return res.status(409).json({ message: `A segment named "${data.name}" already exists.` });
      }
      const segment = await storage.createSegment(data);
      res.status(201).json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create segment error:", error);
      res.status(500).json({ message: "Failed to create segment" });
    }
  });

  app.patch("/api/segments/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const segment = await storage.updateSegment((req.params.id as string), req.body);
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }
      res.json(segment);
    } catch (error) {
      console.error("Update segment error:", error);
      res.status(500).json({ message: "Failed to update segment" });
    }
  });

  app.delete("/api/segments/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      await storage.deleteSegment((req.params.id as string));
      res.status(204).send();
    } catch (error) {
      console.error("Delete segment error:", error);
      res.status(500).json({ message: "Failed to delete segment" });
    }
  });

  // AI Auto-segmentation route
  app.post("/api/segments/auto-segment", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const leads = await storage.getLeadsByUser(userId);
      
      if (leads.length === 0) {
        return res.status(400).json({ message: "No leads to segment" });
      }

      const segmentResults = await segmentLeads(leads);
      
      // Create segments and assign leads
      const createdSegments = new Map<string, string>();
      
      for (const [leadId, segmentInfo] of segmentResults) {
        if (!createdSegments.has(segmentInfo.segmentName)) {
          const segment = await storage.createSegment({
            userId,
            name: segmentInfo.segmentName,
            description: segmentInfo.description,
            color: segmentInfo.segmentColor,
          });
          createdSegments.set(segmentInfo.segmentName, segment.id);
        }
        
        const segmentId = createdSegments.get(segmentInfo.segmentName);
        if (segmentId) {
          await storage.updateLead(leadId, { segmentId });
        }
      }

      // Update lead counts
      for (const segmentId of createdSegments.values()) {
        await storage.updateSegmentLeadCount(segmentId);
      }

      const segments = await storage.getSegmentsByUser(userId);
      res.json(segments);
    } catch (error) {
      console.error("Auto-segment error:", error);
      res.status(500).json({ message: "Failed to auto-segment leads" });
    }
  });

  // Insights route
  app.post("/api/insights/generate", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const leads = await storage.getLeadsByUser(userId);
      
      // Score any unscored leads
      for (const lead of leads) {
        if (lead.aiScore === null) {
          try {
            const result = await scoreLead(lead);
            await storage.updateLead(lead.id, {
              aiScore: result.score,
              aiPrediction: result.prediction,
              aiInsights: result.insights,
            });
          } catch (error) {
            console.error(`Failed to score lead ${lead.id}:`, error);
          }
        }
      }

      res.json({ message: "Insights generated successfully" });
    } catch (error) {
      console.error("Generate insights error:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // Lead Request routes (user-facing)
  app.get("/api/lead-requests", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const requests = await storage.getLeadRequestsByUser(userId);
      res.json(requests);
    } catch (error) {
      console.error("Get lead requests error:", error);
      res.status(500).json({ message: "Failed to get lead requests" });
    }
  });

  app.post("/api/lead-requests", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const data = insertLeadRequestSchema.parse({ ...req.body, userId });
      const request = await storage.createLeadRequest(data);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create lead request error:", error);
      res.status(500).json({ message: "Failed to create lead request" });
    }
  });

  app.get("/api/lead-requests/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const request = await storage.getLeadRequest((req.params.id as string));
      
      if (!request) {
        return res.status(404).json({ message: "Lead request not found" });
      }
      
      // Users can only view their own requests
      if (request.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Get lead request error:", error);
      res.status(500).json({ message: "Failed to get lead request" });
    }
  });

  // Admin routes (protected by adminMiddleware)
  app.get("/api/admin/lead-requests", adminMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const requests = await storage.getAllLeadRequests();
      res.json(requests);
    } catch (error) {
      console.error("Admin get lead requests error:", error);
      res.status(500).json({ message: "Failed to get lead requests" });
    }
  });

  app.patch("/api/admin/lead-requests/:id", adminMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).userId;
      const data = updateLeadRequestSchema.parse(req.body);
      
      const request = await storage.getLeadRequest((req.params.id as string));
      if (!request) {
        return res.status(404).json({ message: "Lead request not found" });
      }

      const updated = await storage.updateLeadRequest((req.params.id as string), {
        ...data,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Admin update lead request error:", error);
      res.status(500).json({ message: "Failed to update lead request" });
    }
  });

  app.get("/api/admin/stats", adminMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const requests = await storage.getAllLeadRequests();
      const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === "pending").length,
        approved: requests.filter(r => r.status === "approved").length,
        rejected: requests.filter(r => r.status === "rejected").length,
        inReview: requests.filter(r => r.status === "in_review").length,
      };
      res.json(stats);
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to get admin stats" });
    }
  });

  // Notification routes
  app.get("/api/notifications", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const notifs = await storage.getNotificationsByUser(userId, 50);
      const unreadCount = await storage.getUnreadNotificationCount(userId);
      res.json({ notifications: notifs, unreadCount });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const notif = await storage.markNotificationRead((req.params.id as string), userId);
      if (!notif) return res.status(404).json({ message: "Notification not found" });
      res.json(notif);
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      await storage.markAllNotificationsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all read error:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // CSV Import route
  app.post("/api/leads/import", authMiddleware as RequestHandler, upload.single("file"), async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const text = req.file.buffer.toString("utf-8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV must have a header row and at least one data row" });
      }

      const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else { inQuotes = !inQuotes; }
          } else if (ch === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headerRow = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
      const idx = (name: string) => headerRow.indexOf(name);

      let created = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = parseRow(lines[i]);
        const name = row[idx("name")] || "";
        const email = row[idx("email")] || "";
        const company = row[idx("company")] || undefined;
        const phone = row[idx("phone")] || undefined;
        const source = row[idx("source")] || "csv_import";

        if (!name || !email) {
          errors.push(`Row ${i + 1}: missing required name or email`);
          continue;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`Row ${i + 1}: invalid email "${email}"`);
          continue;
        }

        try {
          const lead = await storage.createLead({ userId, name, email, company, phone, source });
          await storage.createActivity({
            leadId: lead.id,
            userId,
            type: "lead_created",
            description: `Lead imported from CSV`,
          });
          created++;
        } catch {
          errors.push(`Row ${i + 1}: failed to create lead for "${email}"`);
        }
      }

      // Create a summary notification
      if (created > 0) {
        storage.createNotification({
          userId,
          type: "lead_created",
          message: `CSV import: ${created} lead${created !== 1 ? "s" : ""} imported successfully`,
          isRead: false,
        }).catch(() => {});
      }

      res.json({ created, failed: errors.length, errors: errors.slice(0, 20) });
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ message: "Failed to import CSV" });
    }
  });

  return httpServer;
}
