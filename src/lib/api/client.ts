import { API_BASE_URL, USER_API_PATHS, HIRARCHY_API_PATHS, AUTH_PATHS, STATE_API_PATHS, DISTRICT_API_PATHS, MARKET_API_PATHS } from "@/lib/config";

/**
 * LocalStorage keys.
 *  - `token` — raw JWT returned by the login API.
 *  - `user`  — full user object exactly as returned by the login API.
 * These keys are intentionally short / generic so other tooling can read them.
 */
export const TOKEN_KEY = "token";
export const USER_KEY = "user";

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

export function getStoredUser<T = BackendUser>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

export function setStoredUser(user: unknown | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
}

export interface ApiEnvelope<T> {
  pagination: any;
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

// ---------- Domain types matching backend ---------- //

export interface BackendUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: { id: number; name: string; };
  department: { id: number; name: string; } | null;
  state: { id: string; name: string } | null;
  district: { id: string; name: string } | null;
  market: { id: string; name: string } | null;
  store: { id: string; name: string } | null;
  profileImage?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ---------- Auth ---------- //

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

// ---------- States / Department / Markets / Districts ---------- //

export const hierarchyApi = {
  getRoles: () => apiRequest<string[]>("/api/users/roles"),
  getDepartments: () => apiRequest<{ id: number; name: string }[]>("/api/departments/get-all"),
  getStates: () => apiRequest<{ id: number; name: string }[]>("/api/states/search", { method: "POST" }),
  getMarkets: () => apiRequest<{ id: number; name: string; stateId: number }[]>("/api/markets/get-all"),
  getDistricts: () => apiRequest<{ id: number; name: string; marketId: number }[]>("/api/districts/get-all"),
  getDistrictsByState: (id: string | number) => apiRequest<BackendUser>(HIRARCHY_API_PATHS.getDistrictsByState(id)),
};


// ---------- Users ---------- //

export interface AddUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: string;
  department?: string;
  phone?: string;
}

export const usersApi = {
  getAll: () => apiRequest<BackendUser[]>(USER_API_PATHS.getAll),
  get: (id: string | number) => apiRequest<BackendUser>(USER_API_PATHS.user(id)),
  add: (payload: AddUserPayload) =>
    apiRequest<BackendUser>(USER_API_PATHS.addUser, { method: "POST", body: payload }),
  update: (payload: Partial<BackendUser> & { id: number }) =>
    apiRequest<BackendUser>(USER_API_PATHS.updateUser, { method: "PUT", body: payload }),
  delete: (id: number) =>
    apiRequest<null>(USER_API_PATHS.deleteUser, { method: "DELETE", body: { id } }),
};


// ---------- States ---------- //

export interface State {
  id: number;
  name: string;
  symbol: string;
  createdAt?: string;
  updatedAt?: string;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  size?: number;
}

export const StatesApi = {
  getAll: (params?: PaginationParams) => {
    let url: string = STATE_API_PATHS.getAll;

    if (params && params.page !== undefined && params.size !== undefined) {
      url = `${STATE_API_PATHS.getAll}?page=${params.page}&size=${params.size}`;
    }
    return apiRequest<State[]>(url, { method: "POST" });
  },

  get: (id: string | number) => apiRequest<State>(STATE_API_PATHS.state(id)),

  add: (payload: { name: string; symbol: string }) =>
    apiRequest<State>(STATE_API_PATHS.addState, { method: "POST", body: payload }),

  update: (payload: Partial<State> & { id: number }) =>
    apiRequest<State>(STATE_API_PATHS.updateState, { method: "PUT", body: payload }),

  delete: (id: number) =>
    apiRequest<null>(STATE_API_PATHS.deleteState, { method: "DELETE", body: { id } }),
};


// ---------- Districts ---------- //

export interface District {
  id: number;
  name: string;
  stateId: number;
  createdAt?: string;
  updatedAt?: string;
}

export const DistrictsApi = {

  // 1. Get All Districts
 getAll: (params?: { page?: number; size?: number; state?: string | number }) => {
    const queryParts: string[] = [];

    if (params) {
      if (params.page !== undefined) queryParts.push(`page=${params.page}`);
      if (params.size !== undefined) queryParts.push(`size=${params.size}`);
      if (params.state !== undefined && params.state !== "all") {
        queryParts.push(`state=${params.state}`);
      }
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return apiRequest<District[]>(`${DISTRICT_API_PATHS.getAll}${queryString}`);
  },

  // 2. Get Single District
  get: (id: string | number) =>
    apiRequest<District>(DISTRICT_API_PATHS.district(id)),

  // 3. Add District
  add: (payload: { name: string; stateId: number }) =>
    apiRequest<District>(DISTRICT_API_PATHS.addDistrict, { method: "POST", body: payload }),

  // 4. Update District
  update: (payload: { id: number; name: string }) =>
    apiRequest<District>(DISTRICT_API_PATHS.updateDistrict, { method: "PUT", body: payload }),

  // 5. Delete District
  delete: (payload: { id: number }) =>
    apiRequest<null>(DISTRICT_API_PATHS.deleteDistrict, { method: "DELETE", body: payload }),
};


// ---------- Markets ---------- //

export interface Market {
  id: number;
  name: string;
  stateId: number;
  districtId: number;
  createdAt?: string;
  updatedAt?: string;
}

export const MarketsApi = {
  // Get All Markets (With Full Pagination, State, & District Filtering Support)
  getAll: (params?: { page?: number; size?: number; state?: string | number; district?: string | number }) => {
    const queryParts: string[] = [];

    if (params) {
      if (params.page !== undefined) queryParts.push(`page=${params.page}`);
      if (params.size !== undefined) queryParts.push(`size=${params.size}`);
      
      if (params.state !== undefined && params.state !== "all") {
        queryParts.push(`state=${params.state}`);
      }
      
      // FIX: District parameter was missing here. Added now!
      if (params.district !== undefined && params.district !== "all") {
        queryParts.push(`district=${params.district}`);
      }
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return apiRequest<Market[]>(`${MARKET_API_PATHS.getAll}${queryString}`);
  },

  get: (id: string | number) => 
    apiRequest<Market>(MARKET_API_PATHS.market(id)),

  add: (payload: { name: string; stateId: number; districtId: number }) =>
    apiRequest<Market>(MARKET_API_PATHS.addMarket, { method: "POST", body: payload }),

  update: (payload: { id: number; name: string; districtId: number }) =>
    apiRequest<Market>(MARKET_API_PATHS.updateMarket, { method: "PUT", body: payload }),

  delete: (payload: { id: number }) =>
    apiRequest<null>(MARKET_API_PATHS.deleteMarket, { method: "DELETE", body: payload }),
};



