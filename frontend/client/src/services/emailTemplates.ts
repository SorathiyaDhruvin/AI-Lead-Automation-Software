import { apiClient } from "./api";
import type { EmailTemplate } from "@/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const emailTemplatesService = {
  async getAll(): Promise<EmailTemplate[]> {
    return apiClient.get<EmailTemplate[]>("/email-templates");
  },

  async getById(id: string): Promise<EmailTemplate> {
    return apiClient.get<EmailTemplate>(`/email-templates/${id}`);
  },

  async create(data: {
    name: string;
    subject: string;
    bodyHtml: string;
    variables?: string[];
  }): Promise<EmailTemplate> {
    return apiClient.post<EmailTemplate>("/email-templates", data);
  },

  async update(id: string, data: Partial<{
    name: string;
    subject: string;
    bodyHtml: string;
    variables: string[];
  }>): Promise<EmailTemplate> {
    return apiClient.put<EmailTemplate>(`/email-templates/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/email-templates/${id}`);
  },

  async preview(id: string, variables?: Record<string, string>): Promise<{ subject: string; body: string }> {
    return apiClient.post<{ subject: string; body: string }>(`/email-templates/${id}/preview`, { variables });
  },

  async test(id: string, testEmail: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(`/email-templates/${id}/test`, { testEmail });
  },
};
