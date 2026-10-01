import type { FilterOptionSet, Filters } from "../types";
import { getToken } from "@/lib/api/client";

export const profitabilityCategories = [
  "Activation",
  "Commission ChargeBack",
  "Feature",
  "MIM",
  "Performance Bonus",
  "Retention",
  "SPIFF",
  "Upgrade",
] as const;

export type ProfitabilityRow = {
  code: string;
  name: string;
  market: string;
  postedDate: string;
  transactionDate: string;
  transactionType: string;
  dispute: string;
  values: number[];
};

export type ProfitabilityMonth = { month: string; values: number[] };

export type ProfitabilityResult = {
  rows: ProfitabilityRow[];
  monthly: ProfitabilityMonth[];
  categories?: string[];
};
export type ProfitabilityKpi = { total: number; transactions: number };

const paths = {
  kpi: "Reporting/Profitability/GetKpi",
  matrix: "Reporting/Profitability/GetStoreWiseMatrix",
  headers: "Reporting/Profitability/GetHeaders",
  monthly: "Reporting/Profitability/GetMonthlyDistribution",
  filters: "Reporting/Profitability/GetFilterValues",
  export: "Reporting/Profitability/GetExport",
};
const base = (
  import.meta.env.VITE_REPORTING_URL ??
  import.meta.env.VITE_REPORTING_API_BASE_URL ??
  ""
)
  .trim()
  .replace(/\/$/, "");
type RecordValue = Record<string, unknown>;
const key = (v: string) => v.replace(/\s|_|-/g, "").toLowerCase();
const pick = (r: RecordValue, names: string[]) =>
  Object.entries(r).find(([k]) => names.some((n) => key(n) === key(k)))?.[1];
