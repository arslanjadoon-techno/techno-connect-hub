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

export const FALLBACK_MANAGER_REQUESTS: APILeaveRequest[] = [
  {
    id: 56,
    employeeId: 1071,
    employeeName: "JAWAD MOHAMMED",
    marketId: 1,
    marketName: "ARIZONA",
    managerId: 22,
    managerName: "Ali Khan",
    fromDate: "2026-08-02T00:00:00",
    toDate: "2026-08-04T00:00:00",
    reason: "leave request for 2, 3, and 4 August.",
    status: 1,
    createdAt: "2026-08-01T19:33:55",
    days: [
      { id: 26, leaveDate: "2026-08-02T00:00:00", status: 1, managerComment: "approved" },
      { id: 27, leaveDate: "2026-08-03T00:00:00", status: 1, managerComment: "approved" },
      { id: 28, leaveDate: "2026-08-04T00:00:00", status: 1, managerComment: "approved" },
    ],
  },
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

// Token Helper Function
const getAuthToken = (): string => {
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
  return token ? `Bearer ${token}` : "";
};

// Fetch Requests for Manager
export async function getManagerLeaveRequests(
  managerId: number,
  signal?: AbortSignal,
): Promise<APILeaveRequest[]> {
  const targetId = managerId || 19;
  try {
    const res = await fetch(`${baseURL}/ManagerRequests?managerId=${targetId}`, {
      method: "GET",
      headers: {
        accept: "*/*",
        Authorization: getAuthToken(),
      },
      signal,
    });

    if (!res.ok) {
      console.warn(`ManagerRequests API responded with status ${res.status}, using fallback data`);
      return FALLBACK_MANAGER_REQUESTS;
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return data && Array.isArray(data) ? data : FALLBACK_MANAGER_REQUESTS;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.warn("Failed to fetch manager leave requests from API, using fallback data:", err);
    return FALLBACK_MANAGER_REQUESTS;
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
    const errorText = await res.text();
    throw new Error(errorText || `Error ${res.status}: Failed to process decision`);
  }

  return res.json();
}
