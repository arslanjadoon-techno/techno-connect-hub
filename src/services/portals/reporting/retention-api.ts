import type { Filters } from "../../../pages/portals/reporting/types";
import { getToken } from "@/lib/api/client";

const paths = {
  kpi: "Reporting/RetentionActivation/GetKpi",
  marketWise: "Reporting/RetentionActivation/GetMarketWise",
  storeWise: "Reporting/RetentionActivation/GetStoreWise",
  employeeWise: "Reporting/RetentionActivation/GetEmployeeWise",
  trend: "Reporting/RetentionActivation/GetTrend",
  export: "Reporting/RetentionActivation/GetExport",
};
const REQUEST_TIMEOUT_MS = 30_000;
const API_BASE_URL = (
  import.meta.env.VITE_REPORTING_URL ??
  import.meta.env.VITE_REPORTING_API_BASE_URL ??
  ""
)
  .trim()
  .replace(/\/$/, "");
export function clearRetentionResponseCache() {
  // Kept for callers that reset report state; responses are not cached here.
}

type RequestOptions = { signal?: AbortSignal };
export type RetentionKpi = {
  activationCumulative: number;
  retentionCumulative: number;
};
export type RetentionTrendDatum = {
  qualificationDay: number;
  activationAmount: number;
  retentionAmount: number;
};
export type RetentionTableRow = {
  label: string;
  activationAmount: number;
  byQualificationDay: Record<string, number>;
};
export type RetentionReport = {
  kpis: RetentionKpi;
  marketWise: RetentionTableRow[];
  storeWise: RetentionTableRow[];
  employeeWise: RetentionTableRow[];
  trend: RetentionTrendDatum[];
};

function params(filters: Filters) {
  const query = new URLSearchParams();
  if (filters.postedStart) query.set("PostedDateFrom", filters.postedStart);
  if (filters.postedEnd) query.set("PostedDateTo", filters.postedEnd);
  if (filters.transactionStart) query.set("TransactionDateFrom", filters.transactionStart);
  if (filters.transactionEnd) query.set("TransactionDateTo", filters.transactionEnd);
  filters.markets.forEach((market) => query.append("Markets", market));
  filters.stores.forEach((store) => query.append("Stores", store));
  return query;
}

async function getJson(path: string, filters: Filters, options?: RequestOptions) {
  const requestUrl = `${API_BASE_URL ? `${API_BASE_URL}/` : "/api/reporting/"}${path}?${params(filters)}`;
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const token = typeof window !== "undefined" ? getToken() : null;
  const response = await fetch(requestUrl, {
    cache: "no-store",
    credentials: API_BASE_URL ? "omit" : "include",
    headers: token ? { Authorization: `Bearer ${token}`, token } : undefined,
    signal,
  });
  if (!response.ok) throw new Error(`Retention endpoint failed: ${response.status}`);
  return response.json();
}

