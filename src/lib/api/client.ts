import { API_BASE_URL, API_PATHS, AUTH_PATHS } from "@/lib/config";

const TOKEN_KEY = "techno-ticket-token-v1";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface RequestOpts {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, opts: RequestOpts = {}): Promise<ApiEnvelope<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const tok = getToken();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  let json: ApiEnvelope<T>;
  try { json = await res.json(); } catch {
    throw new Error(`Network error (${res.status})`);
  }
  if (!res.ok || !json.success) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json;
}

// ---------- Domain types matching backend ----------

export interface BackendUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  state: string | null;
  market: string | null;
  district: string | null;
  role: string;
  profileImage?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ---------- Auth ----------

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: BackendUser }>(AUTH_PATHS.login, {
      method: "POST", body: { email, password }, auth: false,
    }),
  forgotPassword: (email: string) =>
    apiRequest<null>(AUTH_PATHS.forgotPassword, { method: "POST", body: { email }, auth: false }),
  verifyOtp: (email: string, otp: string) =>
    apiRequest<null>(AUTH_PATHS.verifyOtp, { method: "POST", body: { email, otp }, auth: false }),
  resetPassword: (email: string, otp: string, newPassword: string, confirmPassword: string) =>
    apiRequest<null>(AUTH_PATHS.resetPassword, {
      method: "POST",
      body: { email, otp, newPassword, confirmPassword },
      auth: false,
    }),
};

// ---------- Users ----------

export interface AddUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: string;
  department?: string;
}

export const usersApi = {
  get: (id: string | number) => apiRequest<BackendUser>(API_PATHS.user(id)),
  add: (payload: AddUserPayload) =>
    apiRequest<BackendUser>(API_PATHS.addUser, { method: "POST", body: payload }),
  update: (payload: Partial<BackendUser> & { id: number }) =>
    apiRequest<BackendUser>(API_PATHS.updateUser, { method: "PUT", body: payload }),
  delete: (id: number) =>
    apiRequest<null>(API_PATHS.deleteUser, { method: "DELETE", body: { id } }),
};
