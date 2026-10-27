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
  storeName: string;
  invoice: string;
  cashTime: string;
  time: string;
  bdiTime: string;
  salesRep: string;
  transType: string;
  clientType?: string; // "Buyer" | "Non-Buyer" | ""
  nb: string; // "NB" or ""
  b: string; // "B" or ""
  invoiceAmount: string;
  totalTaken: string;
  paymentType?: string; // "Card" | "Cash" | "Mix Payment" | ""
  cash: string;
  card: string;
  difference: string;
  receipt: string; // "YES", "NO", "Other", or ""
  splitPayments: string;
  fraudTransactions: string;
  refundInvoice: string;
  missOpportunity: string;
  paymentFraud: string;
  aalSwap: string;
  mim: string;
  notes: string;
  pitchNb: string;
  pitchQuality: string;
  pitchNotes: string;
  showingPhone: string;
  accOffered: string;
  maximize: string;
  flipping: string;
  bundleNb: string;
  bundleStartB: string;
  bundleEndB: string;
  bundleAccGiven: string;
  portIn: string;
  nonUp: string;
  smartPayMentioned: string;
  aalBillSame: string;
  onlineRejectedPayment: string;
  nameOfRepLeaving: string;
  timeLeft: string;
  timeReturned: string;
  backRoomTimeIn: string;
  backRoomTimeOut: string;
  offline: string;
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
  storeName: string;
  invoiceNo: string;
  cashTime: string;
  time: string;
  bdiTime: string;
  salesRep: string;
  transType: string;
  clientType: "Buyer" | "Non-Buyer" | "Billable" | "Non Billable";
  invoiceAmount: string;
  totalTaken: string;
  paymentMode: "Cash" | "Card" | "Split";
  difference: string;
  receipt: "Yes" | "No" | string;
  splitPayments: "Yes" | "No" | string;
  fraudTransactions: "Yes" | "No" | string;
  refundInvoice: "Yes" | "No" | string;
  missOpportunity: "Yes" | "No" | string;
  paymentFraud: "Yes" | "No" | string;
  aalSwap: "Yes" | "No" | string;
  mim: "Yes" | "No" | string;
  notes: string;
  pitchNb: string;
  pitchQuality: "Good" | "Fair" | "Poor" | "Not Observed" | "AVG" | string;
  pitchNotes: string;
  showingPhone: "Yes" | "No" | string;
  accOffered: "Yes" | "No" | string;
  maximize: "Yes" | "No" | string;
  flipping: "Yes" | "No" | string;
  bundleNb: string;
  bundleStartB: string;
  bundleEndB: string;
  bundleAccGiven: "Yes" | "No" | string;
  portIn: "Yes" | "No" | string;
  nonUp: "Yes" | "No" | string;
  smartPayMentioned: "Yes" | "No" | string;
  aalBillSame: "Yes" | "No" | string;
  onlineRejectedPayment: "Yes" | "No" | string;
  nameOfRepLeaving: string;
  timeLeft: string;
  timeReturned: string;
  backRoomTimeIn: string;
  backRoomTimeOut: string;
  offline: "Yes" | "No" | string;

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
  storeName: string;
  invoiceNo: string;
  cashTime: string;
  time: string;
  bdiTime: string;
  salesRep: string;
  transType: string;
  clientType: "Buyer" | "Non-Buyer" | "Billable" | "Non Billable";
  invoiceAmount: string;
  totalTaken: string;
  paymentMode: "Cash" | "Card" | "Split";
  difference: string;
  receipt: "Yes" | "No" | string;
  splitPayments: "Yes" | "No" | string;
  fraudTransactions: "Yes" | "No" | string;
  refundInvoice: "Yes" | "No" | string;
  missOpportunity: "Yes" | "No" | string;
  paymentFraud: "Yes" | "No" | string;
  aalSwap: "Yes" | "No" | string;
  mim: "Yes" | "No" | string;
  notes: string;
  pitchNb: string;
  pitchQuality: "Good" | "Fair" | "Poor" | "Not Observed" | "AVG" | string;
  pitchNotes: string;
  showingPhone: "Yes" | "No" | string;
  accOffered: "Yes" | "No" | string;
  maximize: "Yes" | "No" | string;
  flipping: "Yes" | "No" | string;
  bundleNb: string;
  bundleStartB: string;
  bundleEndB: string;
  bundleAccGiven: "Yes" | "No" | string;
  portIn: "Yes" | "No" | string;
  nonUp: "Yes" | "No" | string;
  smartPayMentioned: "Yes" | "No" | string;
  aalBillSame: "Yes" | "No" | string;
  onlineRejectedPayment: "Yes" | "No" | string;
  nameOfRepLeaving: string;
  timeLeft: string;
  timeReturned: string;
  backRoomTimeIn: string;
  backRoomTimeOut: string;
  offline: "Yes" | "No" | string;
  attachments?: SurveillanceAttachment[];
}

/** Check user role for surveillance portal */
export function getSurveillanceRole(user: any): SurveillanceRole {
  if (!user) return "user";

  const norm = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/[\s_-]/g, "");

  // 1. Check portalAccess array
  if (Array.isArray(user.portalAccess)) {
    const entry = user.portalAccess.find((p: any) =>
      norm(p?.portalName || "").includes("surveil"),
    );
    if (entry?.roleName) {
      const r = norm(entry.roleName);
      if (r.includes("admin")) return "admin";
      if (r.includes("state")) return "state_manager";
      if (r.includes("market")) return "market_manager";
      if (r.includes("district")) return "district_manager";
      return "user";
    }
  }

  // 2. Check general user roleName / role
  const rawRole = norm(user.roleName || user.role || "");
  if (rawRole.includes("admin")) return "admin";
  if (rawRole.includes("state")) return "state_manager";
  if (rawRole.includes("market")) return "market_manager";
  if (rawRole.includes("district")) return "district_manager";

  return "user";
}

/** Check whether user strictly has the 'user' role for the surveillance portal */
export function isSurveillanceUserRole(user: any): boolean {
  if (!user) return false;

  const norm = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/[\s_-]/g, "");

  if (Array.isArray(user.portalAccess)) {
    const entry = user.portalAccess.find((p: any) =>
      norm(p?.portalName || "").includes("surveil"),
    );
    if (entry?.roleName) {
      return norm(entry.roleName) === "user";
    }
  }

  const rawRole = norm(user.roleName || user.role || "");
  return rawRole === "user";
}

export function canRequestSurveillance(role: SurveillanceRole): boolean {
  return (
    role === "admin" ||
    role === "state_manager" ||
    role === "market_manager" ||
    role === "district_manager"
  );
}

export function canApproveSurveillance(role: SurveillanceRole): boolean {
  // District manager can only VIEW, NOT approve!
  // Only admin, state manager, market manager can approve
  return role === "admin" || role === "state_manager" || role === "market_manager";
}
