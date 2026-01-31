import { db } from "./db";
import { usersLegacy, leads, segments, activities, leadRequests } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { InsertUserLegacy, UserLegacy, InsertLead, Lead, InsertSegment, Segment, InsertActivity, Activity, InsertLeadRequest, LeadRequest } from "@shared/schema";

export interface IStorage {
  // User methods (for legacy email/password auth)
  getUser(id: string): Promise<UserLegacy | undefined>;
  getUserByEmail(email: string): Promise<UserLegacy | undefined>;
  createUser(user: InsertUserLegacy): Promise<UserLegacy>;
  updateUser(id: string, updates: Partial<UserLegacy>): Promise<UserLegacy | undefined>;

  // Lead methods
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsByUser(userId: string, limit?: number): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<void>;
  getLeadStats(userId: string): Promise<{ total: number; hot: number; avgScore: number }>;

  // Segment methods
  getSegment(id: string): Promise<Segment | undefined>;
  getSegmentsByUser(userId: string): Promise<Segment[]>;
  createSegment(segment: InsertSegment): Promise<Segment>;
  updateSegment(id: string, updates: Partial<Segment>): Promise<Segment | undefined>;
  deleteSegment(id: string): Promise<void>;
  updateSegmentLeadCount(segmentId: string): Promise<void>;

  // Activity methods
  getActivitiesByLead(leadId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Lead request methods
  getLeadRequest(id: string): Promise<LeadRequest | undefined>;
  getLeadRequestsByUser(userId: string): Promise<LeadRequest[]>;
  getAllLeadRequests(): Promise<LeadRequest[]>;
  createLeadRequest(request: InsertLeadRequest): Promise<LeadRequest>;
  updateLeadRequest(id: string, updates: Partial<LeadRequest>): Promise<LeadRequest | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods (legacy email/password auth)
  async getUser(id: string): Promise<UserLegacy | undefined> {
    const [user] = await db.select().from(usersLegacy).where(eq(usersLegacy.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<UserLegacy | undefined> {
    const [user] = await db.select().from(usersLegacy).where(eq(usersLegacy.email, email));
    return user;
  }

  async createUser(insertUser: InsertUserLegacy): Promise<UserLegacy> {
    const [user] = await db.insert(usersLegacy).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UserLegacy>): Promise<UserLegacy | undefined> {
    const [user] = await db.update(usersLegacy).set(updates).where(eq(usersLegacy.id, id)).returning();
    return user;
  }

  // Lead methods
  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadsByUser(userId: string, limit?: number): Promise<Lead[]> {
    const query = db
      .select()
      .from(leads)
      .where(eq(leads.userId, userId))
      .orderBy(desc(leads.createdAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  async getLeadStats(userId: string): Promise<{ total: number; hot: number; avgScore: number }> {
    const userLeads = await db.select().from(leads).where(eq(leads.userId, userId));
    const total = userLeads.length;
    const scoredLeads = userLeads.filter((l) => l.aiScore !== null);
    const hot = userLeads.filter((l) => (l.aiScore || 0) >= 70).length;
    const avgScore = scoredLeads.length > 0
      ? Math.round(scoredLeads.reduce((acc, l) => acc + (l.aiScore || 0), 0) / scoredLeads.length)
      : 0;
    return { total, hot, avgScore };
  }

  // Segment methods
  async getSegment(id: string): Promise<Segment | undefined> {
    const [segment] = await db.select().from(segments).where(eq(segments.id, id));
    return segment;
  }

  async getSegmentsByUser(userId: string): Promise<Segment[]> {
    return db.select().from(segments).where(eq(segments.userId, userId));
  }

  async createSegment(insertSegment: InsertSegment): Promise<Segment> {
    const [segment] = await db.insert(segments).values(insertSegment).returning();
    return segment;
  }

  async updateSegment(id: string, updates: Partial<Segment>): Promise<Segment | undefined> {
    const [segment] = await db.update(segments).set(updates).where(eq(segments.id, id)).returning();
    return segment;
  }

  async deleteSegment(id: string): Promise<void> {
    await db.delete(segments).where(eq(segments.id, id));
  }

  async updateSegmentLeadCount(segmentId: string): Promise<void> {
    const segmentLeads = await db.select().from(leads).where(eq(leads.segmentId, segmentId));
    await db.update(segments).set({ leadCount: segmentLeads.length }).where(eq(segments.id, segmentId));
  }

  // Activity methods
  async getActivitiesByLead(leadId: string): Promise<Activity[]> {
    return db
      .select()
      .from(activities)
      .where(eq(activities.leadId, leadId))
      .orderBy(desc(activities.createdAt));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  // Lead request methods
  async getLeadRequest(id: string): Promise<LeadRequest | undefined> {
    const [request] = await db.select().from(leadRequests).where(eq(leadRequests.id, id));
    return request;
  }

  async getLeadRequestsByUser(userId: string): Promise<LeadRequest[]> {
    return db
      .select()
      .from(leadRequests)
      .where(eq(leadRequests.userId, userId))
      .orderBy(desc(leadRequests.createdAt));
  }

  async getAllLeadRequests(): Promise<LeadRequest[]> {
    return db
      .select()
      .from(leadRequests)
      .orderBy(desc(leadRequests.createdAt));
  }

  async createLeadRequest(insertRequest: InsertLeadRequest): Promise<LeadRequest> {
    const [request] = await db.insert(leadRequests).values(insertRequest).returning();
    return request;
  }

  async updateLeadRequest(id: string, updates: Partial<LeadRequest>): Promise<LeadRequest | undefined> {
    const [request] = await db
      .update(leadRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leadRequests.id, id))
      .returning();
    return request;
  }
}

export const storage = new DatabaseStorage();
