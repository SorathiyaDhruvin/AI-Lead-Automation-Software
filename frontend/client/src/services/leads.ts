import { apiClient } from "./api";
import type { Lead, LeadFilters, Activity, LeadNote } from "@/types";

function filtersToParams(filters?: LeadFilters, limit?: number): Record<string, string> {
  const params: Record<string, string> = {};
  if (limit) params.limit = String(limit);
  if (filters?.search) params.search = filters.search;
  if (filters?.status) params.status = filters.status;
  if (filters?.minScore !== undefined) params.minScore = String(filters.minScore);
  if (filters?.maxScore !== undefined) params.maxScore = String(filters.maxScore);
  if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters?.dateTo) params.dateTo = filters.dateTo;
  return params;
}

function mapLead(l: any): Lead {
  return {
    ...l,
    aiScore: l.aiScore !== undefined ? Number(l.aiScore) : (l.ai_score !== undefined && l.ai_score !== null ? Number(l.ai_score) : null),
    createdAt: l.createdAt || l.created_at,
    updatedAt: l.updatedAt || l.updated_at,
  };
}

export const leadsService = {
  // ── CRUD ────────────────────────────────────────────────
  async getAll(filters?: LeadFilters, limit?: number): Promise<Lead[]> {
    const leads = await apiClient.get<any[]>("/leads", filtersToParams(filters, limit));
    return leads.map(mapLead);
  },

  async getById(id: string): Promise<Lead> {
    const l = await apiClient.get<any>(`/leads/${id}`);
    return mapLead(l);
  },

  async create(data: Partial<Lead>): Promise<Lead> {
    const l = await apiClient.post<any>("/leads", data);
    return mapLead(l);
  },

  async update(id: string, data: Partial<Lead>): Promise<Lead> {
    const l = await apiClient.put<any>(`/leads/${id}`, data);
    return mapLead(l);
  },

  async remove(id: string): Promise<void> {
    return apiClient.delete(`/leads/${id}`);
  },

  // ── AI Scoring ──────────────────────────────────────────
  async score(id: string): Promise<Lead> {
    const l = await apiClient.post<any>(`/leads/${id}/score`);
    return mapLead(l);
  },

  // ── Email ───────────────────────────────────────────────
  async sendEmail(id: string, data: { subject: string; message: string }): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/leads/${id}/send-email`, data);
  },

  // ── Notes ───────────────────────────────────────────────
  async getNotes(id: string): Promise<LeadNote[]> {
    return apiClient.get<LeadNote[]>(`/leads/${id}/notes`);
  },

  async addNote(id: string, text: string): Promise<LeadNote> {
    return apiClient.post<LeadNote>(`/leads/${id}/notes`, { text });
  },

  // ── Activity ────────────────────────────────────────────
  async getActivity(id: string): Promise<Activity[]> {
    return apiClient.get<Activity[]>(`/leads/${id}/activity`);
  },

  // ── CSV Export ──────────────────────────────────────────
  async exportCsv(filters?: LeadFilters): Promise<Blob> {
    const res = await apiClient.getRaw("/leads/export", filtersToParams(filters));
    return res.blob();
  },

  // ── CSV Import ──────────────────────────────────────────
  async importCsv(file: File): Promise<{ created: number; failed: number; errors: string[] }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postForm<{ created: number; failed: number; errors: string[] }>("/leads/import", formData);
  },
};
