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

// 1. Fetch Markets - Direct API without fallback
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
      const errorText = await res.text().catch(() => "");
      console.error(`Markets API error (${res.status}):`, errorText);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.error("Error fetching markets from API:", err);
    return [];
  }
}

// 2. Fetch Managers for a selected market - Direct API without fallback
export async function getManagersByMarket(
  marketId: number,
  signal?: AbortSignal,
): Promise<Manager[]> {
  if (!marketId) return [];

  try {
    const res = await fetch(`${baseURL}/Managers?marketId=${marketId}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: getAuthToken(),
      },
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`Managers API error (${res.status}):`, errorText);
      return [];
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((m: { id?: number; managerId?: number; name?: string; managerName?: string }) => ({
        id: m.id ?? m.managerId ?? 0,
        name: m.name ?? m.managerName ?? "Unknown Manager",
      }));
    }
    return [];
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.error("Error fetching managers from API:", err);
    return [];
  }
}

// 3. Fetch My Requests - Direct API without fallback
export async function getMyLeaveRequests(
  employeeId?: number | string,
  signal?: AbortSignal,
): Promise<LeaveResponse[]> {
  if (!employeeId) return [];

  try {
    const res = await fetch(`${baseURL}/MyRequests?employeeId=${employeeId}`, {
      method: "GET",
      headers: {
        accept: "*/*",
        Authorization: getAuthToken(),
      },
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`MyRequests API error (${res.status}):`, errorText);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.error("Error fetching my leave requests from API:", err);
    return [];
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