const num = (v: unknown) => {
  const n = Number(String(v ?? 0).replace(/[$,% ,]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
function payload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const r = raw as RecordValue;
  return r.data ?? r.result ?? r.items ?? raw;
}
const list = (raw: unknown): unknown[] => {
  const value = payload(raw);
  if (Array.isArray(value)) return value.flatMap((v) => (Array.isArray(v) ? v : [v]));
  if (value && typeof value === "object") {
    const nested = Object.values(value as RecordValue).find(Array.isArray);
    return nested ?? [value];
  }
  return [];
};
function monthlyItems(raw: unknown): RecordValue[] {
  const value = payload(raw);
  const items = list(value);
  if (
    items.length &&
    !(
      items.length === 1 &&
      items[0] === value &&
      value &&
      typeof value === "object" &&
      !pick(value as RecordValue, ["month", "date", "label", "period"])
    )
  )
    return items as RecordValue[];
  if (value && typeof value === "object") {
    return Object.entries(value as RecordValue).map(([month, data]) => ({
      month,
      ...(data && typeof data === "object" ? (data as RecordValue) : { value: data }),
    }));
  }
  return [];
}
function query(filters: Filters) {
  const q = new URLSearchParams();
  if (filters.postedStart) q.set("PostedDateFrom", filters.postedStart);
  if (filters.postedEnd) q.set("PostedDateTo", filters.postedEnd);
  if (filters.transactionStart) q.set("TransactionDateFrom", filters.transactionStart);
  if (filters.transactionEnd) q.set("TransactionDateTo", filters.transactionEnd);
  if (filters.transactionType !== "All") q.append("TransactionTypes", filters.transactionType);
  if (filters.compType !== "All") q.append("Profitabilities", filters.compType);
  if (filters.dispute !== "All") q.append("Disputes", filters.dispute);
  filters.markets.forEach((v) => q.append("Markets", v));
  filters.stores.forEach((v) => q.append("Stores", v));
  return q;
}
async function get(path: string, filters: Filters, options: RequestOptions = {}) {
  ensureNotAborted(options.signal);
  const queryString = query(filters).toString();
  const url = `${base ? `${base}/` : "/api/reporting/"}${path}${queryString ? `?${queryString}` : ""}`;
  const token = typeof window !== "undefined" ? getToken() : null;
  const response = await fetch(url, {
    cache: "no-store",
    credentials: base ? "omit" : "include",
    headers: token ? { Authorization: `Bearer ${token}`, token } : undefined,
    signal: options.signal,
  });
  if (!response.ok) throw new Error(`Profitability endpoint failed: ${response.status}`);
  return response.json();
}

type RequestOptions = { signal?: AbortSignal };

function ensureNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
}

export async function getProfitabilityFilterValues(
  options: RequestOptions = {},
): Promise<FilterOptionSet> {
  ensureNotAborted(options.signal);
  const raw = await get(
    paths.filters,
    {
      postedStart: "",
      postedEnd: "",
      transactionStart: "",
      transactionEnd: "",
      programName: "All",
      transactionType: "All",
      compType: "All",
      dispute: "All",
      markets: [],
      stores: [],
    },
    options,
  );
  const r = (payload(raw) ?? {}) as RecordValue;
  const values = (names: string[]) => list(pick(r, names)).map(String).filter(Boolean);
  const markets = values(["markets", "market"]);
  const stores = values(["storeNames", "stores", "store"]);
  return {
    markets,
    storesByMarket: Object.fromEntries(markets.map((market) => [market, stores])),
    programs: values(["programs", "program"]),
    transactionTypes: values(["transactionTypes", "transactionType"]),
    compTypes: values(["profitabilities", "profitability", "compTypes", "compType"]),
    disputes: values(["disputes", "dispute"]),
  };
}

export async function getProfitabilityReport(
  filters: Filters,
  options: RequestOptions = {},
): Promise<ProfitabilityResult> {
  ensureNotAborted(options.signal);
  const [matrixRaw, headersRaw, monthlyRaw] = await Promise.all([
    get(paths.matrix, filters, options),
    get(paths.headers, filters, options),
    get(paths.monthly, filters, options),
  ]);
  const headerItems = list(headersRaw) as RecordValue[];
  const headers = headerItems.some((item) => pick(item, ["profitability"]) !== undefined)
    ? Array.from(
        new Set(headerItems.map((item) => String(pick(item, ["profitability"]))).filter(Boolean)),
      )
    : headerItems
        .map((item) =>
          typeof item === "string"
            ? item
            : String(
                pick(item, [
                  "name",
                  "header",
                  "headerName",
                  "label",
                  "category",
                  "column",
                  "profitabilityName",
                ]) ?? "",
              ),
        )
        .filter(Boolean);
  const categories = headers.length ? headers : [...profitabilityCategories];
  const matrixItems = list(matrixRaw) as RecordValue[];
  const isLongForm = matrixItems.some(
    (item) => pick(item, ["profitability"]) !== undefined && pick(item, ["amount"]) !== undefined,
  );
  const rows = isLongForm
    ? Array.from(
        new Map(
          matrixItems.map((item) => [String(pick(item, ["store", "storeName"])), item]),
        ).keys(),
      ).map((store, index) => {
        const storeItems = matrixItems.filter(
          (item) => String(pick(item, ["store", "storeName"])) === store,
        );
        return {
          code: store.split(" - ")[0] || String(index + 1),
          name: store,
          market: "",
          postedDate: "",
          transactionDate: "",
          transactionType: "",
          dispute: "",
          values: categories.map((category) =>
            storeItems
              .filter((item) => String(pick(item, ["profitability"])) === category)
              .reduce((sum, item) => sum + num(pick(item, ["amount"])), 0),
          ),
        };
      })
    : matrixItems.map((r, index) => {
        const values = categories.map((category) =>
          num(pick(r, [category, `${category}Amount`, `${category}Value`])),
        );
        return {
          code: String(pick(r, ["code", "doorCode", "storeCode"]) ?? index + 1),
          name: String(pick(r, ["name", "store", "storeName", "storeNameDisplay"]) ?? ""),
          market: String(pick(r, ["market", "marketName"]) ?? ""),
          postedDate: "",
          transactionDate: "",
          transactionType: "",
          dispute: "",
          values,
        };
      });
  const monthlySource = monthlyItems(monthlyRaw);
  const monthly = monthlySource.some(
    (item) => pick(item, ["profitability"]) !== undefined && pick(item, ["amount"]) !== undefined,
  )
    ? Array.from(
        new Set(
          monthlySource.map((item) => String(pick(item, ["pdMonth", "month", "date", "period"]))),
        ),
      )
        .sort((a, b) => Date.parse(a) - Date.parse(b))
        .map((month) => ({
          month: month.slice(0, 7),
          values: categories.map((category) =>
            monthlySource
              .filter(
                (item) =>
                  String(pick(item, ["pdMonth", "month", "date", "period"])) === month &&
                  String(pick(item, ["profitability"])) === category,
              )
              .reduce((sum, item) => sum + num(pick(item, ["amount"])), 0),
          ),
        }))
    : monthlySource.map((item, index) => {
        const r = item as RecordValue;
        return {
          month: String(pick(r, ["month", "date", "label", "period"]) ?? index + 1),
          values: categories.map((category) => num(pick(r, [category]))),
        };
      });
  return { rows, monthly, categories };
}

export async function getProfitabilityKpi(
  filters: Filters,
  options: RequestOptions = {},
): Promise<ProfitabilityKpi> {
  const raw = await get(paths.kpi, filters, options);
  const r = (payload(raw) ?? {}) as RecordValue;
  return {
    total: num(pick(r, ["pdAmount", "total", "totalAmount", "profitability", "amount"])),
    transactions: num(pick(r, ["transactions", "transactionCount", "count", "pdTransactions"])),
  };
}

export function getProfitabilityExportUrl(filters: Filters) {
  return `${base ? `${base}/` : "/api/reporting/"}${paths.export}?${query(filters)}`;
}
