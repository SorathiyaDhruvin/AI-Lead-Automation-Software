import { apiClient } from "./api";
import type { UserSettings } from "@/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const settingsService = {
  async get(): Promise<UserSettings> {
    const res = await apiClient.get<ApiResponse<UserSettings>>("/settings");
    return res.data;
  },

  async update(data: Partial<UserSettings>): Promise<UserSettings> {
    const res = await apiClient.put<ApiResponse<UserSettings>>("/settings", data);
    return res.data;
  },
};
