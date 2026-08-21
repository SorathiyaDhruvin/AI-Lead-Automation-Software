import { apiClient } from "./api";
import type { UserLegacy } from "@/types";

export interface LoginResponse {
  token: string;
  user: UserLegacy;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>("/auth/login", { email, password });
  },

  async register(email: string, password: string, firstName: string, lastName: string): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>("/auth/register", { email, password, firstName, lastName });
  },

  async getMe(_token: string): Promise<UserLegacy> {
    // Use the centralized apiClient which reads the token from localStorage
    return apiClient.get<UserLegacy>("/auth/me");
  },

  async updateProfile(data: Partial<UserLegacy>): Promise<UserLegacy> {
    return apiClient.put<UserLegacy>("/profile", data);
  },

  async updateProfilePhoto(file: File): Promise<UserLegacy> {
    const formData = new FormData();
    formData.append("photo", file);
    return apiClient.patchForm<UserLegacy>("/profile/photo", formData);
  },

  async updatePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    return apiClient.patch<{ message: string }>("/auth/password", data);
  },
};
