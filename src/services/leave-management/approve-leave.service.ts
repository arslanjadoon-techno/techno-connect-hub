import { LEAVE_API_BASE_URL } from "./api";

const baseURL = LEAVE_API_BASE_URL + "/api/Leave";

export interface APILeaveDay {
  id: number;
  leaveDate: string;
  status: number; // 0: Pending, 1: Approved, 2: Rejected, 3: Partial Approved.
  managerComment: string | null;
}

export interface APILeaveRequest {
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
  days: APILeaveDay[];
}

export interface DecideDayPayload {
  dayId: number;
  status: number; // 1 = Approved, 2 = Rejected
  managerComment: string;
}

// Token Helper Function
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

// Fetch Requests for Manager - Direct API without fallback
export async function getManagerLeaveRequests(
  managerId: number,
  signal?: AbortSignal,
): Promise<APILeaveRequest[]> {
  if (!managerId) return [];

  try {
    const res = await fetch(`${baseURL}/ManagerRequests?managerId=${managerId}`, {
      method: "GET",
      headers: {
        accept: "*/*",
        Authorization: getAuthToken(),
      },
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`ManagerRequests API error (${res.status}):`, errorText);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.error("Failed to fetch manager leave requests from API:", err);
    return [];
  }
}

// Decide Days (Approve / Reject)
export async function decideLeaveDays(payload: DecideDayPayload[]): Promise<APILeaveRequest[]> {
  const res = await fetch(`${baseURL}/DecideDays`, {
    method: "PUT",
    headers: {
      accept: "*/*",
      "Content-Type": "application/json",
      Authorization: getAuthToken(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Error ${res.status}: Failed to process decision`);
  }

  return res.json();
}
