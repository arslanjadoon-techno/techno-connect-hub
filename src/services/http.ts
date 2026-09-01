/**
 * Base HTTP client used by all service classes.
 *
 * - Base URL comes from `VITE_API_DEV_URL` in `.env` (single source of truth).
 * - Adds the JWT from localStorage when `auth !== false`.
 * - Normalises responses into the backend's `ApiEnvelope<T>` shape.
 */
import { API_BASE_URL } from "@/lib/config";

export const TOKEN_KEY = "token";
export const USER_KEY = "user";

export interface ApiEnvelope<T> {
  pagination?: any;
  success: boolean;
  message: string;
  data: T;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RequestOpts {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildQuery(query?: RequestOpts["query"]): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "" || v === "all") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export class HttpClient {
  constructor(public readonly baseUrl: string = API_BASE_URL) {}

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async request<T>(path: string, opts: RequestOpts = {}): Promise<ApiEnvelope<T>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts.auth !== false) {
      const tok = this.getToken();
      if (tok) headers["Authorization"] = `Bearer ${tok}`;
    }

    const url = `${this.baseUrl}${path}${buildQuery(opts.query)}`;
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });

    let json: ApiEnvelope<T>;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Network error (${res.status})`);
    }
    if (!res.ok || !json.success)
      throw new Error(json?.message || `Request failed (${res.status})`);
    return json;
  }

  get<T>(path: string, query?: RequestOpts["query"], auth?: boolean) {
    return this.request<T>(path, { method: "GET", query, auth });
  }
  post<T>(path: string, body?: unknown, auth?: boolean) {
    return this.request<T>(path, { method: "POST", body, auth });
  }
  put<T>(path: string, body?: unknown, auth?: boolean) {
    return this.request<T>(path, { method: "PUT", body, auth });
  }
  delete<T>(path: string, body?: unknown, auth?: boolean) {
    return this.request<T>(path, { method: "DELETE", body, auth });
  }
}

/** Shared singleton — import this in every service. */
export const http = new HttpClient();
