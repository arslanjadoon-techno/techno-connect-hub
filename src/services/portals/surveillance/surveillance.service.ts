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
} from "./types";

const surveillanceDraftMMKV = new MMKV({
  id: "surveillance-audit-drafts",
});

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
   */
  async getRequests(): Promise<SurveillanceRequest[]> {
    const res = await http.get<SurveillanceRequest[]>("/api/surveillance/requests");
    return res.data;
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
   * Get single surveillance report by ID.
   */
  async getReport(id: string | number): Promise<SurveillanceReport> {
    const res = await http.get<SurveillanceReport>(`/api/surveillance/reports/${id}`);
    return res.data;
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
}

export const surveillanceService = new SurveillanceService();
