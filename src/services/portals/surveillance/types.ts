export type SurveillanceRole =
  | "admin"
  | "market_manager"
  | "district_manager"
  | "surveillance_manager"
  | "manager"
  | "state_manager"
  | "store_manager"
  | "surveillance_agent"
  | "user";

export type SurveillanceRequestStatus =
  | "Requested"
  | "Pending"
  | "Completed"
  | "Report Requested"
  | "Report Received"
  | "Approved"
  | "Rejected";

export type SurveillancePriority = "low" | "medium" | "high";

export interface SurveillanceRequest {
  id: string;
  storeId: string;
  storeName: string;
  storeNumber?: string;
  marketName: string;
  districtName: string;
  incidentDate: string;
  shift: string;
  investigationType: string;
  priority: SurveillancePriority;
  title: string;
  requestedBy: string;
  requestedById: string;
  requesterRole: string;
  requesterEmail?: string;
  requesterPhone?: string;
  requesterDepartment?: string;
  areasToReview: string[];
  notes?: string;
  status: SurveillanceRequestStatus;
  createdAt: string;
  updatedAt?: string;
  assignedAt?: string;
  surveyStartsAt?: string;
  surveyEndsAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  linkedReportId?: string;

  // Prepared By / Submitter Details
  preparedBy?: string;
  preparedById?: string;
  preparedByEmail?: string;
  preparedByPhone?: string;
  preparedByRole?: string;
  preparedByDepartment?: string;
  preparedAt?: string;

  // Manager Review & Rating on Report
  reportApprovedBy?: string;
  reportApprovedAt?: string;
  reportStatus?: "Approved" | "Rejected" | "Pending Review";
  managerRating?: number; // 1 to 5 stars (optional)
  managerComments?: string;
}

export interface SurveillanceAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface SurveillanceAdditionalInvoice {
  id: string;
  invoice: string;
  bdiTime: string;
  transType: string;
  invoiceAmount: string;
  totalTaken: string;
  difference: string;
  paymentType: string;
  cash?: string;
  card?: string;
  receipt: string;
}

export interface SurveillanceAuditRow {
  id: string;
  customerGroupId?: string;
  additionalInvoices?: SurveillanceAdditionalInvoice[];
  date: string;
  marketName?: string;
  storeName: string;
  invoice: string;
  cashTime: string;
  time: string;
  bdiTime: string;
  salesRep: string;
  transType: string;
  transTypeDetails?: string;
  // Number of units sold - only meaningful when transType includes a device
  // type (Phone/Tablet/HINT).
  deviceQuantity?: string;
  clientType?: string; // "Buyer" | "Non-Buyer" | "Custom" | ""
  clientTypeDetails?: string;
  nb: string; // "NB" or ""
  b: string; // "B" or ""
  invoiceAmount: string;
  totalTaken: string;
  paymentType?: string; // "Card" | "Cash" | "Mix Payment" | ""
  cash: string;
  card: string;
  difference: string;
  receipt: string; // "YES", "NO", "Custom", or ""
  receiptDetails?: string;
  splitPayments: string;
  fraudTransactions: string;
  fraudTransactionsDetails?: string;
  refundInvoice: string;
  missOpportunity: string;
  missOpportunityDetails?: string;
  paymentFraud: string;
  paymentFraudDetails?: string;
  aalSwap: string;
  aalSwapDetails?: string;
  mim: string;
  mimDetails?: string;
  notes: string;
  pitchNb: string;
  pitchNbDetails?: string;
  pitchNotes: string;
  pitchQuality: string;
  pitchQualityDetails?: string;
  showingPhone: string;
  showingPhoneDetails?: string;
  accOffered: string;
  accOfferedDetails?: string;
  maximize: string;
  maximizeDetails?: string;
  flipping: string;
  flippingDetails?: string;
  bundleNb: string;
  bundleStartB: string;
  bundleEndB: string;
  bundleAccGiven: string;
  bundleAccGivenDetails?: string;
  portIn: string;
  portInDetails?: string;
  nonUp: string;
  nonUpDetails?: string;
  smartPayMentioned: string;
  smartPayMentionedDetails?: string;
  aalBillSame: string;
  aalBillSameDetails?: string;
  onlineRejectedPayment: string;
  onlineRejectedPaymentDetails?: string;
  nameOfRepLeaving: string;
  timeLeft: string;
  timeReturned: string;
  backRoomTimeIn: string;
  backRoomTimeOut: string;
  offline: string;
  offlineDetails?: string;
  otherDetails?: Record<string, string>;
  attachments?: SurveillanceAttachment[];
  rowHighlight?: "opening" | "amber" | "green" | "violation";
}

