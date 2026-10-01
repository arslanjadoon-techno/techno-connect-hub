import type {
  DetailResult,
  FilterOptionSet,
  Filters,
  KpiSummary,
  MatrixDatum,
  SummaryDatum,
  TransactionRow,
  TrendDatum,
} from "../../../pages/portals/reporting/types";
import { getToken } from "@/lib/api/client";

const API_BASE_URL = (
  import.meta.env.VITE_REPORTING_API_BASE_URL ??
  import.meta.env.VITE_REPORTING_URL ??
  import.meta.env.VITE_API_LOCAL_URL ??
  ""
)
  .trim()
  .replace(/\/$/, "");
const CLIENT_API_BASE_URL = "/api/reporting/";
const REQUEST_TIMEOUT_MS = 30_000;
export function clearReportResponseCache() {
  // Kept for callers that reset report state; responses are not cached here.
}

type RequestOptions = {
  signal?: AbortSignal;
};

type DetailRequestOptions = RequestOptions & {
  pageNumber: number;
  pageSize: number;
};

type ReportParam = string | number | string[] | undefined;

const endpoints = {
  kpi: "/Reporting/GetKpi",
  storeWiseKpi: "/Reporting/StoreWisePD/GetKpi",
  storeWiseMatrix: "/Reporting/StoreWisePD/GetMatrix",
  storeWiseDoorCode: "/Reporting/StoreWisePD/GetDoorCodeWise",
  storeWiseTransactionType: "/Reporting/StoreWisePD/GetTransactionTypeWise",
  storeWiseMonthlyTrend: "/Reporting/StoreWisePD/GetMonthlyTrend",
  storeWiseExport: "/Reporting/StoreWisePD/GetExport",
  marketWise: "/Reporting/GetMarketWise",
  storeWise: "/Reporting/GetStoreWise",
  trend: "/Reporting/GetTrend",
  detail: "/Reporting/GetDetail",
  export: "/Reporting/GetExport",
  filterValues: "/Reporting/GetFilterValues",
  storeWiseFilterValues: "/Reporting/StoreWisePD/GetFilterValues",
};

