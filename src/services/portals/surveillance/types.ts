export type SurveillanceRole = "admin" | "state_manager" | "market_manager" | "district_manager" | "user";

export type SurveillanceRequestStatus =
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

export interface SurveillanceAuditRow {
  id: string;
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

export interface SavedAuditRowRecord {
  requestId: string;
  row: SurveillanceAuditRow;
  rowOrder: number;
  savedAt: string;
}

export interface ActiveSurveillanceDraftSession {
  requestId: string;
  isEditing: boolean;
  updatedAt: string;
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
  status: "Report Received" | "Approved" | "Rejected";

  // Multi-row Surveillance Audit Log Entries
  rows?: SurveillanceAuditRow[];

  // Summary / Primary Audit Form Attributes
  date: string;
  marketName?: string;
  storeName: string;
  invoiceNo: string;
  cashTime: string;
  time: string;
  bdiTime: string;
  salesRep: string;
  transType: string;
  transTypeDetails?: string;
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
  date: string;
  marketName?: string;
  storeName: string;
  invoiceNo: string;
  cashTime: string;
  time: string;
  bdiTime: string;
  salesRep: string;
  transType: string;
  transTypeDetails?: string;
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

/** Check user role for surveillance portal */
export function getSurveillanceRole(user: any): SurveillanceRole | "other" {
  if (!user) return "other";

  const norm = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/[\s_-]/g, "");

  let rawRole = "";

  // 1. Check portalAccess array for Surveillance portal entry first
  if (Array.isArray(user.portalAccess)) {
    const entry = user.portalAccess.find((p: any) =>
      norm(p?.portalName || "").includes("surveil"),
    );
    if (entry?.roleName) {
      rawRole = norm(entry.roleName);
    }
  }

  // 2. Fallback to general user roleName / role only if no Surveillance-specific roleName was found
  if (!rawRole) {
    rawRole = norm(user.roleName || user.role || "");
  }

  if (!rawRole) return "other";
  if (rawRole === "user") return "user";
  if (rawRole.includes("admin")) return "admin";
  if (rawRole.includes("statemanager") || rawRole === "state") return "state_manager";
  if (rawRole.includes("marketmanager") || rawRole === "market") return "market_manager";
  if (rawRole.includes("districtmanager") || rawRole === "district") return "district_manager";

  return "other";
}

/** Check whether user strictly has the 'user' role for the surveillance portal */
export function isSurveillanceUserRole(user: any): boolean {
  return getSurveillanceRole(user) === "user";
}

/**
 * Page 1: Request Reports (/surveillance/requests)
 * Accessible to: Admin, State Manager, Market Manager, District Manager
 */
export function canRequestSurveillance(role: SurveillanceRole | "other"): boolean {
  return (
    role === "admin" ||
    role === "state_manager" ||
    role === "market_manager" ||
    role === "district_manager"
  );
}

/**
 * Page 2: Validate and Assign (/surveillance/validate-and-assign)
 * Accessible to: Admin, State Manager, Market Manager (NOT District Manager or User)
 */
export function canValidateSurveillance(role: SurveillanceRole | "other"): boolean {
  return role === "admin" || role === "state_manager" || role === "market_manager";
}

/**
 * Page 3: Surveillance Reports (/surveillance/reports)
 * Accessible to: Admin and User
 */
export function canAccessSurveillanceReports(role: SurveillanceRole | "other"): boolean {
  return role === "admin" || role === "user";
}

export function canApproveSurveillance(role: SurveillanceRole | "other"): boolean {
  // District manager can only VIEW, NOT approve!
  // Only admin, state manager, market manager can approve
  return role === "admin" || role === "state_manager" || role === "market_manager";
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
  | "Pending Validation"
  | "Assigned"
  | "Report Submitted"
  | "Approved"
  | "Report Rejected"
  | "Rejected";

export interface SurveillanceAssignableAgent {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  activeAssignments: number;
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
  managerRating?: number;
  managerComments?: string;
}

export interface ValidateAndAssignPayload {
  requestId: string;
  agentId: string;
  priority: SurveillancePriority;
  adminInstructions?: string;
  assignedBy: string;
}

export interface RejectValidationPayload {
  requestId: string;
  reason: string;
  rejectedBy: string;
}

export interface ReviewSubmittedReportPayload {
  requestId: string;
  action: "approve" | "reject";
  reviewedBy: string;
  rating?: number;
  comments?: string;
}

