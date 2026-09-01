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
  managerNTID: string;
  managerName: string;
  leaveTypeId: number;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: number;
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
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  return token ? `Bearer ${token}` : '';
};

// Fetch Requests for Manager
export async function getManagerLeaveRequests(
  managerId: number,
  signal?: AbortSignal
): Promise<APILeaveRequest[]> {
  const res = await fetch(`${baseURL}/ManagerRequests?managerId=${managerId}`, {
    method: 'GET',
    headers: {
      'accept': '*/*',
      'Authorization': getAuthToken(),
    },
    signal,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Error ${res.status}: Failed to fetch manager requests`);
  }

  return res.json();
}

// Decide Days (Approve / Reject)
export async function decideLeaveDays(
  payload: DecideDayPayload[]
): Promise<APILeaveRequest[]> {
  const res = await fetch(`${baseURL}/DecideDays`, {
    method: 'PUT',
    headers: {
      'accept': '*/*',
      'Content-Type': 'application/json',
      'Authorization': getAuthToken(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Error ${res.status}: Failed to process decision`);
  }

  return res.json();
}