function getValue(record: Record<string, unknown>, ...keys: string[]) {
  function normalizeKey(key: string) {
    return key.replace(/\s+/g, "").toLowerCase();
  }

  const lookup = new Map(Object.entries(record).map(([key, value]) => [normalizeKey(key), value]));

  for (const key of keys) {
    const value = lookup.get(normalizeKey(key));
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toStringValue(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function optionalArray(value: string[]) {
  const values = value.filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function optionalSingleAsArray(value: string) {
  return value && value !== "All" ? [value] : undefined;
}

export function buildReportParams(filters: Filters) {
  return {
    PostedDateFrom: filters.postedStart,
    PostedDateTo: filters.postedEnd,
    TransactionDateFrom: filters.transactionStart || undefined,
    TransactionDateTo: filters.transactionEnd || undefined,
    Markets: optionalArray(filters.markets),
    Stores: optionalArray(filters.stores),
    Programs: optionalSingleAsArray(filters.programName),
    TransactionTypes: optionalSingleAsArray(filters.transactionType),
    CompTypes: optionalSingleAsArray(filters.compType),
    Disputes: optionalSingleAsArray(filters.dispute),
  };
}

function buildUrl(path: string, params: Record<string, ReportParam>) {
  const baseUrl = API_BASE_URL || `${window.location.origin}${CLIENT_API_BASE_URL}`;
  const url = new URL(path.replace(/^\//, ""), baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
    } else if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`;
}

async function getJson<T>(
  path: string,
  params: Record<string, ReportParam>,
  options: RequestOptions = {},
) {
  const requestUrl = buildUrl(path, params);
  const token = typeof window !== "undefined" ? getToken() : null;
  const response = await fetch(requestUrl, {
    method: "GET",
    cache: "no-store",
    credentials: API_BASE_URL ? "omit" : "include",
    headers: token ? { Authorization: `Bearer ${token}`, token } : undefined,
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
      : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message || `Report API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const firstArray = Object.values(record).find(Array.isArray);
    return Array.isArray(firstArray) ? firstArray : [record];
  }

  return [];
}

export function normalizeKpi(raw: unknown): KpiSummary {
  const record = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>;

  return {
    pdAmount: toNumber(getValue(record, "PDAmount", "pdAmount", "Amount")),
    pdTransactions: toNumber(getValue(record, "PDTransactions", "pdTransactions", "Transactions")),
  };
}

export function normalizeMatrix(raw: unknown): MatrixDatum[] {
  return asArray(raw).map((item) => {
    const record = item as Record<string, unknown>;

    return {
      transactionType:
        toStringValue(getValue(record, "TransactionType", "transactionType")).trim() ||
        "Unassigned",
      store: toStringValue(getValue(record, "Store", "store")).trim() || "Unassigned",
      amount: toNumber(getValue(record, "Amount", "amount")),
    };
  });
}

function normalizeSummary(raw: unknown, labelKeys: string[]): SummaryDatum[] {
  const grouped = asArray(raw).reduce<Map<string, SummaryDatum>>((items, item) => {
    const record = item as Record<string, unknown>;
    const label = toStringValue(getValue(record, ...labelKeys)).trim() || "Unassigned";
    const current = items.get(label) ?? {
      label,
      amount: 0,
      transactions: 0,
    };

    items.set(label, {
      label,
      amount: current.amount + toNumber(getValue(record, "Amount", "amount")),
      transactions:
        current.transactions +
        toNumber(getValue(record, "Transactions", "transactions", "TransactionCount")),
    });

    return items;
  }, new Map());

  return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount);
}

export function normalizeTrend(raw: unknown): TrendDatum[] {
  return asArray(raw).map((item) => {
    const record = item as Record<string, unknown>;

    return {
      postedDate: toStringValue(
        getValue(record, "PostedDate", "postedDate", "Posted Date", "reportDate"),
      ),
      amount: toNumber(getValue(record, "Amount", "amount")),
      transactions: toNumber(getValue(record, "Transactions", "transactions", "TransactionCount")),
    };
  });
}

export function normalizeDetail(raw: unknown): DetailResult {
  if (Array.isArray(raw) && Array.isArray(raw[1])) {
    const totalRecord = (Array.isArray(raw[0]) ? raw[0][0] : raw[0]) as Record<string, unknown>;

    return {
      totalRows: toNumber(getValue(totalRecord, "TotalRows", "totalRows")),
      rows: normalizeRows(raw[1]),
    };
  }

  if (Array.isArray(raw)) {
    return {
      totalRows: raw.length,
      rows: normalizeRows(raw),
    };
  }

  const record = raw as Record<string, unknown>;
  return {
    totalRows: toNumber(getValue(record, "TotalRows", "totalRows", "Count")),
    rows: normalizeRows(
      getValue(record, "Rows", "rows", "Data", "data", "ResultSet2", "value") ?? [],
    ),
  };
}

export function normalizeRows(raw: unknown): TransactionRow[] {
  return asArray(raw).map((item, index) => {
    const record = item as Record<string, unknown>;

    return {
      id: toNumber(getValue(record, "Id", "id")) || index + 1,
      market: toStringValue(getValue(record, "Market", "market")),
      doorCode: toStringValue(getValue(record, "DoorCode", "doorCode", "Door Code")),
      storeName: toStringValue(getValue(record, "StoreName", "storeName", "Store Name")),
      postedDate: toStringValue(getValue(record, "PostedDate", "postedDate", "Posted Date")),
      transactionDate: toStringValue(
        getValue(record, "TransactionDate", "transactionDate", "Transaction Date"),
      ),
      programName: toStringValue(
        getValue(record, "ProgramName", "programName", "Program", "Program Name"),
      ),
      transactionType: toStringValue(
        getValue(record, "TransactionType", "transactionType", "Transaction Type"),
      ),
      compType: toStringValue(getValue(record, "CompType", "compType", "CompensationType")),
      dispute: toStringValue(getValue(record, "Dispute", "dispute", "DisputeType")),
      amount: toNumber(getValue(record, "Amount", "amount")),
    };
  });
}

export function normalizeFilterValues(raw: unknown): FilterOptionSet {
  if (Array.isArray(raw)) {
    const markets = asStrings(raw[0]);

    return {
      markets,
      storesByMarket: normalizeStoresByMarket(markets, raw[1]),
      programs: asStrings(raw[2]),
      transactionTypes: asStrings(raw[3]),
      compTypes: asStrings(raw[4]),
      disputes: asStrings(raw[5]),
    };
  }

  const record = raw as Record<string, unknown>;
  const markets = asStrings(getValue(record, "Market", "markets", "Markets"));
  const storesRaw = getValue(
    record,
    "storesByMarket",
    "StoresByMarket",
    "StoreByMarket",
    "Store",
    "Stores",
    "stores",
    "StoreNames",
    "storeNames",
  );

  return {
    markets,
    storesByMarket: normalizeStoresByMarket(markets, storesRaw),
    programs: asStrings(getValue(record, "Program", "Programs", "programs", "Program Name")),
    transactionTypes: asStrings(
      getValue(
        record,
        "TransactionType",
        "TransactionTypes",
        "transactionTypes",
        "Transaction Type",
      ),
    ),
    compTypes: asStrings(
      getValue(
        record,
        "CompensationType",
        "CompensationTypes",
        "compTypes",
        "CompType",
        "Comp Type",
      ),
    ),
    disputes: asStrings(getValue(record, "DisputeType", "DisputeTypes", "disputes", "Dispute")),
  };
}

function asStrings(raw: unknown) {
  return asArray(raw)
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return toStringValue(
          getValue(
            record,
            "Name",
            "Value",
            "Market",
            "Store",
            "Store Name",
            "Program",
            "Program Name",
            "TransactionType",
            "Transaction Type",
            "CompensationType",
            "CompType",
            "Comp Type",
            "DisputeType",
            "Dispute",
          ),
        );
      }

      return "";
    })
    .filter(Boolean);
}

