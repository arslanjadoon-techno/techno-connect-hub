/**
 * Centralised runtime configuration.
 *
 * The backend base URL lives in `.env` as `VITE_API_DEV_URL`.
 * Change it there (e.g. switching from local to production) and every
 * API call in the app picks it up automatically.
 */
export const API_BASE_URL = import.meta.env.VITE_API_DEV_URL as string | "N/A";

/** Auth endpoints (no `/api` prefix per backend contract). */
export const AUTH_PATHS = {
  login: "/auth/login",
  forgotPassword: "/auth/forgot-password",
  verifyOtp: "/auth/verify-otp",
  resetPassword: "/auth/reset-password",
  twoFaSetup: "/auth/2fa/setup",
  twoFaVerifyEnable: "/auth/2fa/verify-and-enable",
  twoFaLoginVerify: "/auth/login/verify-2fa",
} as const;

/** Resource endpoints (under `/api`). */
export const USER_API_PATHS = {
  getAll: "/api/users/get-all",
  user: (id: string | number) => `/api/users/${id}`,
  addUser: "/api/users/add",
  updateUser: "/api/users/update",
  deleteUser: "/api/users/delete",
  updatePassword: "/api/users/update-password",
  toggle2FaBypass: "/api/users/toggle-2fa-bypass",
  toggleActivationStatus: "/api/users/toggle-activation-status",
} as const;

export const STATE_API_PATHS = {
  getAll: "/api/states/get-all",
  state: (id: string | number) => `/api/states/${id}`,
  addState: "/api/states/add",
  updateState: "/api/states/update",
  deleteState: "/api/states/delete",
} as const;

export const DISTRICT_API_PATHS = {
  getAll: "/api/districts/get-all",
  district: (id: string | number) => `/api/districts/${id}`,
  addDistrict: "/api/districts/add",
  updateDistrict: "/api/districts/update",
  deleteDistrict: "/api/districts/delete",
} as const;

export const MARKET_API_PATHS = {
  getAll: "/api/markets/get-all",
  market: (id: string | number) => `/api/markets/${id}`,
  addMarket: "/api/markets/add",
  updateMarket: "/api/markets/update",
  deleteMarket: "/api/markets/delete",
} as const;

export const STORE_API_PATHS = {
  getAll: "/api/stores/get-all",
  store: (id: string | number) => `/api/stores/${id}`,
  addStore: "/api/stores/add",
  updateStore: "/api/stores/update",
  deleteStore: "/api/stores/delete",
} as const;

export const HOUSE_API_PATHS = {
  getAll: "/api/houses/get-all",
  house: (id: string | number) => `/api/houses/${id}`,
  addHouse: "/api/houses/add",
  updateHouse: "/api/houses/update",
  deleteHouse: "/api/houses/delete",
} as const;

export const EXTERNAL_TEAM_API_PATHS = {
  getAll: "/api/external-teams/get-all",
  state: (id: string | number) => `/api/external-teams/${id}`,
  addState: "/api/external-teams/add",
  updateState: "/api/external-teams/update",
  deleteState: "/api/external-teams/delete",
} as const;

export const DEPARTMENT_API_PATHS = {
  getAll: "/api/departments/get-all",
  department: (id: string | number) => `/api/departments/${id}`,
  addDepartment: "/api/departments/add",
  updateDepartment: "/api/departments/update",
  deleteDepartment: "/api/departments/delete",
} as const;

export const HIRARCHY_API_PATHS = {
  getAll: "/api/users/get-all",
  getDistrictsByState: (id: string | number) => `/api/districts/state/${id}`,
  addUser: "/api/users/add",
  updateUser: "/api/users/update",
  deleteUser: "/api/users/delete",
} as const;

export const PORTAL_API_PATHS = {
  getAll: "/api/portals/get-all",
} as const;

export const COMMISSION_API_BASE_URL =
  (import.meta.env.VITE_COMMISSION_API_URL as string) ||
  "https://idwhjd4bj2.execute-api.us-west-2.amazonaws.com/Prod";

export const COMMISSION_API_PATHS = {
  getEmployeeCommission: "/GetEmployeeCommission",
  getAllEmployeeCommissionMarketWise: "/GetAllEmployeeCommissionMarketWise",
} as const;

export const LEAVE_API_PATHS = {
  getAll: "/api/leave/get-all",
  myLeaves: "/api/leave/my-leaves",
  request: "/api/leave/request",
  approve: "/api/leave/approve",
  reject: "/api/leave/reject",
  cancel: "/api/leave/cancel",
  balances: "/api/leave/balances",
  types: "/api/leave/types",
  summary: "/api/leave/summary",
  leaveById: (id: string | number) => `/api/leave/${id}`,
} as const;
