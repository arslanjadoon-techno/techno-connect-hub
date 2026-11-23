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
  SurveillanceLookupOption,
  CreateSurveillanceLookupOptionPayload,
  UpdateSurveillanceLookupOptionPayload,
  SurveillanceDashboardQuery,
  SurveillanceDashboardData,
  SurveillanceDashboardOverview,
  SurveillanceDashboardTatMetrics,
  SurveillanceDepartmentDailyRow,
  SurveillanceDepartmentSummary,
  SurveillanceMonthlyPerformancePoint,
  SurveillanceAgentPerformanceItem,
  SurveillanceAgentMistakeItem,
  SurveillanceAgentAuditIssue,
  SurveillanceTopMarketItem,
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
// Keyed by category ("TransactionType" | "ClientType" | "FraudCheckType" |
// "" for "every category") so the audit form and the admin screen don't
// stomp on each other's cached results.
const lookupOptionsCache = new Map<string, SurveillanceLookupOption[]>();

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

    const allRowKeys = surveillanceDraftMMKV.getAllKeys().filter((k) => k.startsWith(prefix));

    const orderedIds = Array.from(
      new Set([...indexedIds, ...allRowKeys.map((k) => k.slice(prefix.length))]),
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
    return surveillanceDraftMMKV.getJSON<ActiveSurveillanceDraftSession>(ACTIVE_SESSION_KEY);
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

  async createRequest(payload: CreateSurveillanceRequestPayload): Promise<
    SurveillanceRequest & {
      isDuplicate?: boolean;
      duplicateOfRequestId?: string;
      duplicateRequestedBy?: string;
    }
  > {
    const res = await http.post<SurveillanceRequest>("/api/surveillance/requests", payload);
    requestsCache = null;
    return res.data as SurveillanceRequest & {
      isDuplicate?: boolean;
      duplicateOfRequestId?: string;
      duplicateRequestedBy?: string;
    };
  }

  async approveRequest(id: string | number, notes?: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/approve`, {
      notes,
    });
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  async rejectRequest(id: string | number, reason: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/reject`, {
      reason,
    });
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  // Lets the requester (Market Manager / Agent Supervisor) cancel their own
  // request with a reason, before it's been completed. Ownership is enforced
  // server-side from the caller's identity, not trusted from the client.
  async cancelOwnRequest(id: string | number, reason: string): Promise<SurveillanceRequest> {
    const res = await http.post<SurveillanceRequest>(`/api/surveillance/requests/${id}/cancel`, {
      reason,
    });
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
    const res = await http.post<SurveillanceReport>(
      `/api/surveillance/reports/${reportId}/withdraw`,
      {},
    );
    reportsCache = null;
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  async getReportByRequestId(requestId: string): Promise<SurveillanceReport | undefined> {
    try {
      const res = await http.get<SurveillanceReport>(
        `/api/surveillance/reports/by-request/${requestId}`,
      );
      return res.data;
    } catch {
      return undefined;
    }
  }

  // Requires the report to already exist with a Store Open Time set and at
  // least one saved audit row - enforced server-side too.
  async saveRepTimings(
    reportId: string,
    rows: SurveillanceRepTiming[],
  ): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>(
      `/api/surveillance/reports/${reportId}/rep-timings`,
      {
        repTimings: rows,
      },
    );
    return res.data;
  }

  async saveCameraLogs(
    reportId: string,
    rows: SurveillanceCameraLog[],
  ): Promise<SurveillanceReport> {
    const res = await http.post<SurveillanceReport>(
      `/api/surveillance/reports/${reportId}/camera-logs`,
      {
        cameraLogs: rows,
      },
    );
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
    const res = await http.post<SurveillanceReport>(
      `/api/surveillance/reports/${id}/review`,
      payload,
    );
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
    return res.data.map((r) => ({
      ntid: r.ntid,
      fullName: r.fullName,
      designation: r.designation,
    }));
  }

  async validateAndAssignRequest(
    payload: ValidateAndAssignPayload,
  ): Promise<SurveillanceValidationItem> {
    const res = await http.post<SurveillanceValidationItem>(
      "/api/surveillance/validate-and-assign",
      payload,
    );
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  async rejectValidationRequest(
    payload: RejectValidationPayload,
  ): Promise<SurveillanceValidationItem> {
    const res = await http.post<SurveillanceValidationItem>(
      "/api/surveillance/reject-validation",
      payload,
    );
    requestsCache = null;
    validationQueueCache = null;
    return res.data;
  }

  // ── Lookup options (Transaction Type / Client Type / Fraud Check Type) ──
  // Omit `category` to fetch every category in one call (the admin screen);
  // pass one to fetch just that list (the audit form's dropdowns).
  async getLookupOptions(
    category?: string,
    forceRefresh = false,
  ): Promise<SurveillanceLookupOption[]> {
    const key = category || "";
    if (!forceRefresh && lookupOptionsCache.has(key)) return lookupOptionsCache.get(key)!;
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await http.get<SurveillanceLookupOption[]>(`/api/surveillance/lookups${query}`);
    const data = res.data || [];
    lookupOptionsCache.set(key, data);
    return data;
  }

  async createLookupOption(
    payload: CreateSurveillanceLookupOptionPayload,
  ): Promise<SurveillanceLookupOption> {
    const res = await http.post<SurveillanceLookupOption>("/api/surveillance/lookups", payload);
    lookupOptionsCache.clear();
    return res.data;
  }

  async updateLookupOption(
    id: number,
    payload: UpdateSurveillanceLookupOptionPayload,
  ): Promise<SurveillanceLookupOption> {
    const res = await http.patch<SurveillanceLookupOption>(
      `/api/surveillance/lookups/${id}`,
      payload,
    );
    lookupOptionsCache.clear();
    return res.data;
  }

  /**
   * Aggregates interactive Surveillance Dashboard analytics from the portal's
   * validation queue, requests, reports, assignable agents, markets, and stores.
   */
  async getDashboardData(query: SurveillanceDashboardQuery): Promise<SurveillanceDashboardData> {
    const force = Boolean(query.forceRefresh);
    const [queueRes, reportsRes, requestsRes, agentsRes, marketsRes, storesRes] =
      await Promise.allSettled([
        this.getValidationQueue(force),
        this.getReports(force),
        this.getRequests(force),
        this.getAssignableAgents(),
        this.getMarkets(force),
        this.getStores(force),
      ]);

    const queueFailed = queueRes.status === "rejected";
    const requestsFailed = requestsRes.status === "rejected";
    if (queueFailed && requestsFailed) {
      throw new Error(
        (queueRes.reason as Error)?.message ||
          (requestsRes.reason as Error)?.message ||
          "Failed to load surveillance dashboard data.",
      );
    }

    const validationQueue = queueRes.status === "fulfilled" ? queueRes.value : [];
    const reports = reportsRes.status === "fulfilled" ? reportsRes.value : [];
    const requests = requestsRes.status === "fulfilled" ? requestsRes.value : [];
    const agents = agentsRes.status === "fulfilled" ? agentsRes.value : [];
    const markets = marketsRes.status === "fulfilled" ? marketsRes.value : [];
    const stores = storesRes.status === "fulfilled" ? storesRes.value : [];

    return buildSurveillanceDashboardData({
      query,
      validationQueue,
      reports,
      requests,
      agents,
      markets,
      stores,
    });
  }
}

export const surveillanceService = new SurveillanceService();

// ---------------------------------------------------------------------------
// Dashboard Analytics Aggregation Helpers (encapsulated inside service module)
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type CanonicalStatus =
  | "Unassigned"
  | "Assigned"
  | "Pending Verification"
  | "Completed"
  | "Request Rejected"
  | "Report Rejected";

interface UnifiedSurveillanceRecord {
  id: string;
  storeId: string;
  storeName: string;
  marketName: string;
  districtName: string;
  surveillanceDate: string;
  isoDate: string;
  department: string;
  status: CanonicalStatus;
  createdAt?: string;
  assignedAt?: string;
  surveyStartsAt?: string;
  surveyEndsAt?: string;
  reportSubmittedAt?: string;
  reportReviewedAt?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentEmail?: string;
  assignedAgentDepartment?: string;
  linkedReportId?: string;
  managerRating?: number;
  rejectionReason?: string;
  managerComments?: string;
  report?: SurveillanceReport;
}

function parseFlexibleDate(raw?: string): Date | null {
  if (!raw) return null;
  const clean = raw.split(" - ")[0]?.trim();
  if (!clean) return null;

  const ymd = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T|\s)/);
  if (ymd && !clean.includes("T")) {
    const dt = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const mdy = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const dt = new Date(Number(mdy[3]), Number(mdy[1]) - 1, Number(mdy[2]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const parsed = new Date(clean);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDateKey(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDateLabel(isoDate: string): string {
  const dt = parseFlexibleDate(isoDate);
  if (!dt) return isoDate;
  return `${String(dt.getDate()).padStart(2, "0")} ${SHORT_MONTH_NAMES[dt.getMonth()]}`;
}

function formatFullDateLabel(isoDate: string): string {
  const dt = parseFlexibleDate(isoDate);
  if (!dt) return isoDate;
  return `${SHORT_MONTH_NAMES[dt.getMonth()]} ${String(dt.getDate()).padStart(2, "0")}, ${dt.getFullYear()}`;
}

function resolveDepartmentName(dept?: string | null, role?: string | null): string {
  const trimmed = (dept || "").trim();
  if (trimmed && trimmed !== "—" && trimmed !== "-" && trimmed.toLowerCase() !== "null") {
    return trimmed;
  }
  const r = (role || "").toLowerCase().replace(/[\s_-]/g, "");
  if (r.includes("market")) return "Market Management";
  if (r.includes("district")) return "District Management";
  if (r.includes("state")) return "State Management";
  if (r.includes("surveil")) return "Surveillance & Loss Prevention";
  if (r.includes("admin")) return "Administration";
  return "General Operations";
}

function resolveCanonicalStatus(
  validationStatus?: string,
  linkedReportId?: string,
  reportStatus?: string,
): CanonicalStatus {
  const raw = String(validationStatus || "").trim();
  if (raw === "Request Rejected") return "Request Rejected";
  if (raw === "Report Rejected") return "Report Rejected";
  if (raw === "Rejected") {
    return linkedReportId || reportStatus === "Rejected" ? "Report Rejected" : "Request Rejected";
  }
  if (raw === "Completed" || raw === "Approved") return "Completed";
  if (raw === "Pending Verification" || raw === "Report Received") {
    return "Pending Verification";
  }
  if (raw === "Assigned") return "Assigned";
  if (
    raw === "Unassigned" ||
    raw === "Requested" ||
    raw === "Pending" ||
    raw === "Report Requested"
  ) {
    return "Unassigned";
  }
  return "Unassigned";
}

function diffHours(startIso?: string, endIso?: string): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const hrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (hrs < 0 || hrs > 24 * 120) return null;
  return hrs;
}

function averageOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Number((sum / values.length).toFixed(2));
}

function medianOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const val = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Number(val.toFixed(2));
}

function isAffirmativeFlag(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim().toLowerCase();
  return s === "yes" || s === "true" || s === "y" || s === "1";
}

function parseCurrencyVal(raw?: string): number {
  if (!raw) return 0;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "—") return 0;
  const isNeg = trimmed.includes("-") || (trimmed.startsWith("(") && trimmed.endsWith(")"));
  const num = Number.parseFloat(trimmed.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(num)) return 0;
  return isNeg ? -Math.abs(num) : num;
}

