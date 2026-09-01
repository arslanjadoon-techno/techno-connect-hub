import { LEAVE_API_BASE_URL } from "./api";

const baseURL = LEAVE_API_BASE_URL + "/api/Leave";

// Helper function to get clean bearer header
const getAuthToken = (): string => {
    try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
            console.error("⚠️ 'user' object is missing in LocalStorage!");
            return "";
        }

        const userData = JSON.parse(userStr);
        let token = userData?.token || "";

        if (!token) {
            console.error("⚠️ 'token' key is missing in localstorage 'user' object!");
            return "";
        }

        token = token.replace(/^"(.*)"$/, '$1').trim();

        // Ensure token starts with 'bearer '
        return token.toLowerCase().startsWith("bearer ") ? token : `bearer ${token}`;
    } catch (error) {
        console.error("Error parsing user token from localStorage:", error);
        return "";
    }
};

// Type Definitions
export interface Market {
    id: number;
    name: string;
}

export interface LeaveDay {
    id: number;
    leaveDate: string;
    status: number;
    managerComment?: string | null;
}

// Interface for Manager
export interface Manager {
    id: number;
    name: string;
}

export interface LeaveResponse {
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

// 1. Cancel Leave Request API call
export const cancelLeaveRequest = async (
    leaveId: number,
    employeeId: number,
    signal?: AbortSignal
): Promise<any> => {
    try {
        const response = await fetch(
            `${baseURL}/Cancel/${leaveId}?employeeId=${employeeId}`,
            {
                method: 'PUT',
                headers: {
                    'accept': '*/*',
                },
                signal,
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Failed to cancel request (Status: ${response.status})`);
        }

        return await response.json();
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        console.error('Cancel Leave Request Error:', error);
        throw error;
    }
};

// 2. Fetch Markets (Exact match with working curl)
export async function getMarkets(signal?: AbortSignal): Promise<Market[]> {
    const res = await fetch(`${baseURL}/Markets`, {
        method: 'GET',
        headers: {
            'accept': '*/*',
            'Authorization': getAuthToken(),
        },
        signal,
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Error ${res.status}: Failed to fetch markets`);
    }
    return res.json();
}

// 3. Fetch My Requests (Exact match with working curl)
export async function getMyLeaveRequests(employeeId?: number | string, signal?: AbortSignal): Promise<LeaveResponse[]> {
    const queryParam = employeeId ? `?employeeId=${employeeId}` : '';
    const res = await fetch(`${baseURL}/MyRequests${queryParam}`, {
        method: 'GET',
        headers: {
            'accept': '*/*',
            'Authorization': getAuthToken(),
        },
        signal,
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Error ${res.status}: Failed to fetch leave history`);
    }
    return res.json();
}

// 4. Submit Leave Request (Clean POST request)
export async function submitLeaveRequest(payload: SubmitLeavePayload): Promise<LeaveResponse> {
    const res = await fetch(`${baseURL}/Submit`, {
        method: 'POST',
        headers: {
            'accept': '*/*',
            'Authorization': getAuthToken(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Error ${res.status}: Failed to submit leave request`);
    }
    return res.json();
}

// 5. Get Managers by Market ID
export const getManagersByMarket = async (marketId: number, signal?: AbortSignal): Promise<Manager[]> => {
    const token = getAuthToken();

    if (!marketId) return [];

    const response = await fetch(`${baseURL}/Managers?marketId=${marketId}`, {
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        },
        signal
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON Response Received:", await response.text());
        throw new Error(`Server returned non-JSON response (Status: ${response.status})`);
    }

    if (!response.ok) {
        throw new Error('Failed to fetch managers for the selected market');
    }

    return response.json();
};