import type {
  BarDatum,
  Filters,
  KpiSummary,
  SummaryDatum,
  TransactionRow,
  TrendDatum,
} from "../types";
import { getToken } from "@/lib/api/client";

export function getLastTenDays() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 9);
  const toDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return { postedStart: toDate(start), postedEnd: toDate(end) };
}

export async function downloadFile(url: string, fallbackName: string) {
  const token = typeof window !== "undefined" ? getToken() : null;
  const isCrossOrigin = /^https?:\/\//i.test(url) && !url.startsWith(window.location.origin);
  const response = await fetch(url, {
    credentials: isCrossOrigin ? "omit" : "include",
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}`, token } : undefined,
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^;"]+)/i);
  const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : fallbackName;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatShortDate(dateValue: string) {
  if (!dateValue) return "All dates";
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateValue
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(date);
}

export function formatLongDate(dateValue: string) {
  if (!dateValue) {
    return "";
  }

  const normalizedDate = dateValue.includes("T") ? dateValue : `${dateValue}T00:00:00`;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(normalizedDate));
}

export function formatMonth(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

export function filterRows(rows: TransactionRow[], filters: Filters) {
  return rows.filter((row) => {
    const marketMatch = filters.markets.length === 0 || filters.markets.includes(row.market);
    const storeMatch = filters.stores.length === 0 || filters.stores.includes(row.storeName);
    const postedMatch =
      row.postedDate >= filters.postedStart && row.postedDate <= filters.postedEnd;
    const transactionMatch =
      row.transactionDate >= filters.transactionStart &&
      row.transactionDate <= filters.transactionEnd;
    const programMatch = filters.programName === "All" || row.programName === filters.programName;
    const transactionTypeMatch =
      filters.transactionType === "All" || row.transactionType === filters.transactionType;
    const compTypeMatch = filters.compType === "All" || row.compType === filters.compType;
    const disputeMatch = filters.dispute === "All" || row.dispute === filters.dispute;

    return (
      marketMatch &&
      storeMatch &&
      postedMatch &&
      transactionMatch &&
      programMatch &&
      transactionTypeMatch &&
      compTypeMatch &&
      disputeMatch
    );
  });
}

export function totalAmount(rows: TransactionRow[]) {
  return rows.reduce((total, row) => total + row.amount, 0);
}

export function totalTransactions(rows: TransactionRow[]) {
  return rows.length;
}

export function groupRows(
  rows: TransactionRow[],
  getLabel: (row: TransactionRow) => string,
  limit: number,
): BarDatum[] {
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    const label = getLabel(row);
    totals.set(label, (totals.get(label) ?? 0) + row.amount);
  });

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function summarizeRows(
  rows: TransactionRow[],
  getLabel: (row: TransactionRow) => string,
  limit: number,
): SummaryDatum[] {
  const totals = new Map<string, { amount: number; transactions: number }>();

  rows.forEach((row) => {
    const label = getLabel(row);
    const existing = totals.get(label) ?? { amount: 0, transactions: 0 };
    totals.set(label, {
      amount: existing.amount + row.amount,
      transactions: existing.transactions + 1,
    });
  });

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, ...value }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function groupRowsByMonth(rows: TransactionRow[]) {
  const totals = new Map<string, { label: string; value: number; sort: string }>();

  rows.forEach((row) => {
    const key = row.postedDate.slice(0, 7);
    const existing = totals.get(key);
    totals.set(key, {
      label: existing?.label ?? formatMonth(`${key}-01`),
      value: (existing?.value ?? 0) + row.amount,
      sort: key,
    });
  });

  return Array.from(totals.values())
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map(({ label, value }) => ({ label, value }));
}

export function summarizeRowsByPostedDate(rows: TransactionRow[]): TrendDatum[] {
  const totals = new Map<string, { amount: number; transactions: number }>();

  rows.forEach((row) => {
    const existing = totals.get(row.postedDate) ?? {
      amount: 0,
      transactions: 0,
    };
    totals.set(row.postedDate, {
      amount: existing.amount + row.amount,
      transactions: existing.transactions + 1,
    });
  });

  return Array.from(totals.entries())
    .map(([postedDate, value]) => ({ postedDate, ...value }))
    .sort((a, b) => a.postedDate.localeCompare(b.postedDate));
}

export function summarizeKpi(rows: TransactionRow[]): KpiSummary {
  return {
    pdAmount: totalAmount(rows),
    pdTransactions: totalTransactions(rows),
  };
}
