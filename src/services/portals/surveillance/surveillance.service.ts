import { http } from "../../http";
import { MMKV } from "@/lib/mmkv-storage";
import type {
  SurveillanceRequest,
  SurveillanceReport,
  SurveillanceAuditRow,
  SavedAuditRowRecord,
  ActiveSurveillanceDraftSession,
  CreateSurveillanceRequestPayload,
  CreateSurveillanceReportPayload,
  SurveillanceAssignableAgent,
  SurveillanceValidationItem,
  ValidateAndAssignPayload,
  RejectValidationPayload,
  ReviewSubmittedReportPayload,
} from "./types";
import {
  DUMMY_SURVEILLANCE_AGENTS,
  INITIAL_SURVEILLANCE_REPORTS,
  INITIAL_VALIDATION_REQUESTS,
} from "@/pages/portals/surveillance/surveillance-data";

const surveillanceDraftMMKV = new MMKV({
  id: "surveillance-audit-drafts",
});

// In-memory store for UI review of the Validate and Assign page until backend endpoints are ready
let validationQueueStore: SurveillanceValidationItem[] = INITIAL_VALIDATION_REQUESTS.map(
  (item) => ({ ...item }),
);
let assignableAgentsStore: SurveillanceAssignableAgent[] = DUMMY_SURVEILLANCE_AGENTS.map(
  (agent) => ({ ...agent }),
);
let dummyReportsStore: SurveillanceReport[] = INITIAL_SURVEILLANCE_REPORTS.map(
  (rep) => ({ ...rep }),
);

const ACTIVE_SESSION_KEY = "active-session";

/**
 * Surveillance Portal Service Class
 * Prepared for Surveillance portal backend endpoints and MMKV row-by-row draft persistence.
 */
export class SurveillanceService {
  private getRowKey(requestId: string, rowId: string): string {
    return `request:${requestId}:row:${rowId}`;
  }

  private getRequestIndexKey(requestId: string): string {
    return `request:${requestId}:row-index`;
  }

  /**
   * Persist a single audit row into MMKV storage so progress is preserved across reloads or power loss.
   */
  saveDraftRow(
    requestId: string,
    row: SurveillanceAuditRow,
    rowOrder: number,
  ): SavedAuditRowRecord {
    const savedAt = new Date().toISOString();
    const record: SavedAuditRowRecord = {
      requestId,
      row: {
        ...row,
        otherDetails: row.otherDetails ? { ...row.otherDetails } : undefined,
        attachments: row.attachments ? [...row.attachments] : undefined,
      },
      rowOrder,
      savedAt,
    };

    surveillanceDraftMMKV.setJSON(this.getRowKey(requestId, row.id), record);

    const indexKey = this.getRequestIndexKey(requestId);
    const currentIds = surveillanceDraftMMKV.getJSON<string[]>(indexKey) || [];
    if (!currentIds.includes(row.id)) {
      currentIds.push(row.id);
      surveillanceDraftMMKV.setJSON(indexKey, currentIds);
    }

    return record;
  }

  /**
   * Retrieve all MMKV-saved audit rows for a given surveillance request in saved row order.
   */
  getDraftRows(requestId: string): SavedAuditRowRecord[] {
    const indexKey = this.getRequestIndexKey(requestId);
    const indexedIds = surveillanceDraftMMKV.getJSON<string[]>(indexKey) || [];
    const prefix = `request:${requestId}:row:`;

    const allRowKeys = surveillanceDraftMMKV
      .getAllKeys()
      .filter((k) => k.startsWith(prefix));

    const orderedIds = Array.from(
      new Set([
        ...indexedIds,
        ...allRowKeys.map((k) => k.slice(prefix.length)),
      ]),
    );

    const records: SavedAuditRowRecord[] = [];
    for (const rowId of orderedIds) {
      const rec = surveillanceDraftMMKV.getJSON<SavedAuditRowRecord>(
        this.getRowKey(requestId, rowId),
      );
      if (rec && rec.row) {
        records.push(rec);
      }
    }

    return records.sort((a, b) => a.rowOrder - b.rowOrder);
  }