export interface SurveillanceRepTiming {
  id: string;
  repName?: string;
  timingType?: "Store Left" | "Back Room";
  timeIn?: string;
  timeOut?: string;
  totalTime?: string;
}

export interface SurveillanceCameraLog {
  id: string;
  cameraName?: string;
  onlineTime?: string;
  offlineTime?: string;
}

export interface SavedAuditRowRecord {
  requestId: string;
  row: SurveillanceAuditRow;
  rowOrder: number;
  savedAt: string;
}

export type SurveillanceRepTimingType = "Store Left" | "Back Room";

export interface SurveillanceSessionRepTimingRow {
  id: string;
  repName: string;
  timingType: SurveillanceRepTimingType;
  timeIn: string;
  timeOut: string;
  totalTime?: string;
}

export interface SurveillanceSessionCameraUptimeRow {
  id: string;
  cameraName: string;
  onlineTime: string;
  offlineTime: string;
}

/**
 * Everything in the audit form that isn't a per-row entry: the one-time
 * header fields plus the Floor Presence / Camera Uptime sections. Saved
 * alongside the per-row MMKV drafts so an agent can pause a surveillance
 * audit mid-way (close the form, do something else) and pick up exactly
 * where they left off later - not just the audit rows.
 */
export interface SurveillanceAuditSessionMeta {
  requestId: string;
  headerStoreOpenTime: string;
  headerStoreCloseTime: string;
  headerGeneralNotes: string;
  loomisMachineUrl?: string;
  safeLockerUrl?: string;
  differenceNotes?: string;
  repTimingRows: SurveillanceSessionRepTimingRow[];
  cameraUptimeRows: SurveillanceSessionCameraUptimeRow[];
  isFloorPresenceEnabled: boolean;
  isCameraUptimeEnabled: boolean;
  savedAt: string;
}

export interface ActiveSurveillanceDraftSession {
  requestId: string;
  isEditing: boolean;
  updatedAt: string;
}

export interface SurveillanceBadPitchItem {
  repName?: string;
  description: string;
  link?: string;
}

export interface SurveillanceRepIntervalLog {
  repName: string;
  intervals: Array<{
    start: string;
    end: string;
  }>;
}

export interface SurveillanceReportSummaryMeta {
  loomisMachineVisible?: "Yes" | "No" | string;
  loomisLink?: string;
  safeLockerVisible?: "Yes" | "No" | string;
  safeLockerLink?: string;
  badPitchItems?: SurveillanceBadPitchItem[];
  repLeavingLogs?: SurveillanceRepIntervalLog[];
  backroomLogs?: SurveillanceRepIntervalLog[];
  paymentsMadeOnline?: "Yes" | "No";
  paymentsRejected?: "Yes" | "No";
  generalOtherNotes?: string;
  amountDifferenceOverride?: string;
  // Required when the summed difference across all audit rows is more than
  // +/- $5 - see SurveillanceReportsPage's totals footer.
  reasonForDifference?: string;
  qaName?: string;
}

export interface SurveillanceReport {
  id: string;
  requestId: string;
  investigatorName: string;
  investigatorId?: string;
  investigatorEmail?: string;
  investigatorPhone?: string;
  investigatorRole?: string;
  investigatorDepartment?: string;
  submittedAt: string;
  // "Draft" = progressively saved while the agent is still conducting the
  // audit, real DB state (not just this browser's local storage) - set by
  // the "Save" button on the first audit row, cleared to "Report Received"
  // only on final Submit Report.
  status: "Draft" | "Report Received" | "Approved" | "Rejected";

  // Multi-row Surveillance Audit Log Entries
  rows?: SurveillanceAuditRow[];

  // Report-level logs, not tied to any audit row (floor presence / camera uptime)
  repTimings?: SurveillanceRepTiming[];
  cameraLogs?: SurveillanceCameraLog[];

  // Optional supplemental summary metadata
  summaryMeta?: SurveillanceReportSummaryMeta;

