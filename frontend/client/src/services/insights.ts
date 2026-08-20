import { apiClient } from "./api";

export const insightsService = {
  async generate(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/insights/generate");
  },
};