  /**
   * Remove a single audit row from MMKV storage when deleted from the form.
   */
  removeDraftRow(requestId: string, rowId: string): void {
    surveillanceDraftMMKV.delete(this.getRowKey(requestId, rowId));
    const indexKey = this.getRequestIndexKey(requestId);
    const currentIds = surveillanceDraftMMKV.getJSON<string[]>(indexKey) || [];
    const nextIds = currentIds.filter((id) => id !== rowId);
    if (nextIds.length > 0) {
      surveillanceDraftMMKV.setJSON(indexKey, nextIds);
    } else {
      surveillanceDraftMMKV.delete(indexKey);
    }
  }

  /**
   * Clear all MMKV-saved draft rows for a request once the final report is submitted.
   */
  clearRequestDraft(requestId: string): void {
    const prefix = `request:${requestId}:row:`;
    for (const key of surveillanceDraftMMKV.getAllKeys()) {
      if (key.startsWith(prefix)) {
        surveillanceDraftMMKV.delete(key);
      }
    }
    surveillanceDraftMMKV.delete(this.getRequestIndexKey(requestId));

    const active = this.getActiveDraftSession();
    if (active?.requestId === requestId) {
      this.clearActiveDraftSession();
    }
  }

  /**
   * Persist active editing session metadata in MMKV so an unexpected power-off or refresh restores context.
   */
  saveActiveDraftSession(requestId: string, isEditing: boolean): void {
    const session: ActiveSurveillanceDraftSession = {
      requestId,
      isEditing,
      updatedAt: new Date().toISOString(),
    };
    surveillanceDraftMMKV.setJSON(ACTIVE_SESSION_KEY, session);
  }

  getActiveDraftSession(): ActiveSurveillanceDraftSession | undefined {
    return surveillanceDraftMMKV.getJSON<ActiveSurveillanceDraftSession>(
      ACTIVE_SESSION_KEY,
    );
  }

  clearActiveDraftSession(): void {
    surveillanceDraftMMKV.delete(ACTIVE_SESSION_KEY);
  }

