/**
 * Surveillance Portal Service Class (Temporarily Commented Out)
 *
 * All Surveillance portal pages currently operate on static sample data
 * (/src/pages/portals/surveillance/surveillance-data.ts) while the UI is being
 * finalized. Once all UI changes are approved and backend APIs are updated,
 * uncomment and connect the endpoints below.
 */

/*
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

    const active = this.getActiveDraftSession();
    if (active?.requestId === requestId) {
      this.clearActiveDraftSession();
    }
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

  async getValidationQueue(): Promise<SurveillanceValidationItem[]> {
    const res = await http.get<SurveillanceValidationItem[]>("/api/surveillance/validation-queue");
    return res.data;
  }

  async getAssignableAgents(): Promise<SurveillanceAssignableAgent[]> {
    const res = await http.get<SurveillanceAssignableAgent[]>("/api/surveillance/agents");
    return res.data;
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
*/

export {};
