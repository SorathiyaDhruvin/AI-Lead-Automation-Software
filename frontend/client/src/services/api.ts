// Centralized API client — every request goes through here.
// Reads VITE_API_URL from environment; falls back to "/api" for same-origin dev.

import { supabase } from "./supabase";

const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string) || "/api";

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const json = await res.json();
      if (json && json.message) errorMessage = json.message;
    } catch (e) {
      // Ignore JSON parse errors for non-JSON responses
    }
    
    // Redirect to login if token is expired or unauthorized
    if (res.status === 401) {
      localStorage.removeItem("token");
      await supabase.auth.signOut().catch(() => {});
      window.location.href = "/login";
    }
    
    throw new Error(errorMessage);
  }
  // 204 No Content — return undefined
  if (res.status === 204) return undefined as unknown as T;
  const json = await res.json();
  if (json && typeof json === "object" && "success" in json && "data" in json) {
    return json.data as T;
  }
  return json as T;
}

export const apiClient = {
  /** GET request */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString(), {
      headers: await authHeaders(),
      credentials: "include",
    });
    return handleResponse<T>(res);
  },

  /** POST request (JSON body) */
  async post<T>(path: string, data?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(await authHeaders()),
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    return handleResponse<T>(res);
  },

  /** POST request (FormData — for file uploads) */
  async postForm<T>(path: string, formData: FormData): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: await authHeaders(),
      body: formData,
      credentials: "include",
    });
    return handleResponse<T>(res);
  },

  /** PUT request (JSON body) */
  async put<T>(path: string, data?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "PUT",
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(await authHeaders()),
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    return handleResponse<T>(res);
  },

  /** PATCH request */
  async patch<T>(path: string, data?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "PATCH",
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(await authHeaders()),
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    return handleResponse<T>(res);
  },

  /** PATCH request (FormData — for file uploads) */
  async patchForm<T>(path: string, formData: FormData): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: formData,
      credentials: "include",
    });
    return handleResponse<T>(res);
  },

  /** DELETE request */
  async delete<T = void>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "DELETE",
      headers: await authHeaders(),
      credentials: "include",
    });
    return handleResponse<T>(res);
  },

  /** GET that returns a raw Response (for blob downloads like CSV export) */
  async getRaw(path: string, params?: Record<string, string>): Promise<Response> {
    const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      });
    }
    const res = await fetch(url.toString(), {
      headers: await authHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
    return res;
  },
};

/** The resolved base URL — useful for constructing OAuth redirect URLs etc. */
export { API_BASE_URL };
