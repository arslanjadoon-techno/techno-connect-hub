export type Role =
  | "user"
  | "manager"
  | "market_manager"
  | "district_manager"
  | "state_manager"
  | "store_manager"
  | "admin";

export type Department =
  "Finance" | "Maintenance" | "IT" | "HR" | "Operations" | "Marketing" | (string & {});

export const ALL_DEPARTMENTS: string[] = [
  "Finance",
  "Maintenance",
  "IT",
  "HR",
  "Operations",
  "Marketing",
];

export const ALL_ROLES: { value: Role; label: string }[] = [
  { value: "user", label: "User" },
  { value: "manager", label: "Manager" },
  { value: "market_manager", label: "Market Manager" },
  { value: "district_manager", label: "District Manager" },
  { value: "state_manager", label: "State Manager" },
  { value: "store_manager", label: "Store Manager" },
  { value: "admin", label: "Admin" },
];

export interface GetUsersParams {
  page?: number;
  size?: number;
  department?: string;
  portal?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string | null;
  department: string | null;
  departmentName?: string;

  roleName?: Role;

  assignedPortals?: string[];
  allowedUserManagement?: boolean;

  portalAccess?: Array<{
    portalId: number;
    portalName: string;
    roleId: number;
    roleName: string;
  }>;

  states?: Array<{ id: number | string; name: string }>;
  districts?: Array<{ id: number | string; name: string }>;
  markets?: Array<{ id: number | string; name: string }>;
  stores?: Array<{ id: number | string; name: string }>;
  houses?: Array<{ id: number | string; name: string }>;

  // Fallbacks for older references
  stateId?: string;
  stateName?: string;
  districtId?: string;
  districtName?: string;
  marketId?: string;
  marketName?: string;
  storeId?: string;
  storeName?: string;

  avatarColor?: string;
  avatarUrl?: string;
  active?: boolean;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  body: string;
  link?: string;
  createdAt: string;
  read: boolean;
}

export interface State {
  id: string;
  name: string;
  code: string;
}

export interface Market {
  id: number;
  name: string;
  state: {
    id: number;
    name: string;
  };
  district: {
    id: number;
    name: string;
  };
}

export interface District {
  id: string;
  name: string;
  stateId: string;
  marketId: string;
}

export interface Store {
  id: string;
  name: string;
  number: string;
  phone: string;
  stateId: string;
  districtId: string;
  marketId: string;
  address: string;
}

export interface House {
  id: string;
  name: string;
  phone: string;
  stateId: string;
  districtId: string;
  marketId: string;
  address: string;
}

export type TicketStatus = "pending" | "assigned" | "completed" | "hold" | "closed" | "reopen";

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "store" | "house";
export type AssignType = "internal" | "external";

export interface TicketComment {
  id: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  locationId: string;
  department: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignType?: AssignType;
  assigneeId?: string;
  externalVendorId?: string;
  stateId: string;
  marketId?: string;
  districtId?: string;
  history: { status: TicketStatus; at: string; by: string }[];
  comments: TicketComment[];
}

export interface ExternalVendor {
  id: string;
  name: string;
  phone: string;
  marketId: string;
  address: string;
  workNature: string;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  department?: string;
  memberIds: string[];
}

export const STATUS_META: Record<TicketStatus, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "bg-warning/15 text-warning-foreground border-warning/30" },
  assigned: { label: "Assigned", tone: "bg-info/15 text-info border-info/30" },
  completed: { label: "Completed", tone: "bg-success/15 text-success border-success/30" },
  hold: { label: "On Hold", tone: "bg-muted text-muted-foreground border-border" },
  closed: { label: "Closed", tone: "bg-primary/15 text-primary border-primary/30" },
  reopen: { label: "Re-opened", tone: "bg-destructive/15 text-destructive border-destructive/30" },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; tone: string }> = {
  low: { label: "Low", tone: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", tone: "bg-info/15 text-info" },
  high: { label: "High", tone: "bg-warning/20 text-warning-foreground" },
  urgent: { label: "Urgent", tone: "bg-destructive/15 text-destructive" },
};

// ================= Leave Management Portal Types ================= //
export type LeaveType =
  | "Casual Leave"
  | "Sick Leave"
  | "Annual Leave"
  | "Unpaid Leave"
  | "Maternity Leave"
  | "Paternity Leave"
  | "Bereavement Leave"
  | "Emergency Leave";

export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userNtid?: string;
  department?: string;
  marketName?: string;
  storeName?: string;
  leaveType: LeaveType | string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay?: boolean;
  halfDayPeriod?: "First Half" | "Second Half";
  reason: string;
  emergencyContact?: string;
  status: LeaveStatus;
  appliedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  managerNotes?: string;
  attachmentName?: string;
}

export interface LeaveBalance {
  leaveType: LeaveType | string;
  totalAllowed: number;
  used: number;
  pending: number;
  remaining: number;
  color?: string;
}

export interface LeaveStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  onLeaveToday: number;
}

export const LEAVE_STATUS_META: Record<LeaveStatus, { label: string; tone: string; dot: string }> = {
  Pending: {
    label: "Pending",
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500",
  },
  Approved: {
    label: "Approved",
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  Rejected: {
    label: "Rejected",
    tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    dot: "bg-rose-500",
  },
  Cancelled: {
    label: "Cancelled",
    tone: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
};
