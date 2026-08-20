import { apiClient } from "./api";
import type { LeadRequest } from "@/types";

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

  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    inReview: number;
  }> {
    return apiClient.get("/admin/stats");
  },
};
