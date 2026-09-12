import { http } from "../http";
import { LEAVE_API_PATHS } from "@/lib/config";
import type { LeaveBalance, LeaveRequest, LeaveStats } from "@/lib/types";
import type {
  ApproveLeavePayload,
  CancelLeavePayload,
  CreateLeaveRequestPayload,
  LeaveQueryParams,
  LeaveTypeOption,
  RejectLeavePayload,
} from "./types";

/**
 * Leave Management Service Class
 * Handles employee leave applications, supervisor approvals, balances, and history.
 */
export class LeaveService {
  /**
   * Get all leaves for managers/admins with optional filters.
   */
  async getAllLeaves(params?: LeaveQueryParams) {
    return http.get<LeaveRequest[]>(
      LEAVE_API_PATHS.getAll,
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  /**
   * Get leaves of the currently logged-in user.
   */
  async getMyLeaves(params?: LeaveQueryParams) {
    return http.get<LeaveRequest[]>(
      LEAVE_API_PATHS.myLeaves,
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  /**
   * Get a single leave request by ID.
   */
  async getLeaveById(id: string | number) {
    return http.get<LeaveRequest>(LEAVE_API_PATHS.leaveById(id));
  }

  /**
   * Submit a new leave request.
   */
  async requestLeave(payload: CreateLeaveRequestPayload) {
    return http.post<LeaveRequest>(LEAVE_API_PATHS.request, payload);
  }

  /**
   * Approve a leave request (Manager/Admin).
   */
  async approveLeave(payload: ApproveLeavePayload) {
    return http.post<LeaveRequest>(LEAVE_API_PATHS.approve, payload);
  }

  /**
   * Reject a leave request (Manager/Admin).
   */
  async rejectLeave(payload: RejectLeavePayload) {
    return http.post<LeaveRequest>(LEAVE_API_PATHS.reject, payload);
  }

  /**
   * Cancel a pending leave request (User).
   */
  async cancelLeave(payload: CancelLeavePayload) {
    return http.post<LeaveRequest>(LEAVE_API_PATHS.cancel, payload);
  }

  /**
   * Get leave balances for a user or current logged-in user.
   */
  async getLeaveBalances(userId?: string) {
    return http.get<LeaveBalance[]>(LEAVE_API_PATHS.balances, userId ? { userId } : undefined);
  }

  /**
   * Get leave summary statistics.
   */
  async getLeaveSummary() {
    return http.get<LeaveStats>(LEAVE_API_PATHS.summary);
  }

  /**
   * Get available leave policy types.
   */
  async getLeaveTypes() {
    return http.get<LeaveTypeOption[]>(LEAVE_API_PATHS.types);
  }
}

export const leaveService = new LeaveService();