function analyzeReportDetails(report?: SurveillanceReport): {
  rowCount: number;
  buyingCount: number;
  nonBuyingCount: number;
  missedOppCount: number;
  flaggedComplianceCount: number;
  cashVariance: number;
  discrepancies: string[];
} {
  if (!report) {
    return {
      rowCount: 0,
      buyingCount: 0,
      nonBuyingCount: 0,
      missedOppCount: 0,
      flaggedComplianceCount: 0,
      cashVariance: 0,
      discrepancies: [],
    };
  }

  const rows: SurveillanceAuditRow[] = report.rows && report.rows.length > 0 ? report.rows : [];
  const discrepancies: string[] = [];

  if (rows.length === 0) {
    // Fallback to top-level report fields when rows array is not populated
    const diff = parseCurrencyVal(report.difference);
    if (Math.abs(diff) > 5 && !report.summaryMeta?.reasonForDifference?.trim()) {
      discrepancies.push(`Unexplained variance (${report.difference || `$${diff.toFixed(2)}`})`);
    }
    const ct = (report.clientType || "").toLowerCase();
    const isBuy = ct === "buyer" || ct === "billable";
    const complianceCount = [
      report.fraudTransactions,
      report.paymentFraud,
      report.aalSwap,
      report.mim,
      report.flipping,
      report.nonUp,
      report.onlineRejectedPayment,
    ].filter(isAffirmativeFlag).length;

    return {
      rowCount: 1,
      buyingCount: isBuy ? 1 : 0,
      nonBuyingCount: isBuy ? 0 : 1,
      missedOppCount: isAffirmativeFlag(report.missOpportunity) ? 1 : 0,
      flaggedComplianceCount: complianceCount,
      cashVariance: diff,
      discrepancies,
    };
  }

  let buyingCount = 0;
  let nonBuyingCount = 0;
  let missedOppCount = 0;
  let flaggedComplianceCount = 0;
  let totalDiff = 0;

  for (const row of rows) {
    const tt = (row.transType || "").trim().toLowerCase();
    if (tt === "store opened" || tt === "store closed") continue;

    const ct = (row.clientType || "").trim().toLowerCase();
    const isBuy = ct === "buyer" || ct === "billable" || (row.b || "").trim().toUpperCase() === "B";
    if (isBuy) buyingCount += 1;
    else nonBuyingCount += 1;

    if (isAffirmativeFlag(row.missOpportunity)) {
      missedOppCount += 1;
      if (!(row.missOpportunityDetails || "").trim()) {
        discrepancies.push(
          `Missed opportunity flagged without explanation (Inv: ${row.invoice || "N/A"})`,
        );
      }
    }

    const rowDiff = parseCurrencyVal(row.difference);
    totalDiff += rowDiff;

    if (
      isBuy &&
      String(row.receipt || "")
        .trim()
        .toUpperCase() === "NO"
    ) {
      discrepancies.push(`Missing receipt on buyer transaction (Inv: ${row.invoice || "N/A"})`);
    }

    const flagPairs: Array<[unknown, string | undefined, string]> = [
      [row.fraudTransactions, row.fraudTransactionsDetails, "Fraud Transaction"],
      [row.paymentFraud, row.paymentFraudDetails, "Payment Fraud"],
      [row.aalSwap, row.aalSwapDetails, "AAL Swap"],
      [row.mim, row.mimDetails, "Magenta In Metro"],
      [row.flipping, row.flippingDetails, "Flipping"],
      [row.nonUp, row.nonUpDetails, "Non-Up"],
      [row.onlineRejectedPayment, row.onlineRejectedPaymentDetails, "Online Rejected Payment"],
    ];

    for (const [flagVal, detailVal, label] of flagPairs) {
      if (isAffirmativeFlag(flagVal)) {
        flaggedComplianceCount += 1;
        if (!(detailVal || "").trim() && !(row.notes || "").trim()) {
          discrepancies.push(
            `${label} flagged without supporting notes (Inv: ${row.invoice || "N/A"})`,
          );
        }
      }
    }
  }

  if (Math.abs(totalDiff) > 5 && !report.summaryMeta?.reasonForDifference?.trim()) {
    discrepancies.push(`Total variance of $${totalDiff.toFixed(2)} exceeds ±$5 without reason`);
  }

  return {
    rowCount: rows.length,
    buyingCount,
    nonBuyingCount,
    missedOppCount,
    flaggedComplianceCount,
    cashVariance: Number(totalDiff.toFixed(2)),
    discrepancies,
  };
}