  /**
   * Fetch all surveillance report requests.
   * Also reflects any report reviews completed via the Validate and Assign workflow.
   */
  async getRequests(): Promise<SurveillanceRequest[]> {
    const res = await http.get<SurveillanceRequest[]>("/api/surveillance/requests");
    const serverRequests = Array.isArray(res.data) ? res.data : [];

    // Merge validated/accepted reports so accepted items appear on Request Reports with "Report Received" status
    const mergedMap = new Map<string, SurveillanceRequest>();
    for (const req of serverRequests) {
      mergedMap.set(req.id, { ...req });
    }

    for (const vItem of validationQueueStore) {
      if (vItem.validationStatus === "Approved") {
        const existing = mergedMap.get(vItem.id);
        if (existing) {
          mergedMap.set(vItem.id, {
            ...existing,
            status: "Report Received",
            reportStatus: "Approved",
            linkedReportId: vItem.linkedReportId || existing.linkedReportId,
            preparedBy: vItem.assignedAgentName || existing.preparedBy,
            preparedByEmail: vItem.assignedAgentEmail || existing.preparedByEmail,
            preparedByPhone: vItem.assignedAgentPhone || existing.preparedByPhone,
            preparedByRole: vItem.assignedAgentRole || existing.preparedByRole,
            preparedAt: vItem.reportSubmittedAt || existing.preparedAt,
            reportApprovedBy: vItem.reportReviewedBy || existing.reportApprovedBy,
            reportApprovedAt: vItem.reportReviewedAt || existing.reportApprovedAt,
            managerRating: vItem.managerRating ?? existing.managerRating,
            managerComments: vItem.managerComments ?? existing.managerComments,
          });
        } else {
          mergedMap.set(vItem.id, {
            id: vItem.id,
            storeId: vItem.storeId,
            storeName: vItem.storeName,
            storeNumber: vItem.storeNumber,
            marketName: vItem.marketName,
            districtName: vItem.districtName,
            incidentDate: vItem.surveillanceDate,
            shift: "Surveillance Review",
            investigationType: "Store Audit & Surveillance",
            priority: vItem.priority,
            title: vItem.title,
            requestedBy: vItem.requestedBy,
            requestedById: "",
            requesterRole: vItem.requesterRole,
            requesterEmail: vItem.requesterEmail,
            requesterPhone: vItem.requesterPhone,
            requesterDepartment: vItem.requesterDepartment,
            areasToReview: [],
            notes: vItem.notes,
            status: "Report Received",
            createdAt: vItem.createdAt,
            linkedReportId: vItem.linkedReportId,
            preparedBy: vItem.assignedAgentName,
            preparedByEmail: vItem.assignedAgentEmail,
            preparedByPhone: vItem.assignedAgentPhone,
            preparedByRole: vItem.assignedAgentRole,
            preparedAt: vItem.reportSubmittedAt,
            reportStatus: "Approved",
            reportApprovedBy: vItem.reportReviewedBy,
            reportApprovedAt: vItem.reportReviewedAt,
            managerRating: vItem.managerRating,
            managerComments: vItem.managerComments,
          });
        }
      } else if (vItem.validationStatus === "Report Rejected" && mergedMap.has(vItem.id)) {
        const existing = mergedMap.get(vItem.id)!;
        mergedMap.set(vItem.id, {
          ...existing,
          status: "Rejected",
          reportStatus: "Rejected",
          reportApprovedBy: vItem.reportReviewedBy || existing.reportApprovedBy,
          reportApprovedAt: vItem.reportReviewedAt || existing.reportReviewedAt,
          rejectionReason: vItem.managerComments || existing.rejectionReason,
          managerComments: vItem.managerComments || existing.managerComments,
          managerRating: vItem.managerRating ?? existing.managerRating,
        });
      }
    }

    return Array.from(mergedMap.values());
  }

  /**
   * Get single request by ID.
   */
  async getRequest(id: string | number): Promise<SurveillanceRequest> {
    const res = await http.get<SurveillanceRequest>(`/api/surveillance/requests/${id}`);
    return res.data;
  }

  /**
   * Create a new surveillance report request (by Admin, State Manager, Market Manager, District Manager).
   * When the server finds a duplicate (1.2 Duplicate Check - same store +
   * incident date already requested), it returns the EXISTING request with
   * isDuplicate: true instead of inserting a new one.
   */
  async createRequest(
    payload: CreateSurveillanceRequestPayload,
  ): Promise<SurveillanceRequest & { isDuplicate?: boolean; duplicateOfRequestId?: string; duplicateRequestedBy?: string }> {
    const res = await http.post<SurveillanceRequest>("/api/surveillance/requests", payload);
    return res.data as SurveillanceRequest & { isDuplicate?: boolean; duplicateOfRequestId?: string; duplicateRequestedBy?: string };
  }

