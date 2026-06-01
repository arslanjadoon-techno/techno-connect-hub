export type Role =
  | "user"
  | "manager"
  | "market_manager"
  | "district_manager"
  | "state_manager"
  | "store_manager"
  | "admin";

export type Department =
  | "Finance"
  | "Maintenance"
  | "IT"
  | "HR"
  | "Operations"
  | "Marketing";

export const ALL_DEPARTMENTS: Department[] = [
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

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: Department;
  role: Role;
  stateId?: string;
  districtId?: string;
  marketId?: string;
  storeId?: string;
  avatarColor?: string;
  avatarUrl?: string;
}

export interface AppNotification {
  id: string;
  userId?: string; // if undefined, visible to all
  title: string;
  body: string;
  link?: string;
  createdAt: string;
  read: boolean;
}

export interface State { id: string; name: string; code: string; }
export interface Market { id: string; name: string; stateId: string; }
export interface District { id: string; name: string; stateId: string; marketId: string; }
export interface Store {
  id: string;
  name: string;
  code: string;
  stateId: string;
  marketId: string;
  districtId: string;
  address: string;
}
export interface House {
  id: string;
  name: string;
  address: string;
  stateId: string;
}

export type TicketStatus =
  | "pending"
  | "assigned"
  | "completed"
  | "hold"
  | "closed"
  | "reopen";

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
  locationId: string; // storeId or houseId
  department: Department;
  priority: TicketPriority;
  status: TicketStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignType?: AssignType;
  assigneeId?: string;       // internal user id
  externalVendorId?: string; // external vendor id
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
  natureOfWork: string;
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
  department?: Department;
  memberIds: string[];
}

export const STATUS_META: Record<
  TicketStatus,
  { label: string; tone: string }
> = {
  pending:   { label: "Pending",   tone: "bg-warning/15 text-warning-foreground border-warning/30" },
  assigned:  { label: "Assigned",  tone: "bg-info/15 text-info border-info/30" },
  completed: { label: "Completed", tone: "bg-success/15 text-success border-success/30" },
  hold:      { label: "On Hold",   tone: "bg-muted text-muted-foreground border-border" },
  closed:    { label: "Closed",    tone: "bg-primary/15 text-primary border-primary/30" },
  reopen:    { label: "Re-opened", tone: "bg-destructive/15 text-destructive border-destructive/30" },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; tone: string }> = {
  low:    { label: "Low",    tone: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", tone: "bg-info/15 text-info" },
  high:   { label: "High",   tone: "bg-warning/20 text-warning-foreground" },
  urgent: { label: "Urgent", tone: "bg-destructive/15 text-destructive" },
};
