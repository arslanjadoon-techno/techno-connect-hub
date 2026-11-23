import {
  HOUSING_LEASING_API_BASE_URL,
  HOUSING_LEASING_API_PATHS,
  HOUSING_LEASING_UPLOAD_API_BASE_URL,
} from "@/lib/config";
import type {
  HousingLeaseRecord,
  HousingTotalRent,
  HousingTotalRentPerUnitId,
  HousingUpcomingRentChange,
  HousingLeaseDoc,
  HousingMissingDocsRequest,
  HousingLeaseExpirationRemark,
  HousingOwnersAccount,
  HousingLeaseRentAgreement,
  HousingRentalPaymentDetail,
  HousingFinancialMonthlyFiguresUpdate,
  NewHousingLeaseAgreement,
  HousingReportTemplate,
  HousingOccupant,
  AddHousingOccupantRequest,
  ShiftHousingOccupantRequest,
  RemoveHousingOccupantRequest,
} from "./types";

/**
 * Housing Leasing portal API calls. Full duplicate of LeasingService, keyed
 * on UnitId (int) instead of Leasing's TechId (string). HousingLeasingController's
 * endpoints return raw JSON (plain arrays/objects), not the {success, message,
 * data} envelope the rest of MISFrontend's `http` client expects - so this
 * talks to the backend directly, same as LeasingService.
 */
export class HousingLeasingService {
  constructor(public readonly baseUrl: string = HOUSING_LEASING_API_BASE_URL) {}