  // Summary / Primary Audit Form Attributes
  date: string;
  marketName?: string;
  storeName: string;
  storeOpenTime?: string;
  storeCloseTime?: string;
  invoiceNo: string;
  cashTime: string;
  time: string;
  bdiTime: string;
  salesRep: string;
  transType: string;
  transTypeDetails?: string;
  deviceQuantity?: string;
  clientType: "Buyer" | "Non-Buyer" | "Billable" | "Non Billable" | "Custom" | string;
  clientTypeDetails?: string;
  invoiceAmount: string;
  totalTaken: string;
  paymentMode: "Cash" | "Card" | "Split" | string;
  difference: string;
  receipt: "Yes" | "No" | "Custom" | string;
  receiptDetails?: string;
  splitPayments: "Yes" | "No" | string;
  fraudTransactions: "Yes" | "No" | "Custom" | string;
  fraudTransactionsDetails?: string;
  refundInvoice: "Yes" | "No" | string;
  missOpportunity: "Yes" | "No" | "Custom" | string;
  missOpportunityDetails?: string;
  paymentFraud: "Yes" | "No" | "Custom" | string;
  paymentFraudDetails?: string;
  aalSwap: "Yes" | "No" | "Custom" | string;
  aalSwapDetails?: string;
  mim: "Yes" | "No" | "Custom" | string;
  mimDetails?: string;
  notes: string;
  pitchNb: string;
  pitchNbDetails?: string;
  pitchNotes: string;
  pitchQuality: "Good" | "Fair" | "Poor" | "Not Observed" | "AVG" | "Custom" | string;
  pitchQualityDetails?: string;
  showingPhone: "Yes" | "No" | "Custom" | string;
  showingPhoneDetails?: string;
  accOffered: "Yes" | "No" | "Custom" | string;
  accOfferedDetails?: string;
  maximize: "Yes" | "No" | "Custom" | string;
  maximizeDetails?: string;
  flipping: "Yes" | "No" | "Custom" | string;
  flippingDetails?: string;
  bundleNb: string;
  bundleStartB: string;
  bundleEndB: string;
  bundleAccGiven: "Yes" | "No" | "Custom" | string;
  bundleAccGivenDetails?: string;
  portIn: "Yes" | "No" | "Custom" | string;
  portInDetails?: string;
  nonUp: "Yes" | "No" | "Custom" | string;
  nonUpDetails?: string;
  smartPayMentioned: "Yes" | "No" | "Custom" | string;
  smartPayMentionedDetails?: string;
  aalBillSame: "Yes" | "No" | "Custom" | string;
  aalBillSameDetails?: string;
  onlineRejectedPayment: "Yes" | "No" | "Custom" | string;
  onlineRejectedPaymentDetails?: string;
  nameOfRepLeaving: string;
  timeLeft: string;
  timeReturned: string;
  backRoomTimeIn: string;
  backRoomTimeOut: string;
  offline: "Yes" | "No" | "Custom" | string;
  offlineDetails?: string;

  // Optional video observations & attachments
  attachments?: SurveillanceAttachment[];

