import { db } from "./db";
import { usersLegacy, leads, segments, activities, leadNotes, leadRequests } from "@shared/schema";
import { eq, desc, gte, lte, ilike, and, or, sql } from "drizzle-orm";
import type { InsertUserLegacy, UserLegacy, InsertLead, Lead, InsertSegment, Segment, InsertActivity, Activity, InsertLeadNote, LeadNote, InsertLeadRequest, LeadRequest } from "@shared/schema";

export interface LeadFilters {
  search?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface IStorage {
  // User methods (for legacy email/password auth)
  getUser(id: string): Promise<UserLegacy | undefined>;
  getUserByEmail(email: string): Promise<UserLegacy | undefined>;
  createUser(user: InsertUserLegacy): Promise<UserLegacy>;
  updateUser(id: string, updates: Partial<UserLegacy>): Promise<UserLegacy | undefined>;

  // Lead methods
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsByUser(userId: string, limit?: number, filters?: LeadFilters): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<void>;
  getLeadStats(userId: string): Promise<{ total: number; hot: number; avgScore: number; statusCounts: Record<string, number> }>;
  getDailyLeadStats(userId: string, days: number): Promise<{ date: string; count: number }[]>;

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

  // Lead note methods
  getNotesByLead(leadId: string): Promise<LeadNote[]>;
  createNote(note: InsertLeadNote): Promise<LeadNote>;

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

  async getLeadsByUser(userId: string, limit?: number, filters?: LeadFilters): Promise<Lead[]> {
    const conditions = [eq(leads.userId, userId)];

    if (filters?.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(ilike(leads.name, term), ilike(leads.email, term)) as any
      );
    }

    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(leads.status, filters.status));
    }

    if (filters?.minScore !== undefined) {
      conditions.push(gte(leads.aiScore, filters.minScore));
    }

    if (filters?.maxScore !== undefined) {
      conditions.push(lte(leads.aiScore, filters.maxScore));
    }

    if (filters?.dateFrom) {
      conditions.push(gte(leads.createdAt, new Date(filters.dateFrom)));
    }

    if (filters?.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(leads.createdAt, to));
    }

    const query = db
      .select()
      .from(leads)
      .where(and(...conditions))
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

  async getLeadStats(userId: string): Promise<{ total: number; hot: number; avgScore: number; statusCounts: Record<string, number> }> {
    const userLeads = await db.select().from(leads).where(eq(leads.userId, userId));
    const total = userLeads.length;
    const scoredLeads = userLeads.filter((l) => l.aiScore !== null);
    const hot = userLeads.filter((l) => (l.aiScore || 0) >= 70).length;
    const avgScore = scoredLeads.length > 0
      ? Math.round(scoredLeads.reduce((acc, l) => acc + (l.aiScore || 0), 0) / scoredLeads.length)
      : 0;
    const statusCounts: Record<string, number> = {};
    for (const lead of userLeads) {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    }
    return { total, hot, avgScore, statusCounts };
  }

  async getDailyLeadStats(userId: string, days: number): Promise<{ date: string; count: number }[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);
    cutoff.setHours(0, 0, 0, 0);

    const userLeads = await db
      .select()
      .from(leads)
      .where(and(eq(leads.userId, userId), gte(leads.createdAt, cutoff)));

    const countMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      countMap[key] = 0;
    }

    for (const lead of userLeads) {
      const key = new Date(lead.createdAt).toISOString().slice(0, 10);
      if (key in countMap) {
        countMap[key]++;
      }
    }

    return Object.entries(countMap).map(([date, count]) => ({ date, count }));
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

  // Lead note methods
  async getNotesByLead(leadId: string): Promise<LeadNote[]> {
    return db
      .select()
      .from(leadNotes)
      .where(eq(leadNotes.leadId, leadId))
      .orderBy(desc(leadNotes.createdAt));
  }

  async createNote(insertNote: InsertLeadNote): Promise<LeadNote> {
    const [note] = await db.insert(leadNotes).values(insertNote).returning();
    return note;
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
