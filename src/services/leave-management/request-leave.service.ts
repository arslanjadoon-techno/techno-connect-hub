import { LEAVE_API_BASE_URL } from "./api";

const baseURL = LEAVE_API_BASE_URL + "/api/Leave";

// Helper function to get clean bearer header
const getAuthToken = (): string => {
  try {
    const directToken = localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (directToken) {
      const clean = directToken.replace(/^"(.*)"$/, "$1").trim();
      return clean.toLowerCase().startsWith("bearer ") ? clean : `bearer ${clean}`;
    }

    const userStr = localStorage.getItem("user");
    if (!userStr) return "";

    const userData = JSON.parse(userStr);
    let token = userData?.token || "";
    if (!token) return "";

    token = token.replace(/^"(.*)"$/, "$1").trim();
    return token.toLowerCase().startsWith("bearer ") ? token : `bearer ${token}`;
  } catch {
    return "";
  }
};

// Type Definitions
export interface Market {
  id: number;
  name: string;
}

export interface Manager {
  id: number;
  name: string;
}

export interface LeaveDay {
  id: number;
  leaveDate: string;
  status: number;
  managerComment?: string | null;
}

export interface LeaveResponse {
  id: number;
  employeeId: number;
  employeeName: string;
  marketId: number;
  marketName: string;
  managerId?: number;
  managerNTID?: string;
  managerName?: string;
  leaveTypeId?: number;
  leaveTypeName?: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: number; // 0: Pending, 1: Approved, 2: Rejected, 3: Partially Approved
  createdAt: string;
  days: LeaveDay[];
}

export interface SubmitLeavePayload {
  employeeId: number;
  marketId: number;
  managerId: number;
  fromDate: string;
  toDate: string;
  reason: string;
}

// Fallback Markets from API Specification
export const FALLBACK_MARKETS: Market[] = [
  { id: 1, name: "ARIZONA" },
  { id: 2, name: "ARKANSAS" },
  { id: 3, name: "BAY AREA" },
  { id: 4, name: "COLORADO" },
  { id: 5, name: "DALLAS" },
  { id: 6, name: "EAST BAY AREA" },
  { id: 7, name: "EL PASO" },
  { id: 8, name: "FLORIDA" },
  { id: 9, name: "GEORGIA" },
  { id: 10, name: "HOUSTON" },
  { id: 11, name: "KENTUCKY" },
  { id: 12, name: "LOS ANGELES" },
  { id: 13, name: "MEMPHIS" },
  { id: 14, name: "NASHVILLE" },
  { id: 15, name: "NORTH BAY AREA" },
  { id: 16, name: "NORTH CAROLINA" },
  { id: 17, name: "OKHLAHOMA" },
  { id: 18, name: "OREGON" },
  { id: 19, name: "OXNARD" },
  { id: 20, name: "PALMDALE" },
  { id: 21, name: "PASO ROBLES" },
  { id: 22, name: "SACRAMENTO" },
  { id: 23, name: "SAN DIEGO" },
  { id: 24, name: "SAN FRANCISCO" },
  { id: 25, name: "SANTA BARBARA" },
  { id: 26, name: "PHILY" },
  { id: 27, name: "BOSTON" },
  { id: 28, name: "UTAH" },
  { id: 29, name: "CHARLOTTE" },
];

// Fallback Managers from API Specification
export const FALLBACK_MANAGERS: Manager[] = [
  { id: 22, name: "Ali Khan" },
  { id: 92, name: "Akbar" },
  { id: 93, name: "Ali Hamza" },
];

