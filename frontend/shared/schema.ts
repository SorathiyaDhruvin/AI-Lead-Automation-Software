import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";



// Users table for email/password auth
export const usersLegacy = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  phone: text("phone"),
  dob: timestamp("dob"),
  gender: text("gender"),
  language: text("language"),
  occupation: text("occupation"),
  company: text("company"),
  department: text("department"),
  bio: text("bio"),
  country: text("country"),
  state: text("state"),
  city: text("city"),
  postalCode: text("postal_code"),
  streetAddress: text("street_address"),
  linkedin: text("linkedin"),
  github: text("github"),
  portfolio: text("portfolio"),
  twitter: text("twitter"),
  website: text("website"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Password reset tokens and OTPs table
export const passwordResets = pgTable("password_resets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  otpExpiresAt: timestamp("otp_expires_at").notNull(),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  attempts: integer("attempts").notNull().default(0),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Leads table (references usersLegacy for now, since leads are tied to original users)
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  source: text("source").notNull().default("manual"),
  status: text("status").notNull().default("new"),
  aiScore: integer("ai_score"),
  aiCategory: text("ai_category"),
  aiPrediction: text("ai_prediction"),
  aiInsights: text("ai_insights"),
  aiRecommendedAction: text("ai_recommended_action"),
  aiRating: varchar("ai_rating", { length: 50 }),
  aiReason: text("ai_reason"),
  aiStrengths: text("ai_strengths"),
  aiWeaknesses: text("ai_weaknesses"),
  aiRecommendation: text("ai_recommendation"),
  segmentId: varchar("segment_id"),
  notes: text("notes"),
  lastContact: timestamp("last_contact"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Lead segments table
export const segments = pgTable("segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  criteria: text("criteria"),
  color: text("color").notNull().default("#6C5CE7"),
  leadCount: integer("lead_count").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Lead activities table
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Lead notes table (structured per-lead notes with author + timestamp)
export const leadNotes = pgTable("lead_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Lead requests table (users submit requests, admins manage them)
export const leadRequests = pgTable("lead_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  industry: text("industry"),
  budget: text("budget"),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Notifications table (in-app only)
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // lead_created | status_changed | automation_action
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Automation rules table
export const automationRules = pgTable("automation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(), // score_threshold | no_contact_hours
  triggerValue: integer("trigger_value").notNull(),
  actionType: text("action_type").notNull(), // set_priority | send_email
  actionValue: text("action_value").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserLegacySchema = createInsertSchema(usersLegacy).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetSchema = createInsertSchema(passwordResets).omit({
  id: true,
  createdAt: true,
  attempts: true,
  used: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiScore: true,
  aiCategory: true,
  aiPrediction: true,
  aiInsights: true,
  aiRecommendedAction: true,
  aiRating: true,
  aiReason: true,
  aiStrengths: true,
  aiWeaknesses: true,
  aiRecommendation: true,
});

export const insertSegmentSchema = createInsertSchema(segments).omit({
  id: true,
  createdAt: true,
  leadCount: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertLeadNoteSchema = createInsertSchema(leadNotes).omit({
  id: true,
  createdAt: true,
});

export const insertLeadRequestSchema = createInsertSchema(leadRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  adminNotes: true,
  reviewedBy: true,
  reviewedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Name is required").max(200),
  triggerType: z.enum(["score_threshold", "no_contact_hours"], { message: "Invalid trigger type" }),
  triggerValue: z.number().int().min(0).max(9999),
  actionType: z.enum(["set_status", "send_email"], { message: "Invalid action type" }),
  actionValue: z.string().min(1, "Action value is required").max(500),
});

export const updateLeadRequestSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "in_review"]),
  adminNotes: z.string().optional(),
});

// Extended schemas for validation
export const registerSchema = insertUserLegacySchema.extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type InsertUserLegacy = z.infer<typeof insertUserLegacySchema>;
export type UserLegacy = typeof usersLegacy.$inferSelect;
export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertSegment = z.infer<typeof insertSegmentSchema>;
export type Segment = typeof segments.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertLeadNote = z.infer<typeof insertLeadNoteSchema>;
export type LeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadRequest = z.infer<typeof insertLeadRequestSchema>;
export type LeadRequest = typeof leadRequests.$inferSelect;
export type UpdateLeadRequest = z.infer<typeof updateLeadRequestSchema>;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