  // Review / rating
  managerRating?: number; // 1-5 optional
  managerComments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface CreateSurveillanceRequestPayload {
  storeId: string;
  storeName: string;
  storeNumber?: string;
  marketName: string;
  districtName: string;
  incidentDate: string;
  shift: string;
  investigationType: string;
  priority: SurveillancePriority;
  title: string;
  areasToReview: string[];
  notes?: string;
}

export interface CreateSurveillanceReportPayload {
  requestId: string;
  rows?: SurveillanceAuditRow[];
  repTimings?: SurveillanceRepTiming[];
  cameraLogs?: SurveillanceCameraLog[];
  summaryMeta?: SurveillanceReportSummaryMeta;
  date: string;
  marketName?: string;
  storeName: string;
  storeOpenTime?: string;
  storeCloseTime?: string;
  invoiceNo: string;
  cashTime: string;
  time: string;
  bdiTime: string;
  salesRep: string;
  transType: string;
  transTypeDetails?: string;
  deviceQuantity?: string;
  clientType: "Buyer" | "Non-Buyer" | "Billable" | "Non Billable" | "Custom" | string;
  clientTypeDetails?: string;
  invoiceAmount: string;
  totalTaken: string;
  paymentMode: "Cash" | "Card" | "Split" | string;
  difference: string;
  receipt: "Yes" | "No" | "Custom" | string;
  receiptDetails?: string;
  splitPayments: "Yes" | "No" | string;
  fraudTransactions: "Yes" | "No" | "Custom" | string;
  fraudTransactionsDetails?: string;
  refundInvoice: "Yes" | "No" | string;
  missOpportunity: "Yes" | "No" | "Custom" | string;
  missOpportunityDetails?: string;
  paymentFraud: "Yes" | "No" | "Custom" | string;
  paymentFraudDetails?: string;
  aalSwap: "Yes" | "No" | "Custom" | string;
  aalSwapDetails?: string;
  mim: "Yes" | "No" | "Custom" | string;
  mimDetails?: string;
  notes: string;
  pitchNb: string;
  pitchNbDetails?: string;
  pitchNotes: string;
  pitchQuality: "Good" | "Fair" | "Poor" | "Not Observed" | "AVG" | "Custom" | string;
  pitchQualityDetails?: string;
  showingPhone: "Yes" | "No" | "Custom" | string;
  showingPhoneDetails?: string;
  accOffered: "Yes" | "No" | "Custom" | string;
  accOfferedDetails?: string;
  maximize: "Yes" | "No" | "Custom" | string;
  maximizeDetails?: string;
  flipping: "Yes" | "No" | "Custom" | string;
  flippingDetails?: string;
  bundleNb: string;
  bundleStartB: string;
  bundleEndB: string;
  bundleAccGiven: "Yes" | "No" | "Custom" | string;
  bundleAccGivenDetails?: string;
  portIn: "Yes" | "No" | "Custom" | string;
  portInDetails?: string;
  nonUp: "Yes" | "No" | "Custom" | string;
  nonUpDetails?: string;
  smartPayMentioned: "Yes" | "No" | "Custom" | string;
  smartPayMentionedDetails?: string;
  aalBillSame: "Yes" | "No" | "Custom" | string;
  aalBillSameDetails?: string;
  onlineRejectedPayment: "Yes" | "No" | "Custom" | string;
  onlineRejectedPaymentDetails?: string;
  nameOfRepLeaving: string;
  timeLeft: string;
  timeReturned: string;
  backRoomTimeIn: string;
  backRoomTimeOut: string;
  offline: "Yes" | "No" | "Custom" | string;
  offlineDetails?: string;
  attachments?: SurveillanceAttachment[];
}

// Sent by the audit row "Save" button - creates the report (real DB row,
// Status "Draft") on the first call for a request and reuses it on every
// call after, upserting the single row being saved.
export interface SaveReportProgressPayload {
  requestId: string;
  date?: string;
  marketName?: string;
  storeName?: string;
  storeOpenTime?: string;
  storeCloseTime?: string;
  notes?: string;
  summaryMeta?: SurveillanceReportSummaryMeta;
  row: SurveillanceAuditRow;
}

/** Check user role for the Surveillance portal across all system roles */
export function getSurveillanceRole(user: any): SurveillanceRole | "other" {
  let storedUser: any = null;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("user");
      if (raw) storedUser = JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }

  const effectiveUser = user || storedUser;
  if (!effectiveUser) return "other";

  const norm = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/[\s_-]/g, "");

  let rawRole = "";

  // 1. Check portalAccess array for Surveillance portal entry first
  const accessList = Array.isArray(effectiveUser.portalAccess)
    ? effectiveUser.portalAccess
    : Array.isArray(storedUser?.portalAccess)
      ? storedUser.portalAccess
      : [];

  const entry = accessList.find((p: any) => norm(p?.portalName || "").includes("surveil"));
  if (entry && entry.roleName) {
    rawRole = norm(entry.roleName);
  }

  // 2. Fallback to explicit user role if no Surveillance-specific portalAccess entry exists
  if (!rawRole) {
    const fallbackRoleStr =
      effectiveUser.rawRoleName ??
      effectiveUser.role?.name ??
      (typeof effectiveUser.role === "string" ? effectiveUser.role : undefined) ??
      storedUser?.role?.name ??
      storedUser?.roleName ??
      (typeof storedUser?.role === "string" ? storedUser.role : undefined) ??
      (!storedUser ? effectiveUser.roleName : undefined) ??
      "";
    rawRole = norm(fallbackRoleStr);
  }

  if (!rawRole) return "other";

  if (rawRole === "admin") return "admin";
  if (rawRole === "statemanager" || rawRole === "state_manager") return "state_manager";
  if (rawRole === "marketmanager" || rawRole === "market_manager") return "market_manager";
  if (rawRole === "districtmanager" || rawRole === "district_manager") return "district_manager";
  if (rawRole === "surveillancemanager" || rawRole === "surveillance_manager")
    return "surveillance_manager";
  if (rawRole === "surveillanceagent" || rawRole === "surveillance_agent")
    return "surveillance_agent";

  // All remaining roles (manager, storemanager, user, backoffice, rep, trainer, etc.) have no access
  return "other";
}

/** Check whether user strictly has the 'surveillance_agent' role for the Surveillance portal */
export function isSurveillanceUserRole(user: any): boolean {
  const role = getSurveillanceRole(user);
  return role === "surveillance_agent";
}

