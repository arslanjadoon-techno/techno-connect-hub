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

  async getRequests(): Promise<SurveillanceRequest[]> {
    const res = await http.get<SurveillanceRequest[]>("/api/surveillance/requests");
    return res.data;
  }

  async getRequest(id: string | number): Promise<SurveillanceRequest> {
    const res = await http.get<SurveillanceRequest>(`/api/surveillance/requests/${id}`);
    return res.data;
  }

  async createRequest(
    payload: CreateSurveillanceRequestPayload,
  ): Promise<SurveillanceRequest & { isDuplicate?: boolean; duplicateOfRequestId?: string; duplicateRequestedBy?: string }> {
    const res = await http.post<SurveillanceRequest>("/api/surveillance/requests", payload);
    return res.data as SurveillanceRequest & { isDuplicate?: boolean; duplicateOfRequestId?: string; duplicateRequestedBy?: string };
  }

  async approveRequest(id: string | number, notes?: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/approve`, { notes });
    return res.data;
  }

  async rejectRequest(id: string | number, reason: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/reject`, { reason });
    return res.data;
  }

  async getReports(): Promise<SurveillanceReport[]> {
    const res = await http.get<SurveillanceReport[]>("/api/surveillance/reports");
    return res.data;
  }

  async getReport(id: string | number): Promise<SurveillanceReport> {
    const res = await http.get<SurveillanceReport>(`/api/surveillance/reports/${id}`);
    return res.data;
  }

  async submitReport(payload: CreateSurveillanceReportPayload): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>("/api/surveillance/reports", payload);
    return res.data;
  }

  // Real DB persistence (not just local storage) for an in-progress audit -
  // creates the report as Status "Draft" on first call, reuses it after.
  async saveReportProgress(payload: SaveReportProgressPayload): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>("/api/surveillance/reports/progress", payload);
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
    return res.data;
  }

  async getValidationQueue(): Promise<SurveillanceValidationItem[]> {
    const res = await http.get<SurveillanceValidationItem[]>("/api/surveillance/validation-queue");
    return res.data;
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
    return res.data;
  }

  async rejectValidationRequest(
    payload: RejectValidationPayload,
  ): Promise<SurveillanceValidationItem> {
    const res = await http.post<SurveillanceValidationItem>("/api/surveillance/reject-validation", payload);
    return res.data;
  }
}

export const surveillanceService = new SurveillanceService();
