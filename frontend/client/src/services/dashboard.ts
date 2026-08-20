import { apiClient } from "./api";
import type { DashboardStats } from "@/types";

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>("/dashboard/stats");
  },
};