/**
 * Roles with full access to all 3 Surveillance portal pages:
 * Only Admin has full access to all 3 pages
 */
export function hasFullSurveillanceAccess(role: SurveillanceRole | "other"): boolean {
  return role === "admin";
}

/**
 * Page 1: Request Reports (/surveillance/requests)
 * Accessible to: admin, state_manager, market_manager, district_manager, surveillance_manager
 */
export function canRequestSurveillance(role: SurveillanceRole | "other"): boolean {
  return (
    role === "admin" ||
    role === "state_manager" ||
    role === "market_manager" ||
    role === "district_manager" ||
    role === "surveillance_manager"
  );
}

/**
 * Page 2: Validate and Assign (/surveillance/validate-and-assign)
 * Accessible to: admin, surveillance_manager
 */
export function canValidateSurveillance(role: SurveillanceRole | "other"): boolean {
  return role === "admin" || role === "surveillance_manager";
}

/**
 * Page 3: Submit Report (/surveillance/reports)
 * Accessible to: admin, surveillance_agent
 */
export function canAccessSurveillanceReports(role: SurveillanceRole | "other"): boolean {
  return role === "admin" || role === "surveillance_agent";
}

/**
 * Review / Approve / Reject submitted surveillance audit reports
 * Accessible to validator roles (admin, surveillance_manager)
 */
export function canApproveSurveillance(role: SurveillanceRole | "other"): boolean {
  return role === "admin" || role === "surveillance_manager";
}

/** Check whether user has the Admin role in the Surveillance portal */
export function isSurveillanceAdmin(user: any): boolean {
  return getSurveillanceRole(user) === "admin";
}

/** Resolve default landing path inside the Surveillance portal for any role */
export function getSurveillanceDefaultRoute(user: any): string {
  const role = getSurveillanceRole(user);
  if (canRequestSurveillance(role)) return "/surveillance/requests";
  if (canAccessSurveillanceReports(role)) return "/surveillance/reports";
  return "/surveillance/no-access";
}

export type SurveillanceValidationStatus =
  | "Unassigned"
  | "Assigned"
  | "Request Rejected"
  | "Pending Verification"
  | "Report Rejected"
  | "Rejected"
  | "Completed";

export interface SurveillanceSalesRep {
  ntid: string;
  fullName: string;
  designation?: string;
}

export interface SurveillanceAssignableAgent {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  activeAssignments: number;
}

export interface SurveillanceMarketOption {
  id: number;
  name: string;
  state?: {
    id: number;
    name: string;
    symbol?: string;
  };
  storeCount?: number;
}

export interface SurveillanceValidationItem {
  id: string;
  storeId: string;
  storeName: string;
  storeNumber?: string;
  marketName: string;
  districtName: string;
  surveillanceDate: string; // ISO YYYY-MM-DD
  priority: SurveillancePriority;
  title: string;
  notes?: string;
  requestedBy: string;
  requesterRole: string;
  requesterEmail: string;
  requesterPhone: string;
  requesterDepartment: string;
  createdAt: string;
  validationStatus: SurveillanceValidationStatus;

  // Populated when validated and assigned to an agent
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentEmail?: string;
  assignedAgentPhone?: string;
  assignedAgentRole?: string;
  assignedBy?: string;
  assignedAt?: string;
  adminInstructions?: string;

  // Populated when rejected / cancelled by validator before assignment (hidden from agents)
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  // Populated when the assigned agent prepares and submits the surveillance report back for validator review
  linkedReportId?: string;
  reportSubmittedAt?: string;
  reportStatus?: "Pending Review" | "Approved" | "Rejected";
  reportReviewedBy?: string;
  reportReviewedAt?: string;
  surveyStartsAt?: string;
  surveyEndsAt?: string;
  managerRating?: number;
  managerComments?: string;

  // Every assign/reassign for this request, oldest first - lets the
  // Validate & Assign table show every agent who has touched it, not just
  // the current one, when a manager reassigns mid-audit.
  assignmentHistory?: SurveillanceAssignmentHistoryItem[];
}

export interface SurveillanceAssignmentHistoryItem {
  agentName?: string;
  agentEmail?: string;
  assignedByName?: string;
  assignedAt: string;
}

export interface ValidateAndAssignPayload {
  requestId: string;
  agentId: string;
  priority?: SurveillancePriority;
  adminInstructions?: string;
}

export interface RejectValidationPayload {
  requestId: string;
  reason: string;
}

export interface ReviewSubmittedReportPayload {
  action: "approve" | "reject";
  rating?: number;
  comments?: string;
}
