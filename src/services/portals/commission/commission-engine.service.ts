import { http, type ApiEnvelope } from "../../http";
import { COMMISSION_ENGINE_API_PATHS } from "@/lib/config";

export interface CePlanSummary {
  id: number;
  year: number;
  month: number;
  name: string;
  lastRunAt: string | null;
}

export interface CeSettings {
  alwaysEligibleMarkets: string[];
  totalBoxExclude: string[];
  eligibilityMetric: string;
  activeStatusMetric: string;
  eligibleListMetric: string;
  retentionMetric: string;
}

export interface CeCondition {
  field: string;
  op: string;
  value: string | null;
}

export interface CeRule {
  id: number;
  source: string;
  sortOrder: number;
  category: string;
  valueField: string | null;
  skipEligibility: boolean;
  conditions: CeCondition[];
  note: string | null;
}

export interface CeTier {
  min: number | null;
  max: number | null;
  amount: number | null;
  percent: number | null;
}

export interface CeComponent {
  id: number;
  code: string;
  name: string;
  reportGroup: string;
  sortOrder: number;
  kind: string;
  source: string | null;
  categories: string | null;
  calc: string | null;
  rate: number | null;
  tierBasis: string | null;
  tierMetric: string | null;
  tiers: CeTier[];
  gateMetric: string | null;
  gateMin: number | null;
  inGross: boolean;
}

export interface CePlan {
  id: number;
  year: number;
  month: number;
  name: string;
  settings: CeSettings;
  rules: CeRule[];
  components: CeComponent[];
}

export interface CeField {
  name: string;
  kind: "text" | "number" | "date";
  computed: boolean;
}

export interface CeFieldValue {
  value: string;
  count: number;
}

export interface CeMetricSummary {
  metricCode: string;
  count: number;
}

export interface CeAdjustment {
  id: number;
  typeCode: string;
  ntid: string;
  market: string | null;
  amount: number;
  note: string | null;
}

export interface CeAlert {
  type: string;
  message: string;
  count: number;
}

export interface CeEmployeeResult {
  market: string;
  ntid: string;
  employeeName: string | null;
  eligible: string | null;
  retention95: number | null;
  gross: number;
  final: number;
  totalBox: number;
  groups: Record<string, number>;
  components: Record<string, number>;
  bases: Record<string, number>;
  counts: Record<string, number>;
}

export interface CeRunSummary {
  runId: number;
  createdAt: string;
  createdBy: string | null;
  tillDate: string | null;
  dataTill: string | null;
  employees: number;
  totalFinal: number;
}

export interface CeRunResult {
  runId: number;
  planId: number;
  createdAt: string;
  createdBy: string | null;
  tillDate: string | null;
  dataTill: string | null;
  adrLines: number;
  sdrLines: number;
  durationMs: number;
  alerts: CeAlert[];
  groups: string[];
  categories: string[];
  employees: CeEmployeeResult[];
}

export class CommissionEngineService {
  async getPlans(): Promise<CePlanSummary[]> {
    const res = await http.get<CePlanSummary[]>(COMMISSION_ENGINE_API_PATHS.getPlans);
    return res.data ?? [];
  }

  async getPlan(planId: number): Promise<CePlan> {
    const res = await http.get<CePlan>(COMMISSION_ENGINE_API_PATHS.getPlan(planId));
    return res.data;
  }

  async createPlan(year: number, month: number, copyFromPlanId: number | null): Promise<CePlan> {
    const res = await http.post<CePlan>(COMMISSION_ENGINE_API_PATHS.createPlan, {
      year,
      month,
      copyFromPlanId,
    });
    return res.data;
  }

  async saveSettings(planId: number, settings: CeSettings): Promise<void> {
    await http.put<boolean>(COMMISSION_ENGINE_API_PATHS.saveSettings(planId), settings);
  }

  async saveRules(planId: number, rules: CeRule[]): Promise<void> {
    await http.put<boolean>(COMMISSION_ENGINE_API_PATHS.saveRules(planId), rules);
  }

  async saveComponents(planId: number, components: CeComponent[]): Promise<void> {
    await http.put<boolean>(COMMISSION_ENGINE_API_PATHS.saveComponents(planId), components);
  }

  async getSourceFields(source: string): Promise<CeField[]> {
    const res = await http.get<CeField[]>(COMMISSION_ENGINE_API_PATHS.getSourceFields, { source });
    return res.data ?? [];
  }

  async getFieldValues(source: string, field: string): Promise<CeFieldValue[]> {
    const res = await http.get<CeFieldValue[]>(COMMISSION_ENGINE_API_PATHS.getFieldValues, {
      source,
      field,
    });
    return res.data ?? [];
  }

  async getMetrics(planId: number): Promise<CeMetricSummary[]> {
    const res = await http.get<CeMetricSummary[]>(COMMISSION_ENGINE_API_PATHS.getMetrics(planId));
    return res.data ?? [];
  }

  async uploadMetric(planId: number, metricCode: string, file: File): Promise<string> {
    return this.upload(COMMISSION_ENGINE_API_PATHS.uploadMetric(planId, metricCode), file);
  }

  async importMetricsFromRaw(planId: number): Promise<string> {
    const res = await http.post<number>(COMMISSION_ENGINE_API_PATHS.importMetricsFromRaw(planId));
    return res.message;
  }

  async getAdjustments(planId: number): Promise<CeAdjustment[]> {
    const res = await http.get<CeAdjustment[]>(COMMISSION_ENGINE_API_PATHS.getAdjustments(planId));
    return res.data ?? [];
  }

  async uploadAdjustments(planId: number, typeCode: string, file: File): Promise<string> {
    return this.upload(COMMISSION_ENGINE_API_PATHS.uploadAdjustments(planId, typeCode), file);
  }

  async deleteAdjustment(planId: number, adjustmentId: number): Promise<void> {
    await http.delete<boolean>(COMMISSION_ENGINE_API_PATHS.deleteAdjustment(planId, adjustmentId));
  }

  async run(planId: number, tillDate: string | null): Promise<CeRunResult> {
    const res = await http.post<CeRunResult>(COMMISSION_ENGINE_API_PATHS.run(planId, tillDate));
    return res.data;
  }

  async getRuns(planId: number): Promise<CeRunSummary[]> {
    const res = await http.get<CeRunSummary[]>(COMMISSION_ENGINE_API_PATHS.getRuns(planId));
    return res.data ?? [];
  }

  async getRun(runId: number): Promise<CeRunResult> {
    const res = await http.get<CeRunResult>(COMMISSION_ENGINE_API_PATHS.getRun(runId));
    return res.data;
  }

  async getLatestRun(planId: number): Promise<CeRunResult | null> {
    const res = await http.get<CeRunResult | null>(COMMISSION_ENGINE_API_PATHS.getLatestRun(planId));
    return res.data ?? null;
  }

  private async upload(path: string, file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);

    const headers: Record<string, string> = {};
    const token = http.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["token"] = token;
    }

    const res = await fetch(`${http.baseUrl}${path}`, { method: "POST", headers, body: form });
    let json: ApiEnvelope<number>;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Network error (${res.status})`);
    }
    if (!res.ok || !json.success) throw new Error(json?.message || `Upload failed (${res.status})`);
    return json.message;
  }
}

export const commissionEngineService = new CommissionEngineService();
