import type { Express, Request, Response, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateToken, hashPassword, comparePassword, authMiddleware, adminMiddleware } from "./auth";
import { scoreLead, segmentLeads } from "./ai-service";
import { registerSchema, loginSchema, insertLeadSchema, insertSegmentSchema, insertLeadRequestSchema, updateLeadRequestSchema } from "@shared/schema";
import { z } from "zod";
import { setupGoogleOAuth } from "./google-oauth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Google OAuth for native Google Sign-In
  setupGoogleOAuth(app);
  
  // Auth routes (email/password)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: "user",
      });

      const token = generateToken(user);
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({ token, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await comparePassword(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = generateToken(user);
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.patch("/api/auth/profile", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { name, email } = req.body;
      
      const user = await storage.updateUser(userId, { name, email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/auth/password", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { currentPassword, newPassword } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validPassword = await comparePassword(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ message: "Failed to update password" });
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

      res.json({
        totalLeads: stats.total,
        hotLeads: stats.hot,
        segments: segments.length,
        avgScore: stats.avgScore,
        conversionRate,
        statusCounts: stats.statusCounts,
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const leads = await storage.getLeadsByUser(userId, limit);
      res.json(leads);
    } catch (error) {
      console.error("Get leads error:", error);
      res.status(500).json({ message: "Failed to get leads" });
    }
  });

  app.get("/api/leads/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const lead = await storage.getLead(req.params.id);
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
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Create lead error:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch("/api/leads/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      const lead = await storage.updateLead(req.params.id, req.body);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Update lead error:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", authMiddleware as RequestHandler, async (req: Request, res: Response) => {
    try {
      await storage.deleteLead(req.params.id);
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
      const lead = await storage.getLead(req.params.id);
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

      res.json(updatedLead);
    } catch (error) {
      console.error("Score lead error:", error);
      res.status(500).json({ message: "Failed to score lead" });
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
      const segment = await storage.updateSegment(req.params.id, req.body);
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
      await storage.deleteSegment(req.params.id);
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
      const request = await storage.getLeadRequest(req.params.id);
      
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
      
      const request = await storage.getLeadRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Lead request not found" });
      }

      const updated = await storage.updateLeadRequest(req.params.id, {
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

  return httpServer;
}