function key(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}
function value(record: Record<string, unknown>, names: string[]) {
  const found = Object.entries(record).find(([name]) =>
    names.some((candidate) => key(candidate) === key(name)),
  );
  return found?.[1];
}
function number(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[$,% ,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function array(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => (Array.isArray(item) ? item : [item]));
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const nested = Object.values(record).find(Array.isArray);
    return nested ? nested.flatMap((item) => (Array.isArray(item) ? item : [item])) : [record];
  }
  return [];
}
function tableRows(raw: unknown, labels: string[], nullLabel?: string): RetentionTableRow[] {
  const grouped = new Map<string, RetentionTableRow>();
  array(raw).forEach((item, index) => {
    const record = (item ?? {}) as Record<string, unknown>;
    const rawLabel = value(record, labels);
    const hasLabelField = labels.some((candidate) =>
      Object.keys(record).some((name) => key(name) === key(candidate)),
    );
    if (
      hasLabelField &&
      (rawLabel === undefined || rawLabel === null || String(rawLabel).trim() === "")
    ) {
      if (!nullLabel) return;
    }
    const label = String(rawLabel ?? nullLabel ?? `Item ${index + 1}`);
    const existing = grouped.get(label) ?? {
      label,
      activationAmount: 0,
      byQualificationDay: {},
    };
    const activationAmount = number(
      value(record, ["ActivationAmount", "Activation Amount", "Activation"]),
    );
    const qualificationDay = value(record, ["QualificationDay", "Qualification Day", "Day"]);
    const retentionAmount = number(
      value(record, ["RetentionAmount", "Retention Amount", "Retention", "Amount", "Value"]),
    );
    const matrixColumn = value(record, ["MatrixColumn", "Matrix Column"]);
    const matrixAmount = number(value(record, ["Amount", "Value"]));
    const byQualificationDay = { ...existing.byQualificationDay };

    let nextActivationAmount = existing.activationAmount;
    if (matrixColumn !== undefined && String(matrixColumn).trim().toLowerCase() === "activation") {
      nextActivationAmount += matrixAmount;
    } else if (matrixColumn !== undefined && /^\d+$/.test(String(matrixColumn))) {
      const day = String(matrixColumn);
      byQualificationDay[day] = (byQualificationDay[day] ?? 0) + matrixAmount;
    } else if (qualificationDay !== undefined) {
      const day = String(number(qualificationDay));
      byQualificationDay[day] = (byQualificationDay[day] ?? 0) + retentionAmount;
    } else {
      nextActivationAmount += activationAmount;
    }

    Object.entries(record).forEach(([name, rawValue]) => {
      if (/^\d+$/.test(name)) {
        byQualificationDay[name] = (byQualificationDay[name] ?? 0) + number(rawValue);
      }
    });

    grouped.set(label, {
      label,
      activationAmount: nextActivationAmount,
      byQualificationDay,
    });
  });
  return Array.from(grouped.values());
}
function trend(raw: unknown): RetentionTrendDatum[] {
  return array(raw)
    .map((item) => {
      const record = (item ?? {}) as Record<string, unknown>;
      return {
        qualificationDay: number(value(record, ["QualificationDay", "Qualification Day", "Day"])),
        activationAmount: number(value(record, ["ActivationAmount", "Activation Amount"])),
        retentionAmount: number(value(record, ["RetentionAmount", "Retention Amount"])),
      };
    })
    .filter((item) => item.qualificationDay > 0);
}
function kpis(raw: unknown): RetentionKpi {
  const record = ((Array.isArray(raw) ? raw[0] : raw) ?? {}) as Record<string, unknown>;
  const numericEntries = Object.entries(record).filter(
    ([, rawValue]) =>
      typeof rawValue === "number" ||
      (typeof rawValue === "string" && rawValue.trim() !== "" && Number.isFinite(Number(rawValue))),
  );
  const findAmount = (pattern: RegExp) => {
    const entry = numericEntries.find(([label]) => pattern.test(label));
    return entry ? number(entry[1]) : 0;
  };
  const activationParts = numericEntries
    .filter(
      ([label]) => /activation|hsi|feature/i.test(label) && !/retention|retension/i.test(label),
    )
    .reduce((sum, [, rawValue]) => sum + number(rawValue), 0);
  return {
    activationCumulative:
      findAmount(/activation.*hsi.*feature|cumulative.*activation/i) || activationParts,
    retentionCumulative:
      findAmount(/retention.*cumulative|cumulative.*retention|retension.*total.*activation/i) ||
      findAmount(/^retention|^retension/i),
  };
}

export async function getRetentionReport(
  filters: Filters,
  options?: RequestOptions,
): Promise<RetentionReport> {
  const [kpiRaw, marketRaw, storeRaw, employeeRaw, trendRaw] = await Promise.all([
    getJson(paths.kpi, filters, options),
    getJson(paths.marketWise, filters, options),
    getJson(paths.storeWise, filters, options),
    getJson(paths.employeeWise, filters, options),
    getJson(paths.trend, filters, options),
  ]);
  return {
    kpis: kpis(kpiRaw),
    marketWise: tableRows(marketRaw, ["Market", "MarketName", "Name"]),
    storeWise: tableRows(storeRaw, ["Store", "StoreName", "Store Name", "Name"]),
    employeeWise: tableRows(employeeRaw, ["Employee", "EmployeeName", "Name"], "---"),
    trend: trend(trendRaw),
  };
}

export async function getRetentionKpi(filters: Filters, options?: RequestOptions) {
  return kpis(await getJson(paths.kpi, filters, options));
}
export async function getRetentionMarketWise(filters: Filters, options?: RequestOptions) {
  return tableRows(await getJson(paths.marketWise, filters, options), [
    "Market",
    "MarketName",
    "Name",
  ]);
}
export async function getRetentionStoreWise(filters: Filters, options?: RequestOptions) {
  return tableRows(await getJson(paths.storeWise, filters, options), [
    "Store",
    "StoreName",
    "Store Name",
    "Name",
  ]);
}
export async function getRetentionEmployeeWise(filters: Filters, options?: RequestOptions) {
  return tableRows(
    await getJson(paths.employeeWise, filters, options),
    ["Employee", "EmployeeName", "Name"],
    "---",
  );
}
export async function getRetentionTrend(filters: Filters, options?: RequestOptions) {
  return trend(await getJson(paths.trend, filters, options));
}
export function getRetentionExportUrl(filters: Filters) {
  return `/api/reporting/${paths.export}?${params(filters)}`;
}
