/**
 * Centralised runtime configuration.
 *
 * The backend base URL lives in `.env` as `VITE_API_BASE_URL`.
 * Change it there (e.g. switching from local to production) and every
 * API call in the app picks it up automatically.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:4570";

/** Auth endpoints (no `/api` prefix per backend contract). */
export const AUTH_PATHS = {
  login: "/auth/login",
  forgotPassword: "/auth/forgot-password",
  verifyOtp: "/auth/verify-otp",
  resetPassword: "/auth/reset-password",
} as const;

/** Resource endpoints (under `/api`). */
export const USER_API_PATHS = {
  getAll: "/api/users/get-all",
  user: (id: string | number) => `/api/users/${id}`,
  addUser: "/api/users/add",
  updateUser: "/api/users/update",
  deleteUser: "/api/users/delete",
} as const;

export const STATE_API_PATHS = {
  getAll: "/api/states/search",
  state: (id: string | number) => `/api/states/${id}`,
  addState: "/api/states/add",
  updateState: "/api/states/update",
  deleteState: "/api/states/delete",
} as const;

export const HIRARCHY_API_PATHS = {
  getAll: "/api/users/get-all",
  getDistrictsByState: (id: string | number) => `/api/districts/state/${id}`,
  addUser: "/api/users/add",
  updateUser: "/api/users/update",
  deleteUser: "/api/users/delete",
} as const;