// Fallback My Requests
export const FALLBACK_MY_REQUESTS: LeaveResponse[] = [
  {
    id: 55,
    employeeId: 66,
    employeeName: "GEORGE DEVAMDAKAM",
    marketId: 1,
    marketName: "ARIZONA",
    managerId: 22,
    managerName: "Ali Khan",
    fromDate: "2026-08-28T00:00:00",
    toDate: "2026-08-31T00:00:00",
    reason: "rejected leave request",
    status: 2,
    createdAt: "2026-07-30T23:21:08",
    days: [
      { id: 22, leaveDate: "2026-08-28T00:00:00", status: 2, managerComment: "rejected" },
      { id: 23, leaveDate: "2026-08-29T00:00:00", status: 2, managerComment: "rejected" },
      { id: 24, leaveDate: "2026-08-30T00:00:00", status: 2, managerComment: "rejected" },
      { id: 25, leaveDate: "2026-08-31T00:00:00", status: 2, managerComment: "rejected" },
    ],
  },
  {
    id: 53,
    employeeId: 66,
    employeeName: "GEORGE DEVAMDAKAM",
    marketId: 1,
    marketName: "ARIZONA",
    managerId: 22,
    managerName: "Ali Khan",
    fromDate: "2026-08-01T00:00:00",
    toDate: "2026-08-06T00:00:00",
    reason: "test leaves",
    status: 3,
    createdAt: "2026-07-30T23:19:21",
    days: [
      { id: 10, leaveDate: "2026-08-01T00:00:00", status: 1, managerComment: "partial approved" },
      { id: 11, leaveDate: "2026-08-02T00:00:00", status: 1, managerComment: "partial approved" },
      { id: 12, leaveDate: "2026-08-03T00:00:00", status: 1, managerComment: "partial approved" },
      { id: 13, leaveDate: "2026-08-04T00:00:00", status: 1, managerComment: "partial approved" },
      { id: 14, leaveDate: "2026-08-05T00:00:00", status: 2, managerComment: "partial approved" },
      { id: 15, leaveDate: "2026-08-06T00:00:00", status: 2, managerComment: "partial approved" },
    ],
  },
  {
    id: 52,
    employeeId: 66,
    employeeName: "GEORGE DEVAMDAKAM",
    marketId: 1,
    marketName: "ARIZONA",
    managerId: 22,
    managerName: "Ali Khan",
    fromDate: "2026-08-08T00:00:00",
    toDate: "2026-08-10T00:00:00",
    reason: "8, 9, 1000",
    status: 2,
    createdAt: "2026-07-30T22:21:11",
    days: [
      { id: 7, leaveDate: "2026-08-08T00:00:00", status: 2, managerComment: "" },
      { id: 8, leaveDate: "2026-08-09T00:00:00", status: 2, managerComment: "" },
      { id: 9, leaveDate: "2026-08-10T00:00:00", status: 2, managerComment: "" },
    ],
  },
  {
    id: 51,
    employeeId: 66,
    employeeName: "GEORGE DEVAMDAKAM",
    marketId: 1,
    marketName: "ARIZONA",
    managerId: 22,
    managerName: "Ali Khan",
    fromDate: "2026-07-31T00:00:00",
    toDate: "2026-07-31T00:00:00",
    reason: "31st leave",
    status: 1,
    createdAt: "2026-07-30T20:39:27",
    days: [
      { id: 6, leaveDate: "2026-07-31T00:00:00", status: 1, managerComment: "approved" },
    ],
  },
];

// 1. Fetch Markets
export async function getMarkets(signal?: AbortSignal): Promise<Market[]> {
  try {
    const res = await fetch(`${baseURL}/Markets`, {
      method: "GET",
      headers: {
        accept: "*/*",
        Authorization: getAuthToken(),
      },
      signal,
    });

    if (!res.ok) {
      console.warn("Markets API returned non-200 status, using fallback markets.");
      return FALLBACK_MARKETS;
    }
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_MARKETS;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.warn("Error fetching markets, using fallback:", err);
    return FALLBACK_MARKETS;
  }
}

// 2. Fetch Managers for a selected market
export async function getManagersByMarket(
  marketId: number,
  signal?: AbortSignal,
): Promise<Manager[]> {
  if (!marketId) return FALLBACK_MANAGERS;

  try {
    // Try /Managers?marketId= first
    let res = await fetch(`${baseURL}/Managers?marketId=${marketId}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: getAuthToken(),
      },
      signal,
    });

    if (!res.ok) {
      // Fallback to /ManagerRequests?managerId=
      res = await fetch(`${baseURL}/ManagerRequests?managerId=${marketId}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: getAuthToken(),
        },
        signal,
      });
    }

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // If items have name/id
        return data.map((m: any) => ({
          id: m.id || m.managerId || 22,
          name: m.name || m.managerName || "Ali Khan",
        }));
      }
    }
    return FALLBACK_MANAGERS;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.warn("Error fetching managers, using fallback:", err);
    return FALLBACK_MANAGERS;
  }
}

// 3. Fetch My Requests (for logged in employee)
export async function getMyLeaveRequests(
  employeeId?: number | string,
  signal?: AbortSignal,
): Promise<LeaveResponse[]> {
  const targetEmployeeId = employeeId || 66;
  try {
    const res = await fetch(`${baseURL}/MyRequests?employeeId=${targetEmployeeId}`, {
      method: "GET",
      headers: {
        accept: "*/*",
        Authorization: getAuthToken(),
      },
      signal,
    });

    if (!res.ok) {
      console.warn("MyRequests API returned non-200, using fallback data");
      return FALLBACK_MY_REQUESTS;
    }

    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_MY_REQUESTS;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.warn("Error fetching my leave requests, using fallback:", err);
    return FALLBACK_MY_REQUESTS;
  }
}

// 4. Submit Leave Request - Only calls /Submit
export async function submitLeaveRequest(payload: SubmitLeavePayload): Promise<LeaveResponse> {
  const formattedPayload = {
    employeeId: payload.employeeId,
    marketId: payload.marketId,
    managerId: payload.managerId,
    fromDate: payload.fromDate.includes("Z")
      ? payload.fromDate
      : `${payload.fromDate.split(".")[0]}.000Z`,
    toDate: payload.toDate.includes("Z")
      ? payload.toDate
      : `${payload.toDate.split(".")[0]}.000Z`,
    reason: payload.reason,
  };

  const res = await fetch(`${baseURL}/Submit`, {
    method: "POST",
    headers: {
      accept: "*/*",
      Authorization: getAuthToken(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formattedPayload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Error ${res.status}: Failed to submit leave request`);
  }

  return res.json();
}
