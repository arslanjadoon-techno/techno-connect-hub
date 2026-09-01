import type { LeaveBalance, LeaveRequest, LeaveStats, LeaveStatus, LeaveType } from "@/lib/types";

export interface LeaveQueryParams {
  page?: number;
  size?: number;
  status?: LeaveStatus | "All";
  leaveType?: LeaveType | "All" | string;
  userId?: string;
  department?: string;
  marketId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CreateLeaveRequestPayload {
  leaveType: LeaveType | string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayPeriod?: "First Half" | "Second Half";
  reason: string;
  emergencyContact?: string;
  attachmentName?: string;
}

export interface ApproveLeavePayload {
  leaveId: string | number;
  managerNotes?: string;
}

export interface RejectLeavePayload {
  leaveId: string | number;
  rejectionReason: string;
  managerNotes?: string;
}

export interface CancelLeavePayload {
  leaveId: string | number;
  reason?: string;
}

export interface LeaveTypeOption {
  id: string;
  name: string;
  description: string;
  allowedDays: number;
  isPaid: boolean;
  requiresAttachment?: boolean;
}
