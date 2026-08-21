import { apiClient } from "./api";
import type { LeadRequest } from "@/types";

export const leadRequestsService = {
  async getAll(): Promise<LeadRequest[]> {
    return apiClient.get<LeadRequest[]>("/lead-requests");
  },

  async create(data: Partial<LeadRequest>): Promise<LeadRequest> {
    return apiClient.post<LeadRequest>("/lead-requests", data);
  },

  async updateStatus(id: string, status: string): Promise<LeadRequest> {
    return apiClient.patch<LeadRequest>(`/lead-requests/${id}/status`, { status });
  },
};
