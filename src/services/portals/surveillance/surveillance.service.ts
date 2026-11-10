/**
 * Surveillance Portal Service Class
 *
 * Draft-row helpers are MMKV-backed and purely local (an agent's in-progress
 * audit form autosave) - they never touch the backend. Every other method
 * calls TechnoComm.Controllers.SurveillanceController. "Who did this" fields
 * (requestedBy, assignedBy, rejectedBy, reviewedBy, investigatorName, ...)
 * are never sent from here - the backend resolves them server-side from the
 * caller's JWT (same IDOR-safety fix as LeaveController).
 */

import { http } from "../../http";
import { MMKV } from "@/lib/mmkv-storage";
import type { Store } from "@/lib/api/client";
import type {
  SurveillanceRequest,
  SurveillanceReport,
  SurveillanceAuditRow,
  SavedAuditRowRecord,
  ActiveSurveillanceDraftSession,
  SurveillanceAuditSessionMeta,
  CreateSurveillanceRequestPayload,
  CreateSurveillanceReportPayload,
  SaveReportProgressPayload,
  SurveillanceRepTiming,
  SurveillanceCameraLog,
  SurveillanceAssignableAgent,
  SurveillanceMarketOption,
  SurveillanceSalesRep,
  SurveillanceValidationItem,
  ValidateAndAssignPayload,
  RejectValidationPayload,
  ReviewSubmittedReportPayload,
} from "./types";

const surveillanceDraftMMKV = new MMKV({
  id: "surveillance-audit-drafts",
});

const ACTIVE_SESSION_KEY = "active-session";

// In-memory cache for the portal-wide lists (requests, reports, markets,
// validation queue). Surveillance's pages are all independently routed, so
// without this every tab switch remounts the page and re-fetches everything
// from scratch - including the "reports" list, which is slow server-side.
// Each GET below returns the cached array until a mutation below it
// invalidates the relevant entry, so navigating between tabs is instant
// unless something that would actually change that list happened.
let requestsCache: SurveillanceRequest[] | null = null;
let reportsCache: SurveillanceReport[] | null = null;
let marketsCache: SurveillanceMarketOption[] | null = null;
let storesCache: Store[] | null = null;
let validationQueueCache: SurveillanceValidationItem[] | null = null;

export class SurveillanceService {
  private getRowKey(requestId: string, rowId: string): string {
    return `request:${requestId}:row:${rowId}`;
  }

  private getRequestIndexKey(requestId: string): string {
    return `request:${requestId}:row-index`;
  }

  private getSessionMetaKey(requestId: string): string {
    return `request:${requestId}:session-meta`;
  }

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

  clearRequestDraft(requestId: string): void {
    const prefix = `request:${requestId}:row:`;
    for (const key of surveillanceDraftMMKV.getAllKeys()) {
      if (key.startsWith(prefix)) {
        surveillanceDraftMMKV.delete(key);
      }
    }
    surveillanceDraftMMKV.delete(this.getRequestIndexKey(requestId));
    surveillanceDraftMMKV.delete(this.getSessionMetaKey(requestId));

    const active = this.getActiveDraftSession();
    if (active?.requestId === requestId) {
      this.clearActiveDraftSession();
    }
  }

  // Header fields + Floor Presence / Camera Uptime sections - everything in
  // the audit form that isn't a per-row entry. Saved so pausing mid-audit
  // (closing the form, coming back later) doesn't lose anything beyond the
  // audit rows, which saveDraftRow already covers.
  saveSessionMeta(
    requestId: string,
    meta: Omit<SurveillanceAuditSessionMeta, "requestId" | "savedAt">,
  ): SurveillanceAuditSessionMeta {
    const record: SurveillanceAuditSessionMeta = {
      ...meta,
      requestId,
      savedAt: new Date().toISOString(),
    };
    surveillanceDraftMMKV.setJSON(this.getSessionMetaKey(requestId), record);
    return record;
  }

  getSessionMeta(requestId: string): SurveillanceAuditSessionMeta | undefined {
    return surveillanceDraftMMKV.getJSON<SurveillanceAuditSessionMeta>(
      this.getSessionMetaKey(requestId),
    );
  }

  clearSessionMeta(requestId: string): void {
    surveillanceDraftMMKV.delete(this.getSessionMetaKey(requestId));
  }

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

  async getRequests(forceRefresh = false): Promise<SurveillanceRequest[]> {
    if (!forceRefresh && requestsCache) return requestsCache;
    const res = await http.get<SurveillanceRequest[]>("/api/surveillance/requests");
    requestsCache = res.data;
    return requestsCache;
  }

  async getRequest(id: string | number): Promise<SurveillanceRequest> {
    const res = await http.get<SurveillanceRequest>(`/api/surveillance/requests/${id}`);
    return res.data;
  }

  async createRequest(
    payload: CreateSurveillanceRequestPayload,
  ): Promise<SurveillanceRequest & { isDuplicate?: boolean; duplicateOfRequestId?: string; duplicateRequestedBy?: string }> {
    const res = await http.post<SurveillanceRequest>("/api/surveillance/requests", payload);
    requestsCache = null;
    return res.data as SurveillanceRequest & { isDuplicate?: boolean; duplicateOfRequestId?: string; duplicateRequestedBy?: string };
  }

