import { apiClient } from "./api";
import type { EmailTemplate } from "@/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const emailTemplatesService = {
  async getAll(): Promise<EmailTemplate[]> {
    const res = await apiClient.get<ApiResponse<EmailTemplate[]>>("/email-templates");
    return res.data;
  },

  async getById(id: string): Promise<EmailTemplate> {
    const res = await apiClient.get<ApiResponse<EmailTemplate>>(`/email-templates/${id}`);
    return res.data;
  },

  async create(data: {
    name: string;
    subject: string;
    bodyHtml: string;
    variables?: string[];
  }): Promise<EmailTemplate> {
    const res = await apiClient.post<ApiResponse<EmailTemplate>>("/email-templates", data);
    return res.data;
  },

  async update(id: string, data: Partial<{
    name: string;
    subject: string;
    bodyHtml: string;
    variables: string[];
  }>): Promise<EmailTemplate> {
    const res = await apiClient.put<ApiResponse<EmailTemplate>>(`/email-templates/${id}`, data);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/email-templates/${id}`);
  },

  async preview(id: string, variables?: Record<string, string>): Promise<{ subject: string; body: string }> {
    const res = await apiClient.post<ApiResponse<{ subject: string; body: string }>>(`/email-templates/${id}/preview`, { variables });
    return res.data;
  },
};
