import { http, type ApiEnvelope } from "../../http";
import { DAILY_COMMISSION_FILTER_API_PATHS } from "@/lib/config";

export const PAY_TYPES = [
  { id: 1, label: "Dollar ($)" },
  { id: 2, label: "Percentage (%)" },
] as const;

export interface CommissionFilter {
  criteria: string | null;
  minValue: number | null;
  maxValue: number | null;
  commissionPayout: number;
  payTypeId: number;
  isActive: boolean;
}

/* "Which lines?": a raw ADR column and its ticked values */
export interface CommissionCondition {
  column: string;
  values: string[];
}

export interface CommissionType {
  id: number;
  name: string;
  isActive: boolean;
  countInBox?: boolean;
  sortOrder?: number;
  conditions?: CommissionCondition[];
  filters: CommissionFilter[];
}

export interface CommissionHistory {
  savedAt: string;
  types: CommissionType[];
}

export interface CommissionMonth {
  year: number;
  month: number;
  savedDate?: string;
  types: CommissionType[];
  history?: CommissionHistory[];
}

export interface PdfImport {
  month: number | null;
  types: CommissionType[];
  skipped: string[];
}

export type CommissionUploadType = "adr" | "sdr" | "retention" | "eligibility";

export interface CommissionUpload {
  type: CommissionUploadType;
  rows: number;
  deleted?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface SdrFilter {
  marketId: number;
  name: string;
  isActive: boolean;
}

export class DailyCommissionFilterService {
  async getDailyCommissionSdrFilter(): Promise<SdrFilter[]> {
    const res = await http.get<SdrFilter[]>(
      DAILY_COMMISSION_FILTER_API_PATHS.getDailyCommissionSdrFilter,
    );
    return res.data ?? [];
  }

  async saveDailyCommissionSdrFilter(sdrFilters: SdrFilter[]): Promise<SdrFilter[]> {
    const res = await http.post<SdrFilter[]>(
      DAILY_COMMISSION_FILTER_API_PATHS.saveDailyCommissionSdrFilter,
      sdrFilters,
    );
    return res.data ?? [];
  }

  async refreshDailyCommissionSummary(): Promise<void> {
    await http.post<boolean>(DAILY_COMMISSION_FILTER_API_PATHS.refreshDailyCommissionSummary, {});
  }

  async getAllDailyCommissionFilter(): Promise<CommissionMonth[]> {
    const res = await http.get<CommissionMonth[]>(
      DAILY_COMMISSION_FILTER_API_PATHS.getAllDailyCommissionFilter,
    );
    return res.data ?? [];
  }

  async saveDailyCommissionFilter(month: CommissionMonth): Promise<CommissionType[]> {
    const res = await http.post<CommissionType[]>(
      DAILY_COMMISSION_FILTER_API_PATHS.saveDailyCommissionFilter,
      month,
    );
    return res.data ?? [];
  }

  async deleteDailyCommissionFilter(id: number, year: number, month: number): Promise<void> {
    await http.delete<boolean>(
      DAILY_COMMISSION_FILTER_API_PATHS.deleteDailyCommissionFilter(id, year, month),
    );
  }

  async getDailyCommissionConditionColumns(): Promise<string[]> {
    const res = await http.get<string[]>(
      DAILY_COMMISSION_FILTER_API_PATHS.getDailyCommissionConditionColumns,
    );
    return res.data ?? [];
  }

  async getDailyCommissionColumnValues(column: string): Promise<string[]> {
    const res = await http.get<string[]>(
      DAILY_COMMISSION_FILTER_API_PATHS.getDailyCommissionColumnValues(column),
    );
    return res.data ?? [];
  }

  async getDailyCommissionUploads(): Promise<CommissionUpload[]> {
    const res = await http.get<CommissionUpload[]>(
      DAILY_COMMISSION_FILTER_API_PATHS.getDailyCommissionUploads,
    );
    return res.data ?? [];
  }

  async dailyCommissionUpload(type: CommissionUploadType, file: File): Promise<CommissionUpload> {
    // ADR / SDR csv files are ~100 MB, gzipped they are ~10 MB.
    const upload =
      type === "adr" || type === "sdr"
        ? new File(
            [await new Response(file.stream().pipeThrough(new CompressionStream("gzip"))).blob()],
            `${file.name}.gz`,
          )
        : file;
    return this.postFile<CommissionUpload>(
      DAILY_COMMISSION_FILTER_API_PATHS.dailyCommissionUpload(type),
      upload,
    );
  }

  async dailyCommissionParsePdf(file: File): Promise<PdfImport> {
    return this.postFile<PdfImport>(
      DAILY_COMMISSION_FILTER_API_PATHS.dailyCommissionParsePdf,
      file,
    );
  }

  private async postFile<T>(path: string, file: File): Promise<T> {
    const form = new FormData();
    form.append("file", file);

    const headers: Record<string, string> = {};
    const token = http.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["token"] = token;
    }

    const res = await fetch(`${http.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: form,
    });

    let json: ApiEnvelope<T>;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Network error (${res.status})`);
    }
    if (!res.ok || !json.success) throw new Error(json?.message || `Upload failed (${res.status})`);
    return json.data;
  }
}

export const dailyCommissionFilterService = new DailyCommissionFilterService();