  async approveRequest(id: string | number, notes?: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/approve`, { notes });
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  async rejectRequest(id: string | number, reason: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/reject`, { reason });
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  // Lets the requester (Market Manager / Agent Supervisor) cancel their own
  // request with a reason, before it's been completed. Ownership is enforced
  // server-side from the caller's identity, not trusted from the client.
  async cancelOwnRequest(id: string | number, reason: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/cancel`, { reason });
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  async getReports(forceRefresh = false): Promise<SurveillanceReport[]> {
    if (!forceRefresh && reportsCache) return reportsCache;
    const res = await http.get<SurveillanceReport[]>("/api/surveillance/reports");
    reportsCache = res.data;
    return reportsCache;
  }

  async getReport(id: string | number): Promise<SurveillanceReport> {
    const res = await http.get<SurveillanceReport>(`/api/surveillance/reports/${id}`);
    return res.data;
  }

  async submitReport(payload: CreateSurveillanceReportPayload): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>("/api/surveillance/reports", payload);
    reportsCache = null;
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  // Real DB persistence (not just local storage) for an in-progress audit -
  // creates the report as Status "Draft" on first call, reuses it after.
  async saveReportProgress(payload: SaveReportProgressPayload): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>("/api/surveillance/reports/progress", payload);
    return res.data;
  }

  // Pulls a just-submitted ("Report Received") report back to Draft so the
  // agent can keep editing - only works before a manager has reviewed it.
  async withdrawSubmission(reportId: string): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>(`/api/surveillance/reports/${reportId}/withdraw`, {});
    reportsCache = null;
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  async getReportByRequestId(requestId: string): Promise<SurveillanceReport | undefined> {
    try {
      const res = await http.get<SurveillanceReport>(`/api/surveillance/reports/by-request/${requestId}`);
      return res.data;
    } catch {
      return undefined;
    }
  }

  // Requires the report to already exist with a Store Open Time set and at
  // least one saved audit row - enforced server-side too.
  async saveRepTimings(reportId: string, rows: SurveillanceRepTiming[]): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>(`/api/surveillance/reports/${reportId}/rep-timings`, {
      repTimings: rows,
    });
    return res.data;
  }

  async saveCameraLogs(reportId: string, rows: SurveillanceCameraLog[]): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>(`/api/surveillance/reports/${reportId}/camera-logs`, {
      cameraLogs: rows,
    });
    return res.data;
  }

  // Deletes a row from an already-synced Draft report - without this, a row
  // removed in the UI after being saved would still be in the DB and
  // reappear whenever the audit is resumed.
  async deleteAuditRow(reportId: string, rowId: string): Promise<void> {
    await http.delete(`/api/surveillance/reports/${reportId}/rows/${rowId}`);
  }

  async reviewReport(
    id: string | number,
    payload: ReviewSubmittedReportPayload,
  ): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>(`/api/surveillance/reports/${id}/review`, payload);
    reportsCache = null;
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  async getValidationQueue(forceRefresh = false): Promise<SurveillanceValidationItem[]> {
    if (!forceRefresh && validationQueueCache) return validationQueueCache;
    const res = await http.get<SurveillanceValidationItem[]>("/api/surveillance/validation-queue");
    validationQueueCache = res.data;
    return validationQueueCache;
  }

  // Scoped to the caller's assigned market(s)/district(s) - a Market Manager
  // or plain Surveillance user only sees their own market(s), a District
  // Manager only the market their district belongs to. Deliberately NOT
  // /api/markets (that stays unscoped for the admin Market management page).
  async getMarkets(forceRefresh = false): Promise<SurveillanceMarketOption[]> {
    if (!forceRefresh && marketsCache) return marketsCache;
    const res = await http.get<SurveillanceMarketOption[]>("/api/surveillance/markets");
    marketsCache = res.data || [];
    return marketsCache;
  }

  // Scoped the same way as getMarkets - a store is visible if it's in one of
  // the caller's markets or their assigned district. Deliberately NOT
  // /api/stores (that stays unscoped for the admin Store management page).
  async getStores(forceRefresh = false): Promise<Store[]> {
    if (!forceRefresh && storesCache) return storesCache;
    const res = await http.get<Store[]>("/api/surveillance/stores");
    storesCache = res.data || [];
    return storesCache;
  }

  // With `search`, the DB query itself is narrowed by name/email server-side
  // (instead of pulling the whole user table) - pass it for a search-as-you-
  // type picker. Omit it only for a page meant to show the full roster.
  async getAssignableAgents(search?: string): Promise<SurveillanceAssignableAgent[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await http.get<SurveillanceAssignableAgent[]>(`/api/surveillance/agents${query}`);
    return res.data;
  }

  // Requires a search term (2+ chars) - the backend returns an empty list
  // otherwise, since the only caller is a search-as-you-type picker, never a
  // full-roster listing.
  async getSalesReps(search: string): Promise<SurveillanceSalesRep[]> {
    if (!search || search.trim().length < 2) return [];
    const res = await http.get<Array<{ ntid: string; fullName: string; designation?: string }>>(
      `/api/surveillance/sales-reps?search=${encodeURIComponent(search.trim())}`,
    );
    return res.data.map((r) => ({ ntid: r.ntid, fullName: r.fullName, designation: r.designation }));
  }

  async validateAndAssignRequest(
    payload: ValidateAndAssignPayload,
  ): Promise<SurveillanceValidationItem> {
    const res = await http.post<SurveillanceValidationItem>("/api/surveillance/validate-and-assign", payload);
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  async rejectValidationRequest(
    payload: RejectValidationPayload,
  ): Promise<SurveillanceValidationItem> {
    const res = await http.post<SurveillanceValidationItem>("/api/surveillance/reject-validation", payload);
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }
}

export const surveillanceService = new SurveillanceService();
