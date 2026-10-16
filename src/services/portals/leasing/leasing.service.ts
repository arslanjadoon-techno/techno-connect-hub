import {
  LEASING_API_BASE_URL,
  LEASING_API_PATHS,
  LEASING_UPLOAD_API_BASE_URL,
} from "@/lib/config";
import type {
  LeaseRecord,
  TotalRent,
  TotalRentPerTechId,
  UpcomingRentChange,
  LeaseDoc,
  MissingDocsRequest,
  LeaseExpirationRemark,
  RentPaidSummary,
  LeasingOwnersAccount,
  ReportTemplate,
  LeaseRentAgreement,
  RentalPaymentDetail,
  FinancialMonthlyFiguresUpdate,
  NewLeaseAgreement,
} from "./types";

/**
 * Leasing portal API calls. LeasingController's endpoints return raw JSON
 * (plain arrays/objects), not the {success, message, data} envelope the rest
 * of MISFrontend's `http` client expects - so this talks to the backend
 * directly, the same way the Commission service does.
 */
export class LeasingService {
  constructor(public readonly baseUrl: string = LEASING_API_BASE_URL) {}

  // LeasingController reads the raw JWT off a custom "token" header (not the
  // standard Authorization: Bearer scheme - it doesn't use [Authorize] at all,
  // it manually calls JWTTokenController.IsUserAllowed(Request.Headers["token"], ...)).
  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const token = window.localStorage.getItem("token");
      if (token) headers["token"] = token;
    } catch {
      // ignore - no localStorage access
    }
    return headers;
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    try {
      const token = window.localStorage.getItem("token");
      if (token) headers["token"] = token;
    } catch {
      // ignore - no localStorage access
    }
    return headers;
  }

  /** POST multipart/form-data - no Content-Type header, let the browser set the boundary. */
  private async uploadFile<T>(
    path: string,
    formData: FormData,
    query?: Record<string, string | number | undefined | null>,
  ): Promise<T> {
    const q = query ? this.buildQuery(query) : "";
    const res = await fetch(`${this.baseUrl}${path}${q}`, {
      method: "POST",
      headers: this.authHeaders(),
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed (${res.status}: ${res.statusText})`);
    }

    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  private buildQuery(params: Record<string, string | number | undefined | null>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    return parts.length > 0 ? `?${parts.join("&")}` : "";
  }

  private async request<T>(
    path: string,
    opts: {
      method?: string;
      body?: unknown;
      query?: Record<string, string | number | undefined | null>;
    } = {},
  ): Promise<T> {
    const query = opts.query ? this.buildQuery(opts.query) : "";
    const res = await fetch(`${this.baseUrl}${path}${query}`, {
      method: opts.method ?? "GET",
      headers: this.headers(),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      throw new Error(`Leasing request failed (${res.status}: ${res.statusText})`);
    }

    // Some endpoints (e.g. PostLeasingInfo) return a plain success message, not JSON.
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  // ---------- Lease records ---------- //

  // Every leasing page (Manage Leasing, Leasing Detail, Dashboard, Reports, Lease
  // Monitor, Rent Payment List...) independently calls getAllLeasing() on mount,
  // which previously meant a full GetLeasingInfo round-trip on every navigation
  // even when nothing changed. Cached in-memory for the life of the tab (same
  // tradeoff the old LeasingFrontend made with its module-level `leasingCache`);
  // postLeasingInfo patches the cache in place on success so other pages read
  // the update without forcing a refetch, and `force: true` (Manage Leasing's
  // Refresh button) bypasses it for an explicit reload.
  private leasesCache: LeaseRecord[] | null = null;

  async getAllLeasing(options?: { force?: boolean }): Promise<LeaseRecord[]> {
    if (!options?.force && this.leasesCache) return this.leasesCache;
    const data = await this.request<LeaseRecord[]>(LEASING_API_PATHS.getLeasingInfo);
    const rows = Array.isArray(data) ? data : [];
    // hvac/HVAC casing and landLordPointOfContact/pointOfContact drift, same
    // normalization the old LeasingFrontend applied on read.
    const normalized = rows.map((row) => {
      const raw = row as Record<string, unknown>;
      const hvac = (row.hvac ?? raw.hVAC ?? raw.HVAC ?? null) as string | null;
      const landLordPointOfContact = (row.landLordPointOfContact ?? raw.pointOfContact ?? null) as
        string | null;
      return { ...row, hvac, landLordPointOfContact };
    });
    this.leasesCache = normalized;
    return normalized;
  }

  async postLeasingInfo(data: LeaseRecord): Promise<unknown> {
    const result = await this.request(LEASING_API_PATHS.postLeasingInfo, {
      method: "POST",
      body: data,
    });
    if (this.leasesCache) {
      this.leasesCache = this.leasesCache.map((l) =>
        l.techId === data.techId ? { ...l, ...data } : l,
      );
    }
    return result;
  }

  async postLeasingDocs(data: unknown): Promise<unknown> {
    return this.request(LEASING_API_PATHS.postLeasingDocs, { method: "POST", body: data });
  }

  async getLeasingDocs(techId: string): Promise<LeaseDoc[]> {
    const data = await this.request<LeaseDoc[]>(LEASING_API_PATHS.getLeasingDocs, {
      query: { TechID: techId },
    });
    return Array.isArray(data) ? data : [];
  }

  async deleteLeaseDocs(fileId: number): Promise<unknown> {
    return this.request(LEASING_API_PATHS.deleteLeaseDocs, { method: "DELETE", query: { fileId } });
  }

  async renameLeaseDocs(fileId: number, newName: string): Promise<unknown> {
    return this.request(LEASING_API_PATHS.renameLeaseDocs, {
      method: "POST",
      query: { fileId, newName },
    });
  }

  async reorderLeaseDocs(items: Array<{ id: number; sortOrder: number }>): Promise<unknown> {
    return this.request(LEASING_API_PATHS.reorderLeaseDocs, { method: "POST", body: items });
  }

  /**
   * PUTs the file straight to S3 via FileUploadController's UploadFile
   * endpoint. Uses XHR (not fetch) so upload progress can be reported.
   * Resolves with the S3 URL the backend stored the file at.
   */
  uploadLeaseDocumentFile(
    file: File,
    techId: string,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${LEASING_UPLOAD_API_BASE_URL}${LEASING_API_PATHS.uploadFile}?TechID=${encodeURIComponent(techId)}`;
      xhr.open("PUT", url);
      try {
        const token = window.localStorage.getItem("token");
        if (token) xhr.setRequestHeader("token", token);
      } catch {
        // ignore - no localStorage access
      }
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as { Message?: string; message?: string };
            resolve(data.Message ?? data.message ?? "");
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed: network error"));
      const body = new FormData();
      body.append("file", file);
      xhr.send(body);
    });
  }

  async getMissingDocsList(techId: string): Promise<string[]> {
    const data = await this.request<string[]>(LEASING_API_PATHS.missingDocsList, {
      query: { TechId: techId },
    });
    return Array.isArray(data) ? data : [];
  }

  async addMissingDocsList(payload: MissingDocsRequest): Promise<unknown> {
    return this.request(LEASING_API_PATHS.addMissingDocsList, {
      method: "POST",
      body: { TechId: payload.techId, MissingDocs: payload.missingDocs },
    });
  }

  // ---------- Rent figures ---------- //

  async getMonthlyRentFigure(): Promise<TotalRent[]> {
    const data = await this.request<TotalRent[]>(LEASING_API_PATHS.getMonthlyRentFigure);
    return Array.isArray(data) ? data : [];
  }

  async getMonthlyRentFigureByTechId(techId: string): Promise<TotalRentPerTechId[]> {
    const data = await this.request<TotalRentPerTechId[]>(
      LEASING_API_PATHS.getMonthlyRentFigureByTechId,
      { query: { techID: techId } },
    );
    return Array.isArray(data) ? data : [];
  }

  async getUpcomingRentChanges(): Promise<UpcomingRentChange[]> {
    const data = await this.request<UpcomingRentChange[]>(LEASING_API_PATHS.getUpcomingRentChanges);
    return Array.isArray(data) ? data : [];
  }

  async getRentalPaymentDetails(
    year: string | number,
    month: string | number,
  ): Promise<RentalPaymentDetail[]> {
    const data = await this.request<RentalPaymentDetail[]>(
      LEASING_API_PATHS.getRentalPaymentDetails,
      {
        query: { year, month },
      },
    );
    return Array.isArray(data) ? data : [];
  }

  async populateRentInMonthlyTable(month: number, year: number): Promise<unknown> {
    return this.request(LEASING_API_PATHS.populateRentInMonthlyTable, {
      method: "POST",
      body: { month, year },
    });
  }

  async updateFinancialMonthlyFigures(data: FinancialMonthlyFiguresUpdate): Promise<unknown> {
    return this.request(LEASING_API_PATHS.updateFinancialMonthlyFigures, {
      method: "POST",
      body: data,
    });
  }

  async updateFinancialMonthlyFiguresRowWise(
    data: Partial<FinancialMonthlyFiguresUpdate>,
  ): Promise<unknown> {
    return this.request(LEASING_API_PATHS.updateFinancialMonthlyFiguresRowWise, {
      method: "POST",
      body: data,
    });
  }

  // ---------- Rent agreements ---------- //

  async insertLeaseRentAgreement(data: NewLeaseAgreement): Promise<unknown> {
    return this.request(LEASING_API_PATHS.insertLeaseRentAgreement, { method: "POST", body: data });
  }

  async getAllLeaseRentAgreements(): Promise<LeaseRentAgreement[]> {
    const data = await this.request<LeaseRentAgreement[]>(LEASING_API_PATHS.getLeaseRentAgreement);
    return Array.isArray(data) ? data : [];
  }

  async getLeaseRentAgreementByTechId(techId: string): Promise<LeaseRentAgreement[]> {
    const data = await this.request<LeaseRentAgreement[]>(LEASING_API_PATHS.getLeaseRentAgreement, {
      query: { TechId: techId },
    });
    return Array.isArray(data) ? data : [];
  }

  async updateLeaseRentAgreement(data: unknown): Promise<unknown> {
    return this.request(LEASING_API_PATHS.updateLeaseRentAgreement, { method: "POST", body: data });
  }

  async deleteLeaseRentAgreement(data: {
    TechID: string;
    StartDate: string;
    EndDate?: string | null;
  }): Promise<unknown> {
    return this.request(LEASING_API_PATHS.deleteLeaseRentAgreement, {
      method: "DELETE",
      body: data,
    });
  }

  // ---------- Lease expiration remarks ---------- //

  async getLeaseExpirationRemarks(techId: string): Promise<unknown[]> {
    const data = await this.request<unknown[]>(LEASING_API_PATHS.getLeaseExpirationRemarks, {
      query: { TechId: techId },
    });
    return Array.isArray(data) ? data : [];
  }

  /** Bulk variant - one row per TechId - used by the Custom Report Builder. */
  async getAllLeaseExpirationRemarks(): Promise<LeaseExpirationRemark[]> {
    const data = await this.request<LeaseExpirationRemark[]>(
      LEASING_API_PATHS.getAllLeaseExpirationRemarks,
    );
    return Array.isArray(data) ? data : [];
  }

  async saveLeaseExpirationRemarks(data: unknown): Promise<unknown> {
    return this.request(LEASING_API_PATHS.saveLeaseExpirationRemarks, {
      method: "POST",
      body: data,
    });
  }

  // ---------- Report templates ---------- //

  async getReportTemplates(): Promise<ReportTemplate[]> {
    const data = await this.request<ReportTemplate[]>(LEASING_API_PATHS.getReportTemplates);
    return Array.isArray(data) ? data : [];
  }

  async saveReportTemplate(name: string, fields: string[]): Promise<unknown> {
    return this.request(LEASING_API_PATHS.saveReportTemplate, {
      method: "POST",
      body: { name, fields },
    });
  }

  async deleteReportTemplate(id: number): Promise<unknown> {
    return this.request(LEASING_API_PATHS.deleteReportTemplate, {
      method: "DELETE",
      query: { id },
    });
  }

  // ---------- Bulk upload ---------- //

  async bulkUploadRent(
    file: File,
    year: string | number,
    month: string | number,
  ): Promise<Record<string, string>> {
    const formData = new FormData();
    formData.append("file", file);
    const result = await this.uploadFile<Record<string, string>>(
      LEASING_API_PATHS.bulkUploadRent,
      formData,
      { year, month },
    );
    return result && typeof result === "object" ? result : {};
  }

  async bulkUploadAccounting(
    file: File,
    year: string | number,
    month: string | number,
  ): Promise<Record<string, string>> {
    const formData = new FormData();
    formData.append("file", file);
    const result = await this.uploadFile<Record<string, string>>(
      LEASING_API_PATHS.bulkUploadAccounting,
      formData,
      { year, month },
    );
    return result && typeof result === "object" ? result : {};
  }

  async bulkUploadLeaseDetails(file: File, category: string): Promise<Record<string, string>> {
    const formData = new FormData();
    formData.append("file", file);
    const result = await this.uploadFile<Record<string, string>>(
      LEASING_API_PATHS.bulkUploadLeaseDetails,
      formData,
      { category },
    );
    return result && typeof result === "object" ? result : {};
  }

  // ---------- Banking info ---------- //

  async getBankingInfo(): Promise<LeasingOwnersAccount[]> {
    const data = await this.request<LeasingOwnersAccount[]>(LEASING_API_PATHS.getBankingInfo);
    return Array.isArray(data) ? data : [];
  }

  async postBankingInfo(data: LeasingOwnersAccount): Promise<unknown> {
    return this.request(LEASING_API_PATHS.postBankingInfo, { method: "POST", body: data });
  }
}

export const leasingService = new LeasingService();