  /**
   * Approve a request (Admin, State Manager, Market Manager only).
   */
  async approveRequest(id: string | number, notes?: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/approve`, { notes });
    return res.data;
  }

  /**
   * Reject a request (Admin, State Manager, Market Manager only).
   */
  async rejectRequest(id: string | number, reason: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/reject`, { reason });
    return res.data;
  }

  /**
   * Fetch all submitted surveillance reports.
   */
  async getReports(): Promise<SurveillanceReport[]> {
    const res = await http.get<SurveillanceReport[]>("/api/surveillance/reports");
    return res.data;
  }

  /**
   * Get single surveillance report by ID (falls back to dummy sample report if backend API does not hold the UI-demo ID).
   */
  async getReport(id: string | number): Promise<SurveillanceReport> {
    try {
      const res = await http.get<SurveillanceReport>(`/api/surveillance/reports/${id}`);
      if (res.data) return res.data;
    } catch (err) {
      const fallback = dummyReportsStore.find((r) => r.id === String(id));
      if (fallback) return { ...fallback };
      throw err;
    }
    const fallback = dummyReportsStore.find((r) => r.id === String(id));
    if (fallback) return { ...fallback };
    throw new Error("Surveillance report not found.");
  }

  /**
   * Submit the finalized surveillance report (including all audit rows) to the backend API.
   */
  async submitReport(payload: CreateSurveillanceReportPayload): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>("/api/surveillance/reports", payload);
    return res.data;
  }

  /**
   * Review submitted report (Approve or Reject with comments and optional 5-star rating)
   */
  async reviewReport(
    id: string | number,
    payload: {
      action: "approve" | "reject";
      comments?: string;
      rating?: number;
    },
  ): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>(`/api/surveillance/reports/${id}/review`, payload);
    return res.data;
  }

  /**
   * Fetch incoming surveillance requests for the Admin Validate and Assign queue.
   * Currently served from dummy review data until backend APIs are ready.
   */
  async getValidationQueue(): Promise<SurveillanceValidationItem[]> {
    return validationQueueStore.map((item) => ({ ...item }));
  }

  /**
   * Fetch surveillance agents/users eligible to be assigned validated requests.
   * Currently served from dummy review data until backend APIs are ready.
   */
  async getAssignableAgents(): Promise<SurveillanceAssignableAgent[]> {
    return assignableAgentsStore.map((agent) => ({ ...agent }));
  }

  /**
   * Validate an incoming surveillance request and assign (or reassign) it to an agent.
   * Currently mutates dummy review state until backend APIs are ready.
   */
  async validateAndAssignRequest(
    payload: ValidateAndAssignPayload,
  ): Promise<SurveillanceValidationItem> {
    const targetIndex = validationQueueStore.findIndex(
      (item) => item.id === payload.requestId,
    );
    if (targetIndex === -1) {
      throw new Error("Surveillance request not found.");
    }

    const agent = assignableAgentsStore.find((a) => a.id === payload.agentId);
    if (!agent) {
      throw new Error("Selected surveillance agent not found.");
    }

    const existing = validationQueueStore[targetIndex];
    const previousAgentId =
      existing.validationStatus === "Assigned" ? existing.assignedAgentId : undefined;

    if (previousAgentId && previousAgentId !== agent.id) {
      assignableAgentsStore = assignableAgentsStore.map((a) =>
        a.id === previousAgentId
          ? { ...a, activeAssignments: Math.max(0, a.activeAssignments - 1) }
          : a,
      );
    }

    if (previousAgentId !== agent.id) {
      assignableAgentsStore = assignableAgentsStore.map((a) =>
        a.id === agent.id
          ? { ...a, activeAssignments: a.activeAssignments + 1 }
          : a,
      );
    }

    const updated: SurveillanceValidationItem = {
      ...existing,
      priority: payload.priority,
      validationStatus: "Assigned",
      assignedAgentId: agent.id,
      assignedAgentName: agent.fullName,
      assignedAgentEmail: agent.email,
      assignedAgentPhone: agent.phone,
      assignedAgentRole: agent.role,
      assignedBy: payload.assignedBy,
      assignedAt: new Date().toISOString(),
      adminInstructions: payload.adminInstructions?.trim() || undefined,
      rejectedBy: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
    };

    validationQueueStore[targetIndex] = updated;
    return { ...updated };
  }

  /**
   * Reject or cancel an incoming surveillance request so it remains hidden from all agents.
   * Currently mutates dummy review state until backend APIs are ready.
   */
  async rejectValidationRequest(
    payload: RejectValidationPayload,
  ): Promise<SurveillanceValidationItem> {
    const targetIndex = validationQueueStore.findIndex(
      (item) => item.id === payload.requestId,
    );
    if (targetIndex === -1) {
      throw new Error("Surveillance request not found.");
    }

    const existing = validationQueueStore[targetIndex];
    if (existing.validationStatus === "Assigned" && existing.assignedAgentId) {
      assignableAgentsStore = assignableAgentsStore.map((a) =>
        a.id === existing.assignedAgentId
          ? { ...a, activeAssignments: Math.max(0, a.activeAssignments - 1) }
          : a,
      );
    }

    const updated: SurveillanceValidationItem = {
      ...existing,
      validationStatus: "Rejected",
      assignedAgentId: undefined,
      assignedAgentName: undefined,
      assignedAgentEmail: undefined,
      assignedAgentPhone: undefined,
      assignedAgentRole: undefined,
      assignedBy: undefined,
      assignedAt: undefined,
      adminInstructions: undefined,
      rejectedBy: payload.rejectedBy,
      rejectedAt: new Date().toISOString(),
      rejectionReason: payload.reason.trim(),
    };

    validationQueueStore[targetIndex] = updated;
    return { ...updated };
  }

  /**
   * Review a submitted surveillance report from the Validate and Assign page
   * (Manager Review & Submitter Rating section).
   * When approved, the report is finalized and surfaces on Request Reports with "Report Received" status.
   */
  async reviewSubmittedReport(
    payload: ReviewSubmittedReportPayload,
  ): Promise<SurveillanceValidationItem> {
    const targetIndex = validationQueueStore.findIndex(
      (item) => item.id === payload.requestId,
    );
    if (targetIndex === -1) {
      throw new Error("Surveillance validation record not found.");
    }

    const existing = validationQueueStore[targetIndex];
    const reviewedAt = new Date().toISOString();
    const isApprove = payload.action === "approve";

    if (existing.linkedReportId) {
      // Attempt backend review sync if real report exists on server, while safely updating local demo store
      try {
        await http.post(`/api/surveillance/reports/${existing.linkedReportId}/review`, {
          action: payload.action,
          comments: payload.comments,
          rating: payload.rating,
        });
      } catch {
        // Ignore if UI demo item is not yet persisted on the backend
      }

      dummyReportsStore = dummyReportsStore.map((rep) =>
        rep.id === existing.linkedReportId
          ? {
              ...rep,
              status: isApprove ? "Approved" : "Rejected",
              managerRating: payload.rating ?? rep.managerRating,
              managerComments: payload.comments ?? rep.managerComments,
              reviewedBy: payload.reviewedBy,
              reviewedAt,
            }
          : rep,
      );
    }

    const updated: SurveillanceValidationItem = {
      ...existing,
      validationStatus: isApprove ? "Approved" : "Report Rejected",
      reportStatus: isApprove ? "Approved" : "Rejected",
      reportReviewedBy: payload.reviewedBy,
      reportReviewedAt: reviewedAt,
      managerRating: payload.rating,
      managerComments: payload.comments?.trim() || undefined,
    };

    validationQueueStore[targetIndex] = updated;
    return { ...updated };
  }

  /**
   * Reset dummy review state back to initial sample items for team UI testing.
   */
  async resetValidationQueueDemo(): Promise<{
    requests: SurveillanceValidationItem[];
    agents: SurveillanceAssignableAgent[];
  }> {
    validationQueueStore = INITIAL_VALIDATION_REQUESTS.map((item) => ({ ...item }));
    assignableAgentsStore = DUMMY_SURVEILLANCE_AGENTS.map((agent) => ({ ...agent }));
    dummyReportsStore = INITIAL_SURVEILLANCE_REPORTS.map((rep) => ({ ...rep }));
    return {
      requests: validationQueueStore.map((item) => ({ ...item })),
      agents: assignableAgentsStore.map((agent) => ({ ...agent })),
    };
  }
}

export const surveillanceService = new SurveillanceService();

