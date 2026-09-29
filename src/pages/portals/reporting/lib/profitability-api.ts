import type { FilterOptionSet, Filters } from "../types";

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
};

type RequestOptions = { signal?: AbortSignal };

function ensureNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
}

export async function getProfitabilityFilterValues(
  options: RequestOptions = {},
): Promise<FilterOptionSet> {
  ensureNotAborted(options.signal);
  return {
    markets: [],
    storesByMarket: {},
    programs: [],
    transactionTypes: [],
    compTypes: [],
    disputes: [],
  };
}

export async function getProfitabilityReport(
  filters: Filters,
  options: RequestOptions = {},
): Promise<ProfitabilityResult> {
  ensureNotAborted(options.signal);
  return { rows: [], monthly: [] };
}