function resolveDateRangeWindow(
  query: SurveillanceDashboardQuery,
  allRecordDates: string[],
): { startIso: string; endIso: string; label: string } {
  const now = new Date();
  const targetYear = query.year || now.getFullYear();

  if (query.duration === "custom" && query.fromDate && query.toDate) {
    const start = query.fromDate <= query.toDate ? query.fromDate : query.toDate;
    const end = query.fromDate <= query.toDate ? query.toDate : query.fromDate;
    return {
      startIso: start,
      endIso: end,
      label: `${formatFullDateLabel(start)} – ${formatFullDateLabel(end)}`,
    };
  }

  if (query.duration === "all_time") {
    if (allRecordDates.length > 0) {
      const sorted = [...allRecordDates].sort();
      return {
        startIso: sorted[0],
        endIso: sorted[sorted.length - 1],
        label: `All Time (${formatFullDateLabel(sorted[0])} – ${formatFullDateLabel(sorted[sorted.length - 1])})`,
      };
    }
    const todayIso = toIsoDateKey(now);
    return {
      startIso: `${targetYear}-01-01`,
      endIso: todayIso,
      label: "All Time",
    };
  }

  if (query.duration === "year_to_date") {
    const startIso = `${targetYear}-01-01`;
    const endDt = targetYear === now.getFullYear() ? now : new Date(targetYear, 11, 31);
    const endIso = toIsoDateKey(endDt);
    return {
      startIso,
      endIso,
      label: `Year to Date (${targetYear})`,
    };
  }

  if (
    query.duration === "last_7_days" ||
    query.duration === "last_14_days" ||
    query.duration === "last_30_days" ||
    query.duration === "quarter"
  ) {
    const daysMap: Record<string, number> = {
      last_7_days: 7,
      last_14_days: 14,
      last_30_days: 30,
      quarter: 90,
    };
    const span = daysMap[query.duration] || 30;
    const isCurrentYearAndMonth =
      targetYear === now.getFullYear() &&
      (query.month === "all" || query.month === now.getMonth() + 1);
    const anchor = isCurrentYearAndMonth
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : query.month === "all"
        ? new Date(targetYear, 11, 31)
        : new Date(targetYear, Number(query.month), 0);
    const start = new Date(anchor);
    start.setDate(start.getDate() - (span - 1));
    const startIso = toIsoDateKey(start);
    const endIso = toIsoDateKey(anchor);
    const labelMap: Record<string, string> = {
      last_7_days: "Last 7 Days",
      last_14_days: "Last 14 Days",
      last_30_days: "Last 30 Days",
      quarter: "Last 90 Days",
    };
    return {
      startIso,
      endIso,
      label: `${labelMap[query.duration]} (${formatShortDateLabel(startIso)} – ${formatFullDateLabel(endIso)})`,
    };
  }

  // Default: "month"
  if (query.month === "all") {
    return {
      startIso: `${targetYear}-01-01`,
      endIso: `${targetYear}-12-31`,
      label: `Full Year ${targetYear}`,
    };
  }

  const mIdx = Math.max(0, Math.min(11, Number(query.month) - 1));
  const firstDay = new Date(targetYear, mIdx, 1);
  const lastDay = new Date(targetYear, mIdx + 1, 0);
  return {
    startIso: toIsoDateKey(firstDay),
    endIso: toIsoDateKey(lastDay),
    label: `${MONTH_NAMES[mIdx]} ${targetYear}`,
  };
}

