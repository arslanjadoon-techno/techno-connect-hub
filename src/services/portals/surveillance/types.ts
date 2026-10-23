export type SurveillanceRole = "admin" | "state_manager" | "market_manager" | "district_manager" | "user";

export type SurveillanceRequestStatus =
  | "pending_approval"
  | "approved"
  | "in_progress"
  | "report_submitted"
  | "rejected";

export type SurveillancePriority = "low" | "medium" | "high" | "urgent";

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
  reportStatus?: "approved" | "rejected" | "pending_review";
  managerRating?: number; // 1 to 5 stars (optional)
  managerComments?: string;
}

export interface SurveillanceAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface SurveillanceReport {
  id: string;
  requestId: string;
  storeName: string;
  storeNumber?: string;
  marketName: string;
  incidentDate: string;
  investigatorName: string;
  investigatorId: string;
  investigatorEmail?: string;
  investigatorPhone?: string;
  investigatorRole?: string;
  investigatorDepartment?: string;
  reviewDate: string;
  hoursReviewed: string;
  camerasReviewed: string[];
  footageQuality: "Clear" | "Partially Obstructed" | "Poor / Glitchy" | "No Coverage";
  incidentConfirmed: "Yes" | "No" | "Inconclusive";
  discrepancyAmount?: string;
  personsInvolved?: string;
  findings: string;
  recommendation: string;
  attachments?: SurveillanceAttachment[];
  submittedAt: string;
  status: "submitted" | "approved" | "rejected" | "under_review" | "closed";
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
  reviewDate: string;
  hoursReviewed: string;
  camerasReviewed: string[];
  footageQuality: "Clear" | "Partially Obstructed" | "Poor / Glitchy" | "No Coverage";
  incidentConfirmed: "Yes" | "No" | "Inconclusive";
  discrepancyAmount?: string;
  personsInvolved?: string;
  findings: string;
  recommendation: string;
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