function normalizeStoresByMarket(markets: string[], raw: unknown) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    const mappedStores = Object.entries(record).reduce<Record<string, string[]>>(
      (lookup, [market, stores]) => {
        lookup[market] = asStrings(stores);
        return lookup;
      },
      {},
    );

    if (Object.values(mappedStores).some((stores) => stores.length > 0)) {
      return mappedStores;
    }
  }

  const groupedStores = asArray(raw).reduce<Record<string, string[]>>((lookup, item) => {
    if (!item || typeof item !== "object") {
      return lookup;
    }

    const record = item as Record<string, unknown>;
    const market = toStringValue(getValue(record, "Market", "market"));
    const store = toStringValue(getValue(record, "Store", "store", "StoreName", "Store Name"));

    if (market && store) {
      lookup[market] = [...(lookup[market] ?? []), store];
    }

    return lookup;
  }, {});

  if (Object.keys(groupedStores).length > 0) {
    return groupedStores;
  }

  return buildStoreLookup(markets, asStrings(raw));
}

function buildStoreLookup(markets: string[], stores: string[]) {
  return markets.reduce<Record<string, string[]>>((lookup, market) => {
    lookup[market] = stores;
    return lookup;
  }, {});
}

export async function getKpi(filters: Filters, options?: RequestOptions) {
  const raw = await getJson(endpoints.kpi, buildReportParams(filters), options);
  return normalizeKpi(raw);
}

export async function getStoreWiseKpi(filters: Filters, options?: RequestOptions) {
  const raw = await getJson(endpoints.storeWiseKpi, buildReportParams(filters), options);
  return normalizeKpi(raw);
}

export async function getStoreWiseMatrix(filters: Filters, options?: RequestOptions) {
  const raw = await getJson(endpoints.storeWiseMatrix, buildReportParams(filters), options);
  return normalizeMatrix(raw);
}

export async function getStoreWiseDoorCodeWise(filters: Filters, options?: RequestOptions) {
  const raw = await getJson(endpoints.storeWiseDoorCode, buildReportParams(filters), options);
  return normalizeSummary(raw, ["Store", "store", "DoorCode", "doorCode"]);
}

export async function getStoreWiseTransactionTypeWise(filters: Filters, options?: RequestOptions) {
  const raw = await getJson(
    endpoints.storeWiseTransactionType,
    buildReportParams(filters),
    options,
  );
  return normalizeSummary(raw, ["TransactionType", "transactionType"]);
}

export async function getStoreWiseMonthlyTrend(filters: Filters, options?: RequestOptions) {
  const raw = await getJson(endpoints.storeWiseMonthlyTrend, buildReportParams(filters), options);
  return normalizeTrend(raw);
}

export async function getMarketWise(filters: Filters, options?: RequestOptions) {
  const raw = await getJson(endpoints.marketWise, buildReportParams(filters), options);
  return normalizeSummary(raw, ["Market", "market"]);
}

export async function getStoreWise(filters: Filters, options?: RequestOptions) {
  const raw = await getJson(endpoints.storeWise, buildReportParams(filters), options);
  return normalizeSummary(raw, ["StoreName", "storeName", "Store", "store"]);
}

export async function getTrend(filters: Filters, options?: RequestOptions) {
  const raw = await getJson(endpoints.trend, buildReportParams(filters), options);
  return normalizeTrend(raw);
}

export async function getDetail(filters: Filters, options: DetailRequestOptions) {
  const raw = await getJson(
    endpoints.detail,
    {
      ...buildReportParams(filters),
      pageNumber: options.pageNumber,
      pageSize: options.pageSize,
    },
    options,
  );

  const detail = normalizeDetail(raw);

  if (Array.isArray(raw) && !Array.isArray(raw[1])) {
    const loadedRows = (options.pageNumber - 1) * options.pageSize + detail.rows.length;

    return {
      ...detail,
      totalRows: loadedRows,
      hasNextPage: detail.rows.length === options.pageSize,
    };
  }

  const rawValue =
    raw && typeof raw === "object" ? getValue(raw as Record<string, unknown>, "value") : undefined;

  if (Array.isArray(rawValue) && detail.totalRows === detail.rows.length) {
    const loadedRows = (options.pageNumber - 1) * options.pageSize + detail.rows.length;

    return {
      ...detail,
      totalRows: loadedRows,
      hasNextPage: detail.rows.length === options.pageSize,
    };
  }

  return {
    ...detail,
    hasNextPage: options.pageNumber * options.pageSize < detail.totalRows,
  };
}

export async function getFilterValues(options?: RequestOptions) {
  const raw = await getJson(endpoints.filterValues, {}, options);
  return normalizeFilterValues(raw);
}

export async function getStoreWiseFilterValues(options?: RequestOptions) {
  const raw = await getJson(endpoints.storeWiseFilterValues, {}, options);
  return normalizeFilterValues(raw);
}

export function getExportUrl(filters: Filters) {
  return buildUrl(endpoints.export, buildReportParams(filters));
}

export function getStoreWiseExportUrl(filters: Filters) {
  return buildUrl(endpoints.storeWiseExport, buildReportParams(filters));
}

export const reportingApiBaseUrl = API_BASE_URL;