function buildSurveillanceDashboardData({
  query,
  validationQueue,
  reports,
  requests,
  agents,
  markets,
  stores,
}: {
  query: SurveillanceDashboardQuery;
  validationQueue: SurveillanceValidationItem[];
  reports: SurveillanceReport[];
  requests: SurveillanceRequest[];
  agents: SurveillanceAssignableAgent[];
  markets: SurveillanceMarketOption[];
  stores: Store[];
}): SurveillanceDashboardData {
  const reportById = new Map<string, SurveillanceReport>();
  const reportByRequestId = new Map<string, SurveillanceReport>();
  for (const rep of reports) {
    if (rep.id) reportById.set(String(rep.id), rep);
    if (rep.requestId) reportByRequestId.set(String(rep.requestId), rep);
  }

  const agentMetaById = new Map<string, SurveillanceAssignableAgent>();
  const agentMetaByName = new Map<string, SurveillanceAssignableAgent>();
  for (const ag of agents) {
    if (ag.id) agentMetaById.set(String(ag.id), ag);
    if (ag.fullName) agentMetaByName.set(ag.fullName.trim().toLowerCase(), ag);
  }

  const requestById = new Map<string, SurveillanceRequest>();
  for (const req of requests) {
    if (req.id) requestById.set(String(req.id), req);
  }

  const unifiedMap = new Map<string, UnifiedSurveillanceRecord>();

  for (const item of validationQueue) {
    const req = requestById.get(String(item.id));
    const rep =
      (item.linkedReportId ? reportById.get(String(item.linkedReportId)) : undefined) ||
      reportByRequestId.get(String(item.id));
    const parsedDt =
      parseFlexibleDate(item.surveillanceDate) || parseFlexibleDate(item.createdAt) || new Date();
    const isoDate = toIsoDateKey(parsedDt);
    const agentMeta =
      (item.assignedAgentId ? agentMetaById.get(String(item.assignedAgentId)) : undefined) ||
      (item.assignedAgentName
        ? agentMetaByName.get(item.assignedAgentName.trim().toLowerCase())
        : undefined);

    unifiedMap.set(String(item.id), {
      id: String(item.id),
      storeId: String(item.storeId || ""),
      storeName: (item.storeName || "Unknown Store").trim(),
      marketName: (item.marketName || "Unassigned Market").trim(),
      districtName: (item.districtName || "").trim(),
      surveillanceDate: item.surveillanceDate || isoDate,
      isoDate,
      department: resolveDepartmentName(
        item.requesterDepartment || req?.requesterDepartment || rep?.investigatorDepartment,
        item.requesterRole || req?.requesterRole,
      ),
      status: resolveCanonicalStatus(
        item.validationStatus,
        item.linkedReportId || rep?.id,
        item.reportStatus || rep?.status,
      ),
      createdAt: item.createdAt || req?.createdAt,
      assignedAt: item.assignedAt || req?.assignedAt,
      surveyStartsAt: item.surveyStartsAt || req?.surveyStartsAt,
      surveyEndsAt: item.surveyEndsAt || req?.surveyEndsAt,
      reportSubmittedAt: item.reportSubmittedAt || rep?.submittedAt,
      reportReviewedAt: item.reportReviewedAt || rep?.reviewedAt || req?.approvedAt,
      assignedAgentId: item.assignedAgentId || rep?.investigatorId,
      assignedAgentName: item.assignedAgentName || rep?.investigatorName || req?.preparedBy,
      assignedAgentEmail: item.assignedAgentEmail || rep?.investigatorEmail || agentMeta?.email,
      assignedAgentDepartment: agentMeta?.department || rep?.investigatorDepartment,
      linkedReportId: item.linkedReportId || rep?.id,
      managerRating: item.managerRating ?? rep?.managerRating ?? req?.managerRating,
      rejectionReason: item.rejectionReason,
      managerComments: item.managerComments ?? rep?.managerComments,
      report: rep,
    });
  }

  for (const req of requests) {
    if (unifiedMap.has(String(req.id))) continue;
    const rep =
      (req.linkedReportId ? reportById.get(String(req.linkedReportId)) : undefined) ||
      reportByRequestId.get(String(req.id));
    const parsedDt =
      parseFlexibleDate(req.incidentDate) || parseFlexibleDate(req.createdAt) || new Date();
    const isoDate = toIsoDateKey(parsedDt);
    const agentName = req.preparedBy || rep?.investigatorName;
    const agentMeta =
      (req.preparedById ? agentMetaById.get(String(req.preparedById)) : undefined) ||
      (agentName ? agentMetaByName.get(agentName.trim().toLowerCase()) : undefined);

    let derivedStatus: CanonicalStatus = "Unassigned";
    if (req.status === "Approved" || req.status === "Completed") derivedStatus = "Completed";
    else if (req.status === "Rejected") {
      derivedStatus =
        req.linkedReportId || req.reportStatus === "Rejected"
          ? "Report Rejected"
          : "Request Rejected";
    } else if (req.status === "Report Received") {
      derivedStatus = "Pending Verification";
    } else if (req.assignedAt) {
      derivedStatus = "Assigned";
    }

    unifiedMap.set(String(req.id), {
      id: String(req.id),
      storeId: String(req.storeId || ""),
      storeName: (req.storeName || "Unknown Store").trim(),
      marketName: (req.marketName || "Unassigned Market").trim(),
      districtName: (req.districtName || "").trim(),
      surveillanceDate: req.incidentDate || isoDate,
      isoDate,
      department: resolveDepartmentName(
        req.requesterDepartment || rep?.investigatorDepartment,
        req.requesterRole,
      ),
      status: derivedStatus,
      createdAt: req.createdAt,
      assignedAt: req.assignedAt,
      surveyStartsAt: req.surveyStartsAt,
      surveyEndsAt: req.surveyEndsAt,
      reportSubmittedAt: rep?.submittedAt,
      reportReviewedAt: rep?.reviewedAt || req.approvedAt,
      assignedAgentId: req.preparedById || rep?.investigatorId,
      assignedAgentName: agentName,
      assignedAgentEmail: req.preparedByEmail || rep?.investigatorEmail || agentMeta?.email,
      assignedAgentDepartment: agentMeta?.department || rep?.investigatorDepartment,
      linkedReportId: req.linkedReportId || rep?.id,
      managerRating: req.managerRating ?? rep?.managerRating,
      rejectionReason: req.rejectionReason,
      managerComments: req.managerComments ?? rep?.managerComments,
      report: rep,
    });
  }

  const allRecords = Array.from(unifiedMap.values());
  const allRecordDates = allRecords.map((r) => r.isoDate).filter(Boolean);

  const yearsSet = new Set<number>([new Date().getFullYear(), query.year]);
  for (const r of allRecords) {
    const y = Number(r.isoDate.slice(0, 4));
    if (!Number.isNaN(y) && y > 2000) yearsSet.add(y);
  }
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  const marketSet = new Set<string>();
  markets.forEach((m) => m.name && marketSet.add(m.name.trim()));
  allRecords.forEach((r) => r.marketName && marketSet.add(r.marketName));
  const availableMarkets = Array.from(marketSet).filter(Boolean).sort();

  const deptSet = new Set<string>();
  allRecords.forEach((r) => r.department && deptSet.add(r.department));
  const availableDepartments = Array.from(deptSet).filter(Boolean).sort();

  const { startIso, endIso, label: periodLabel } = resolveDateRangeWindow(query, allRecordDates);

  // Market and department cross-filters apply across both period & yearly views
  const dimensionFiltered = allRecords.filter((r) => {
    if (query.market && query.market !== "all" && r.marketName !== query.market) {
      return false;
    }
    if (query.department && query.department !== "all" && r.department !== query.department) {
      return false;
    }
    return true;
  });

  const periodRecords = dimensionFiltered.filter(
    (r) => r.isoDate >= startIso && r.isoDate <= endIso,
  );

  // ── 1. Basic & Overall Numbers ──────────────────────────────────────────
  let unassignedCount = 0;
  let assignedCount = 0;
  let pendingVerificationCount = 0;
  let completedCount = 0;
  let rejectedRequestsCount = 0;
  let rejectedReportsCount = 0;
  let draftReportsCount = 0;

  let totalAuditRows = 0;
  let totalBuyingCustomers = 0;
  let totalNonBuyingCustomers = 0;
  let totalMissedOpportunities = 0;
  let flaggedComplianceIncidents = 0;
  let netCashVariance = 0;
  const auditedStores = new Set<string>();
  const ratings: number[] = [];

  // TAT accumulators
  const overallTatValues: number[] = [];
  const validationAssignTatValues: number[] = [];
  const executionTatValues: number[] = [];
  const reviewTatValues: number[] = [];
  const tatByDate = new Map<string, number[]>();

  const recordAnalysis = new Map<
    string,
    {
      overallTat: number | null;
      execTat: number | null;
      analysis: ReturnType<typeof analyzeReportDetails>;
    }
  >();

  for (const r of periodRecords) {
    if (r.status === "Unassigned") unassignedCount += 1;
    else if (r.status === "Assigned") assignedCount += 1;
    else if (r.status === "Pending Verification") pendingVerificationCount += 1;
    else if (r.status === "Completed") completedCount += 1;
    else if (r.status === "Request Rejected") rejectedRequestsCount += 1;
    else if (r.status === "Report Rejected") rejectedReportsCount += 1;

    if (r.report?.status === "Draft") draftReportsCount += 1;
    if (r.storeId || r.storeName) auditedStores.add(r.storeId || r.storeName);
    if (typeof r.managerRating === "number" && r.managerRating > 0) {
      ratings.push(r.managerRating);
    }

    const analysis = analyzeReportDetails(r.report);
    totalAuditRows += analysis.rowCount;
    totalBuyingCustomers += analysis.buyingCount;
    totalNonBuyingCustomers += analysis.nonBuyingCount;
    totalMissedOpportunities += analysis.missedOppCount;
    flaggedComplianceIncidents += analysis.flaggedComplianceCount;
    netCashVariance += analysis.cashVariance;

    const valTat = diffHours(r.createdAt, r.assignedAt);
    if (valTat !== null) validationAssignTatValues.push(valTat);

    const execTat = diffHours(
      r.surveyStartsAt || r.assignedAt,
      r.surveyEndsAt || r.reportSubmittedAt,
    );
    if (execTat !== null) executionTatValues.push(execTat);

    const revTat = diffHours(r.reportSubmittedAt || r.surveyEndsAt, r.reportReviewedAt);
    if (revTat !== null) reviewTatValues.push(revTat);

    const endPoint =
      r.status === "Completed" || r.status === "Report Rejected"
        ? r.reportReviewedAt || r.surveyEndsAt || r.reportSubmittedAt
        : r.status === "Pending Verification"
          ? r.reportSubmittedAt || r.surveyEndsAt
          : undefined;
    const overallTat = diffHours(r.createdAt, endPoint) ?? execTat;

    if (overallTat !== null) {
      overallTatValues.push(overallTat);
      const bucket = tatByDate.get(r.isoDate) || [];
      bucket.push(overallTat);
      tatByDate.set(r.isoDate, bucket);
    }

    recordAnalysis.set(r.id, { overallTat, execTat, analysis });
  }

  const totalRequests = periodRecords.length;
  const totalRejected = rejectedRequestsCount + rejectedReportsCount;
  const completionRate =
    totalRequests > 0 ? Number(((completedCount / totalRequests) * 100).toFixed(1)) : 0;
  const rejectionRate =
    totalRequests > 0 ? Number(((totalRejected / totalRequests) * 100).toFixed(1)) : 0;

  const overview: SurveillanceDashboardOverview = {
    totalRequests,
    unassignedCount,
    assignedCount,
    pendingVerificationCount,
    completedCount,
    rejectedRequestsCount,
    rejectedReportsCount,
    draftReportsCount,
    completionRate,
    rejectionRate,
    totalAuditRows,
    totalBuyingCustomers,
    totalNonBuyingCustomers,
    totalMissedOpportunities,
    flaggedComplianceIncidents,
    netCashVariance: Number(netCashVariance.toFixed(2)),
    activeAgentsCount: agents.length,
    auditedStoresCount: auditedStores.size,
    totalStoresCount: stores.length,
    avgManagerRating: averageOrNull(ratings),
  };

  // ── 2. Overall TAT Metrics ──────────────────────────────────────────────
  const slaOnTimeCount = overallTatValues.filter((h) => h <= 48).length;
  const tatBuckets = [
    { bucket: "< 4h", count: 0 },
    { bucket: "4h – 12h", count: 0 },
    { bucket: "12h – 24h", count: 0 },
    { bucket: "24h – 48h", count: 0 },
    { bucket: "> 48h", count: 0 },
  ];
  for (const h of overallTatValues) {
    if (h < 4) tatBuckets[0].count += 1;
    else if (h < 12) tatBuckets[1].count += 1;
    else if (h < 24) tatBuckets[2].count += 1;
    else if (h <= 48) tatBuckets[3].count += 1;
    else tatBuckets[4].count += 1;
  }

  const tatTrend = Array.from(tatByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([isoDate, hrs]) => ({
      isoDate,
      dateLabel: formatShortDateLabel(isoDate),
      avgHours: averageOrNull(hrs) ?? 0,
      count: hrs.length,
    }));

  const tat: SurveillanceDashboardTatMetrics = {
    avgHours: averageOrNull(overallTatValues),
    medianHours: medianOrNull(overallTatValues),
    minHours: overallTatValues.length > 0 ? Number(Math.min(...overallTatValues).toFixed(2)) : null,
    maxHours: overallTatValues.length > 0 ? Number(Math.max(...overallTatValues).toFixed(2)) : null,
    slaComplianceRate:
      overallTatValues.length > 0
        ? Number(((slaOnTimeCount / overallTatValues.length) * 100).toFixed(1))
        : 0,
    slaMeasuredCount: overallTatValues.length,
    validationAssignAvgHours: averageOrNull(validationAssignTatValues),
    executionAvgHours: averageOrNull(executionTatValues),
    reviewAvgHours: averageOrNull(reviewTatValues),
    trend: tatTrend,
    distribution: tatBuckets,
  };

  // ── 3. Daily Performance Report - Departmental ──────────────────────────
  const dailyDeptMap = new Map<
    string,
    {
      date: string;
      department: string;
      requestsReceived: number;
      assigned: number;
      submitted: number;
      completed: number;
      rejected: number;
      tats: number[];
    }
  >();

  const deptSummaryMap = new Map<
    string,
    {
      department: string;
      totalRequests: number;
      completed: number;
      pending: number;
      rejected: number;
      tats: number[];
      dates: Set<string>;
    }
  >();

  for (const r of periodRecords) {
    const key = `${r.isoDate}__${r.department}`;
    const entry = dailyDeptMap.get(key) || {
      date: r.isoDate,
      department: r.department,
      requestsReceived: 0,
      assigned: 0,
      submitted: 0,
      completed: 0,
      rejected: 0,
      tats: [],
    };
    entry.requestsReceived += 1;
    if (r.assignedAt || r.status !== "Unassigned") entry.assigned += 1;
    if (
      r.reportSubmittedAt ||
      r.status === "Pending Verification" ||
      r.status === "Completed" ||
      r.status === "Report Rejected"
    ) {
      entry.submitted += 1;
    }
    if (r.status === "Completed") entry.completed += 1;
    if (r.status === "Request Rejected" || r.status === "Report Rejected") {
      entry.rejected += 1;
    }
    const meta = recordAnalysis.get(r.id);
    if (meta?.overallTat !== null && meta?.overallTat !== undefined) {
      entry.tats.push(meta.overallTat);
    }
    dailyDeptMap.set(key, entry);

    const deptAgg = deptSummaryMap.get(r.department) || {
      department: r.department,
      totalRequests: 0,
      completed: 0,
      pending: 0,
      rejected: 0,
      tats: [],
      dates: new Set<string>(),
    };
    deptAgg.totalRequests += 1;
    deptAgg.dates.add(r.isoDate);
    if (r.status === "Completed") deptAgg.completed += 1;
    else if (r.status === "Request Rejected" || r.status === "Report Rejected") {
      deptAgg.rejected += 1;
    } else {
      deptAgg.pending += 1;
    }
    if (meta?.overallTat !== null && meta?.overallTat !== undefined) {
      deptAgg.tats.push(meta.overallTat);
    }
    deptSummaryMap.set(r.department, deptAgg);
  }

  const departmentalDaily: SurveillanceDepartmentDailyRow[] = Array.from(dailyDeptMap.values())
    .sort((a, b) => b.date.localeCompare(a.date) || b.requestsReceived - a.requestsReceived)
    .map((d) => {
      const reviewed = d.completed + d.rejected;
      const accuracyRate =
        reviewed > 0
          ? Number(((d.completed / reviewed) * 100).toFixed(1))
          : d.requestsReceived > 0
            ? Number((((d.requestsReceived - d.rejected) / d.requestsReceived) * 100).toFixed(1))
            : 100;
      return {
        id: `${d.date}-${d.department}`,
        date: d.date,
        dateLabel: formatFullDateLabel(d.date),
        department: d.department,
        requestsReceived: d.requestsReceived,
        assigned: d.assigned,
        submitted: d.submitted,
        completed: d.completed,
        rejected: d.rejected,
        avgTatHours: averageOrNull(d.tats),
        accuracyRate,
      };
    });

  const departmentalSummary: SurveillanceDepartmentSummary[] = Array.from(deptSummaryMap.values())
    .sort((a, b) => b.totalRequests - a.totalRequests)
    .map((d) => ({
      department: d.department,
      totalRequests: d.totalRequests,
      completed: d.completed,
      pending: d.pending,
      rejected: d.rejected,
      completionRate:
        d.totalRequests > 0 ? Number(((d.completed / d.totalRequests) * 100).toFixed(1)) : 0,
      avgTatHours: averageOrNull(d.tats),
      activeDays: d.dates.size,
    }));

  // ── 4. Monthly Performance (Full Year Comparison for selected year) ─────
  const targetYear = query.year || new Date().getFullYear();
  const monthlyBuckets = Array.from({ length: 12 }, (_, idx) => ({
    monthIndex: idx + 1,
    monthLabel: MONTH_NAMES[idx],
    shortLabel: SHORT_MONTH_NAMES[idx],
    totalRequests: 0,
    completed: 0,
    inProgress: 0,
    rejected: 0,
    tats: [] as number[],
    auditRows: 0,
  }));

  for (const r of dimensionFiltered) {
    const recYear = Number(r.isoDate.slice(0, 4));
    const recMonth = Number(r.isoDate.slice(5, 7));
    if (recYear !== targetYear || recMonth < 1 || recMonth > 12) continue;

    const bucket = monthlyBuckets[recMonth - 1];
    bucket.totalRequests += 1;
    if (r.status === "Completed") bucket.completed += 1;
    else if (r.status === "Request Rejected" || r.status === "Report Rejected") {
      bucket.rejected += 1;
    } else {
      bucket.inProgress += 1;
    }

    const rowCnt = r.report?.rows?.length || (r.report ? 1 : 0);
    bucket.auditRows += rowCnt;

    const endPoint =
      r.status === "Completed" || r.status === "Report Rejected"
        ? r.reportReviewedAt || r.surveyEndsAt || r.reportSubmittedAt
        : r.reportSubmittedAt || r.surveyEndsAt;
    const tatHrs = diffHours(r.createdAt, endPoint);
    if (tatHrs !== null) bucket.tats.push(tatHrs);
  }

  const monthlyPerformance: SurveillanceMonthlyPerformancePoint[] = monthlyBuckets.map((b) => ({
    monthIndex: b.monthIndex,
    monthLabel: b.monthLabel,
    shortLabel: b.shortLabel,
    totalRequests: b.totalRequests,
    completed: b.completed,
    inProgress: b.inProgress,
    rejected: b.rejected,
    completionRate:
      b.totalRequests > 0 ? Number(((b.completed / b.totalRequests) * 100).toFixed(1)) : 0,
    avgTatHours: averageOrNull(b.tats),
    auditRows: b.auditRows,
  }));

  // ── 5 & 6. Individual Performance & Agent-wise Mistakes ─────────────────
  const agentAccMap = new Map<
    string,
    {
      agentId: string;
      agentName: string;
      agentEmail?: string;
      department?: string;
      totalAssigned: number;
      completedCount: number;
      pendingVerificationCount: number;
      inProgressCount: number;
      reportRejectedCount: number;
      tats: number[];
      ratings: number[];
      reportRejections: number;
      auditDiscrepancies: number;
      slaDelays: number;
      recentActivityDate?: string;
      recentIssues: SurveillanceAgentAuditIssue[];
    }
  >();

  for (const r of periodRecords) {
    const agentName = (r.assignedAgentName || "").trim();
    if (!agentName) continue;
    const key = r.assignedAgentId ? `id:${r.assignedAgentId}` : `name:${agentName.toLowerCase()}`;

    const acc = agentAccMap.get(key) || {
      agentId: r.assignedAgentId || key,
      agentName,
      agentEmail: r.assignedAgentEmail,
      department: r.assignedAgentDepartment || "Surveillance & Loss Prevention",
      totalAssigned: 0,
      completedCount: 0,
      pendingVerificationCount: 0,
      inProgressCount: 0,
      reportRejectedCount: 0,
      tats: [],
      ratings: [],
      reportRejections: 0,
      auditDiscrepancies: 0,
      slaDelays: 0,
      recentActivityDate: r.isoDate,
      recentIssues: [],
    };

    acc.totalAssigned += 1;
    if (!acc.recentActivityDate || r.isoDate > acc.recentActivityDate) {
      acc.recentActivityDate = r.isoDate;
    }

    if (r.status === "Completed") acc.completedCount += 1;
    else if (r.status === "Pending Verification") acc.pendingVerificationCount += 1;
    else if (r.status === "Assigned") acc.inProgressCount += 1;
    else if (r.status === "Report Rejected") acc.reportRejectedCount += 1;

    if (typeof r.managerRating === "number" && r.managerRating > 0) {
      acc.ratings.push(r.managerRating);
    }

    const meta = recordAnalysis.get(r.id);
    const agentTat = meta?.execTat ?? meta?.overallTat ?? null;
    if (agentTat !== null) {
      acc.tats.push(agentTat);
      if (agentTat > 48) {
        acc.slaDelays += 1;
        acc.recentIssues.push({
          requestId: r.id,
          storeName: r.storeName,
          marketName: r.marketName,
          date: r.isoDate,
          category: "SLA Delay",
          detail: `Turnaround took ${agentTat.toFixed(1)}h (exceeded 48h SLA target)`,
        });
      }
    }

    if (r.status === "Report Rejected") {
      acc.reportRejections += 1;
      acc.recentIssues.push({
        requestId: r.id,
        storeName: r.storeName,
        marketName: r.marketName,
        date: r.isoDate,
        category: "Report Rejected",
        detail:
          (r.rejectionReason || r.managerComments || "").trim() ||
          "Submitted audit report was declined during verification review.",
      });
    }

    if (meta && meta.analysis.discrepancies.length > 0) {
      acc.auditDiscrepancies += meta.analysis.discrepancies.length;
      for (const detail of meta.analysis.discrepancies.slice(0, 3)) {
        acc.recentIssues.push({
          requestId: r.id,
          storeName: r.storeName,
          marketName: r.marketName,
          date: r.isoDate,
          category: "Audit Discrepancy",
          detail,
        });
      }
    }

    agentAccMap.set(key, acc);
  }

  const allAgentPerformance: SurveillanceAgentPerformanceItem[] = [];
  const agentMistakes: SurveillanceAgentMistakeItem[] = [];

  for (const acc of agentAccMap.values()) {
    const reviewedCount = acc.completedCount + acc.reportRejectedCount;
    const approvalRate =
      reviewedCount > 0
        ? Number(((acc.completedCount / reviewedCount) * 100).toFixed(1))
        : acc.totalAssigned > 0
          ? Number(
              (((acc.totalAssigned - acc.reportRejectedCount) / acc.totalAssigned) * 100).toFixed(
                1,
              ),
            )
          : 0;

    const avgTatHours = averageOrNull(acc.tats);
    const avgManagerRating = averageOrNull(acc.ratings);
    const totalMistakes = acc.reportRejections + acc.auditDiscrepancies + acc.slaDelays;
    const mistakeRate =
      acc.totalAssigned > 0 ? Number(((totalMistakes / acc.totalAssigned) * 100).toFixed(1)) : 0;

    // Transparent composite score (0 - 100)
    const ratingScore = avgManagerRating !== null ? (avgManagerRating / 5) * 100 : approvalRate;
    const tatScore =
      avgTatHours !== null
        ? Math.max(0, Math.min(100, 100 - Math.max(0, avgTatHours - 12) * 1.15))
        : 75;
    const volumeScore = Math.min(100, (acc.completedCount / Math.max(1, acc.totalAssigned)) * 100);
    const mistakePenalty = Math.min(35, mistakeRate * 0.4);

    const rawScore =
      approvalRate * 0.45 +
      ratingScore * 0.25 +
      tatScore * 0.15 +
      volumeScore * 0.15 -
      mistakePenalty;
    const performanceScore = Number(Math.max(0, Math.min(100, rawScore)).toFixed(1));

    const sortedIssues = [...acc.recentIssues].sort((a, b) => b.date.localeCompare(a.date));

    allAgentPerformance.push({
      agentId: acc.agentId,
      agentName: acc.agentName,
      agentEmail: acc.agentEmail,
      department: acc.department,
      totalAssigned: acc.totalAssigned,
      completedCount: acc.completedCount,
      pendingVerificationCount: acc.pendingVerificationCount,
      inProgressCount: acc.inProgressCount,
      reportRejectedCount: acc.reportRejectedCount,
      approvalRate,
      avgTatHours,
      avgManagerRating,
      ratedCount: acc.ratings.length,
      totalMistakes,
      mistakeRate,
      performanceScore,
      recentActivityDate: acc.recentActivityDate,
      recentIssues: sortedIssues,
    });

    if (totalMistakes > 0 || acc.totalAssigned > 0) {
      let topMistakeCategory = "None";
      if (totalMistakes > 0) {
        const categories = [
          { name: "Report Rejections", count: acc.reportRejections },
          { name: "Audit Discrepancies", count: acc.auditDiscrepancies },
          { name: "SLA Delays", count: acc.slaDelays },
        ].sort((a, b) => b.count - a.count);
        topMistakeCategory = categories[0].name;
      }

      agentMistakes.push({
        agentId: acc.agentId,
        agentName: acc.agentName,
        agentEmail: acc.agentEmail,
        totalAudits: acc.totalAssigned,
        totalMistakes,
        mistakeRate,
        reportRejections: acc.reportRejections,
        auditDiscrepancies: acc.auditDiscrepancies,
        slaDelays: acc.slaDelays,
        topMistakeCategory,
        recentIssues: sortedIssues,
      });
    }
  }

  const topHighPerformers = [...allAgentPerformance]
    .sort(
      (a, b) =>
        b.performanceScore - a.performanceScore ||
        b.completedCount - a.completedCount ||
        a.totalMistakes - b.totalMistakes,
    )
    .slice(0, 10);

  const topLowPerformers = [...allAgentPerformance]
    .sort(
      (a, b) =>
        a.performanceScore - b.performanceScore ||
        b.totalMistakes - a.totalMistakes ||
        (b.avgTatHours ?? 0) - (a.avgTatHours ?? 0),
    )
    .slice(0, 10);

  const rankedAgentMistakes = [...agentMistakes]
    .filter((m) => m.totalMistakes > 0)
    .sort(
      (a, b) =>
        b.totalMistakes - a.totalMistakes ||
        b.mistakeRate - a.mistakeRate ||
        b.reportRejections - a.reportRejections,
    );

  // ── 7. Top 5 Markets for Surveillance ───────────────────────────────────
  const marketAccMap = new Map<
    string,
    {
      marketName: string;
      totalRequests: number;
      completed: number;
      inProgress: number;
      rejected: number;
      tats: number[];
      flaggedIncidents: number;
      stores: Set<string>;
    }
  >();

  for (const r of periodRecords) {
    const mName = r.marketName || "Unassigned Market";
    const mAgg = marketAccMap.get(mName) || {
      marketName: mName,
      totalRequests: 0,
      completed: 0,
      inProgress: 0,
      rejected: 0,
      tats: [],
      flaggedIncidents: 0,
      stores: new Set<string>(),
    };

    mAgg.totalRequests += 1;
    if (r.status === "Completed") mAgg.completed += 1;
    else if (r.status === "Request Rejected" || r.status === "Report Rejected") {
      mAgg.rejected += 1;
    } else {
      mAgg.inProgress += 1;
    }

    if (r.storeId || r.storeName) mAgg.stores.add(r.storeId || r.storeName);

    const meta = recordAnalysis.get(r.id);
    if (meta?.overallTat !== null && meta?.overallTat !== undefined) {
      mAgg.tats.push(meta.overallTat);
    }
    if (meta) {
      mAgg.flaggedIncidents += meta.analysis.flaggedComplianceCount;
    }

    marketAccMap.set(mName, mAgg);
  }

  const topMarkets: SurveillanceTopMarketItem[] = Array.from(marketAccMap.values())
    .sort((a, b) => b.totalRequests - a.totalRequests || b.completed - a.completed)
    .slice(0, 5)
    .map((m, idx) => ({
      rank: idx + 1,
      marketName: m.marketName,
      totalRequests: m.totalRequests,
      completed: m.completed,
      inProgress: m.inProgress,
      rejected: m.rejected,
      completionRate:
        m.totalRequests > 0 ? Number(((m.completed / m.totalRequests) * 100).toFixed(1)) : 0,
      sharePercentage:
        totalRequests > 0 ? Number(((m.totalRequests / totalRequests) * 100).toFixed(1)) : 0,
      avgTatHours: averageOrNull(m.tats),
      flaggedIncidents: m.flaggedIncidents,
      storesAudited: m.stores.size,
    }));

  return {
    periodLabel,
    rangeStart: startIso,
    rangeEnd: endIso,
    availableYears,
    availableMarkets,
    availableDepartments,
    overview,
    tat,
    departmentalDaily,
    departmentalSummary,
    monthlyPerformance,
    topHighPerformers,
    topLowPerformers,
    allAgentPerformance,
    agentMistakes: rankedAgentMistakes,
    topMarkets,
    lastUpdatedAt: new Date().toISOString(),
  };
}
