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

export interface CommissionType {
  id: number;
  name: string;
  isActive: boolean;
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

  async dailyCommissionParsePdf(file: File): Promise<PdfImport> {
    const form = new FormData();
    form.append("file", file);

    const headers: Record<string, string> = {};
    const token = http.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["token"] = token;
    }

    const res = await fetch(
      `${http.baseUrl}${DAILY_COMMISSION_FILTER_API_PATHS.dailyCommissionParsePdf}`,
      {
        method: "POST",
        headers,
        body: form,
      },
    );

    let json: ApiEnvelope<PdfImport>;
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
