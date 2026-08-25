import { apiClient } from "./api";
import type { LeadRequest } from "@/types";

export interface AdminPlatformStats {
  users: { total: number; active: number };
  leads: { total: number; today: number };
  automations: { totalWorkflows: number; executions: number; success: number; failed: number };
  emails: { total: number; delivered: number; failed: number };
  leadRequests: { total: number; pending: number; approved: number; rejected: number };
}

export const adminService = {
  async getLeadRequests(): Promise<LeadRequest[]> {
    return apiClient.get<LeadRequest[]>("/admin/lead-requests");
  },

  async updateLeadRequest(
    id: string,
    data: { status: string; adminNotes?: string },
  ): Promise<LeadRequest> {
    return apiClient.patch<LeadRequest>(`/admin/lead-requests/${id}`, data);
  },

  async getPlatformStats(): Promise<AdminPlatformStats> {
    return apiClient.get<AdminPlatformStats>("/admin/stats");
  },

  async getUsers(): Promise<any[]> {
    return apiClient.get<any[]>("/admin/users");
  },

  async getActivity(): Promise<any[]> {
    return apiClient.get<any[]>("/admin/activity");
  },

  async getAutomations(): Promise<any[]> {
    return apiClient.get<any[]>("/admin/automations");
  },

  async getEmails(): Promise<any[]> {
    return apiClient.get<any[]>("/admin/emails");
  },

  async getPlatformSettings(): Promise<any> {
    return apiClient.get<any>("/admin/settings");
  },

  async updatePlatformSettings(data: any): Promise<any> {
    return apiClient.put<any>("/admin/settings", data);
  },
};