  // HousingLeasingController reads the raw JWT off a custom "token" header
  // (not the standard Authorization: Bearer scheme), same legacy auth
  // pattern as LeasingController.
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
      // Occupant endpoints (e.g. AddHousingOccupant's 409 on a duplicate active
      // assignment) return a JSON { Message } body with the real reason - surface
      // that instead of the generic status text when it's there.
      let message = `Housing Leasing request failed (${res.status}: ${res.statusText})`;
      try {
        const body = await res.clone().json();
        if (body?.Message || body?.message) message = body.Message ?? body.message;
      } catch {
        // response wasn't JSON - keep the generic message
      }
      throw new Error(message);
    }

    // Some endpoints (e.g. PostHousingLeasingInfo) return a plain success message, not JSON.
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  // ---------- Lease records ---------- //

  // Mirrors LeasingService.getAllLeasing's in-memory tab-lifetime cache - every
  // Housing Leasing page independently calls getAllHousingLeasing() on mount.
  private leasesCache: HousingLeaseRecord[] | null = null;

  async getAllHousingLeasing(options?: { force?: boolean }): Promise<HousingLeaseRecord[]> {
    if (!options?.force && this.leasesCache) return this.leasesCache;
    const data = await this.request<HousingLeaseRecord[]>(
      HOUSING_LEASING_API_PATHS.getHousingLeasingInfo,
    );
    const rows = Array.isArray(data) ? data : [];
    this.leasesCache = rows;
    return rows;
  }

  async postHousingLeasingInfo(data: HousingLeaseRecord): Promise<unknown> {
    const result = await this.request(HOUSING_LEASING_API_PATHS.postHousingLeasingInfo, {
      method: "POST",
      body: data,
    });
    if (this.leasesCache) {
      this.leasesCache = this.leasesCache.map((l) =>
        l.unitId === data.unitId ? { ...l, ...data } : l,
      );
    }
    return result;
  }

  async postHousingLeasingDocs(data: unknown): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.postHousingLeasingDocs, {
      method: "POST",
      body: data,
    });
  }

  async getHousingLeasingDocs(unitId: number): Promise<HousingLeaseDoc[]> {
    const data = await this.request<HousingLeaseDoc[]>(
      HOUSING_LEASING_API_PATHS.getHousingLeasingDocs,
      { query: { UnitId: unitId } },
    );
    return Array.isArray(data) ? data : [];
  }

  async deleteLeaseDocs(fileId: number): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.deleteHousingLeaseDocs, {
      method: "DELETE",
      query: { fileId },
    });
  }

  async renameLeaseDocs(fileId: number, newName: string): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.renameHousingLeaseDocs, {
      method: "POST",
      query: { fileId, newName },
    });
  }

  async reorderLeaseDocs(items: Array<{ id: number; sortOrder: number }>): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.reorderHousingLeaseDocs, {
      method: "POST",
      body: items,
    });
  }

  /**
   * PUTs the file straight to S3 via FileUploadController's UploadFile
   * endpoint - the exact same endpoint Leasing uses, reused as-is. The
   * generic "TechID" query param is just an S3 folder-path prefix, so the
   * housing unit's id is passed into it as a string (no backend change
   * needed here).
   */
  uploadLeaseDocumentFile(
    file: File,
    unitId: number,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${HOUSING_LEASING_UPLOAD_API_BASE_URL}${HOUSING_LEASING_API_PATHS.uploadFile}?TechID=${encodeURIComponent(String(unitId))}`;
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

  async getMissingDocsList(unitId: number): Promise<string[]> {
    const data = await this.request<string[]>(HOUSING_LEASING_API_PATHS.missingDocsList, {
      query: { UnitId: unitId },
    });
    return Array.isArray(data) ? data : [];
  }

  async addMissingDocsList(payload: HousingMissingDocsRequest): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.addMissingDocsList, {
      method: "POST",
      body: { UnitId: payload.unitId, MissingDocs: payload.missingDocs },
    });
  }

  // ---------- Rent figures ---------- //

  async getMonthlyRentFigure(): Promise<HousingTotalRent[]> {
    const data = await this.request<HousingTotalRent[]>(
      HOUSING_LEASING_API_PATHS.getMonthlyRentFigure,
    );
    return Array.isArray(data) ? data : [];
  }

  async getMonthlyRentFigureByUnitId(unitId: number): Promise<HousingTotalRentPerUnitId[]> {
    const data = await this.request<HousingTotalRentPerUnitId[]>(
      HOUSING_LEASING_API_PATHS.getMonthlyRentFigureByUnitId,
      { query: { UnitId: unitId } },
    );
    return Array.isArray(data) ? data : [];
  }

  async getUpcomingRentChanges(): Promise<HousingUpcomingRentChange[]> {
    const data = await this.request<HousingUpcomingRentChange[]>(
      HOUSING_LEASING_API_PATHS.getUpcomingRentChanges,
    );
    return Array.isArray(data) ? data : [];
  }

  async getRentalPaymentDetails(
    year: string | number,
    month: string | number,
    unitId?: number,
  ): Promise<HousingRentalPaymentDetail[]> {
    const data = await this.request<HousingRentalPaymentDetail[]>(
      HOUSING_LEASING_API_PATHS.getRentalPaymentDetails,
      { query: { year, month, UnitId: unitId } },
    );
    return Array.isArray(data) ? data : [];
  }

  async populateRentInMonthlyTable(month: number, year: number, unitId?: number): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.populateRentInMonthlyTable, {
      method: "POST",
      body: { month, year, UnitId: unitId },
    });
  }

  async updateFinancialMonthlyFigures(data: HousingFinancialMonthlyFiguresUpdate): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.updateFinancialMonthlyFigures, {
      method: "POST",
      body: data,
    });
  }

  async updateFinancialMonthlyFiguresRowWise(
    data: Partial<HousingFinancialMonthlyFiguresUpdate>,
  ): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.updateFinancialMonthlyFiguresRowWise, {
      method: "POST",
      body: data,
    });
  }

  // ---------- Rent agreements ---------- //

  async insertLeaseRentAgreement(data: NewHousingLeaseAgreement): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.insertLeaseRentAgreement, {
      method: "POST",
      body: data,
    });
  }

  async getAllLeaseRentAgreements(): Promise<HousingLeaseRentAgreement[]> {
    const data = await this.request<HousingLeaseRentAgreement[]>(
      HOUSING_LEASING_API_PATHS.getLeaseRentAgreement,
    );
    return Array.isArray(data) ? data : [];
  }

  async getLeaseRentAgreementByUnitId(unitId: number): Promise<HousingLeaseRentAgreement[]> {
    const data = await this.request<HousingLeaseRentAgreement[]>(
      HOUSING_LEASING_API_PATHS.getLeaseRentAgreement,
      { query: { UnitId: unitId } },
    );
    return Array.isArray(data) ? data : [];
  }

  async updateLeaseRentAgreement(data: unknown): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.updateLeaseRentAgreement, {
      method: "POST",
      body: data,
    });
  }

  async deleteLeaseRentAgreement(data: {
    UnitId: number;
    StartDate: string;
    EndDate?: string | null;
  }): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.deleteLeaseRentAgreement, {
      method: "DELETE",
      body: data,
    });
  }

  // ---------- Lease expiration remarks ---------- //

  async getLeaseExpirationRemarks(unitId: number): Promise<HousingLeaseExpirationRemark[]> {
    const data = await this.request<HousingLeaseExpirationRemark[]>(
      HOUSING_LEASING_API_PATHS.getLeaseExpirationRemarks,
      { query: { UnitId: unitId } },
    );
    return Array.isArray(data) ? data : [];
  }

  /** Bulk variant - one row per UnitId - used by the Custom Report Builder. */
  async getAllLeaseExpirationRemarks(): Promise<HousingLeaseExpirationRemark[]> {
    const data = await this.request<HousingLeaseExpirationRemark[]>(
      HOUSING_LEASING_API_PATHS.getAllLeaseExpirationRemarks,
    );
    return Array.isArray(data) ? data : [];
  }

  async saveLeaseExpirationRemarks(data: unknown): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.saveLeaseExpirationRemarks, {
      method: "POST",
      body: data,
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
      HOUSING_LEASING_API_PATHS.bulkUploadRent,
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
      HOUSING_LEASING_API_PATHS.bulkUploadAccounting,
      formData,
      { year, month },
    );
    return result && typeof result === "object" ? result : {};
  }

  async bulkUploadLeaseDetails(file: File, category: string): Promise<Record<string, string>> {
    const formData = new FormData();
    formData.append("file", file);
    const result = await this.uploadFile<Record<string, string>>(
      HOUSING_LEASING_API_PATHS.bulkUploadLeaseDetails,
      formData,
      { category },
    );
    return result && typeof result === "object" ? result : {};
  }

  // ---------- Banking info ---------- //

  async getBankingInfo(): Promise<HousingOwnersAccount[]> {
    const data = await this.request<HousingOwnersAccount[]>(
      HOUSING_LEASING_API_PATHS.getBankingInfo,
    );
    return Array.isArray(data) ? data : [];
  }

  async postBankingInfo(data: HousingOwnersAccount): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.postBankingInfo, { method: "POST", body: data });
  }

  // House registry CRUD (GetHousingUnits/AddHousingUnit/UpdateHousingUnit) used
  // to live here against a local HousingUnits table. That table is gone - houses
  // are now registered/edited through housesService (/api/houses/*) instead.

  // ---------- Report templates ---------- //

  async getHousingReportTemplates(): Promise<HousingReportTemplate[]> {
    const data = await this.request<HousingReportTemplate[]>(
      HOUSING_LEASING_API_PATHS.getHousingReportTemplates,
    );
    return Array.isArray(data) ? data : [];
  }

  async saveHousingReportTemplate(name: string, fields: string[]): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.saveHousingReportTemplate, {
      method: "POST",
      body: { name, fields },
    });
  }

  async deleteHousingReportTemplate(id: number): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.deleteHousingReportTemplate, {
      method: "DELETE",
      query: { id },
    });
  }

  // ---------- Occupants ---------- //

  async getHousingOccupants(unitId: number): Promise<HousingOccupant[]> {
    const data = await this.request<HousingOccupant[]>(HOUSING_LEASING_API_PATHS.getHousingOccupants, {
      query: { UnitId: unitId },
    });
    return Array.isArray(data) ? data : [];
  }

  /** 409 means the employee already has an active assignment elsewhere - surfaced as a thrown Error by `request`. */
  async addHousingOccupant(data: AddHousingOccupantRequest): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.addHousingOccupant, {
      method: "POST",
      body: data,
    });
  }

  async shiftHousingOccupant(data: ShiftHousingOccupantRequest): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.shiftHousingOccupant, {
      method: "POST",
      body: data,
    });
  }

  async removeHousingOccupant(data: RemoveHousingOccupantRequest): Promise<unknown> {
    return this.request(HOUSING_LEASING_API_PATHS.removeHousingOccupant, {
      method: "POST",
      body: data,
    });
  }
}

export const housingLeasingService = new HousingLeasingService();
