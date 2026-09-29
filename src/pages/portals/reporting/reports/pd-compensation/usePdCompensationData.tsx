"use client";

import { useCallback, useRef } from "react";
import {
  getDetail,
  getKpi,
  getMarketWise,
  getStoreWise,
  getTrend,
} from "@/services/portals/reporting/report-api";
import type {
  DetailResult,
  Filters,
  KpiSummary,
  SummaryDatum,
  TrendDatum,
} from "../../types";
import { useReportQuery } from "../../../../../components/reporting/dashboard/useReportQuery";
import { useElementVisible } from "../../../../../components/reporting/dashboard/useElementVisible";

const emptyKpi: KpiSummary = { pdAmount: 0, pdTransactions: 0 };
const emptyDetail: DetailResult = { totalRows: 0, rows: [] };
const emptySummary: SummaryDatum[] = [];
const emptyTrend: TrendDatum[] = [];

export function usePdCompensationData(
  filters: Filters,
  page: number,
  enabled: boolean,
) {
  const cache = useRef(new Map<string, DetailResult>());
  const marketEnabled = useElementVisible("pd-market-section", enabled);
  const storeEnabled = useElementVisible("pd-store-section", enabled);
  const trendEnabled = useElementVisible("pd-trend-section", enabled);
  const detailEnabled = useElementVisible("pd-detail-section", enabled);
  const loadKpi = useCallback(
    (signal: AbortSignal) => getKpi(filters, { signal }),
    [filters],
  );
  const loadMarket = useCallback(
    (signal: AbortSignal) => getMarketWise(filters, { signal }),
    [filters],
  );
  const loadStore = useCallback(
    (signal: AbortSignal) => getStoreWise(filters, { signal }),
    [filters],
  );
  const loadTrend = useCallback(
    (signal: AbortSignal) => getTrend(filters, { signal }),
    [filters],
  );
  const kpi = useReportQuery(loadKpi, emptyKpi, "KPI request failed", enabled);
  const market = useReportQuery(
    loadMarket,
    emptySummary,
    "Market Wise request failed",
    marketEnabled,
  );
  const store = useReportQuery(
    loadStore,
    emptySummary,
    "Store Wise request failed",
    storeEnabled,
  );
  const trend = useReportQuery(
    loadTrend,
    emptyTrend,
    "Trend request failed",
    trendEnabled,
  );
  const loadDetail = useCallback(
    async (signal: AbortSignal) => {
      const key = `${JSON.stringify(filters)}:${page}`;
      const cached = cache.current.get(key);
      if (cached) return cached;
      const detail = await getDetail(filters, {
        pageNumber: page,
        pageSize: 50,
        signal,
      });
      cache.current.set(key, detail);
      return detail;
    },
    [filters, page],
  );
  const detail = useReportQuery(
    loadDetail,
    emptyDetail,
    "PD detail endpoint request failed",
    detailEnabled,
  );
  return {
    kpi: kpi.data ?? emptyKpi,
    marketData: market.data ?? emptySummary,
    storeData: store.data ?? emptySummary,
    trendData: trend.data ?? emptyTrend,
    detail: detail.data ?? emptyDetail,
    isKpiLoading: kpi.isLoading,
    isMarketLoading: market.isLoading,
    isStoreLoading: store.isLoading,
    isTrendLoading: trend.isLoading,
    isDetailLoading: detail.isLoading,
    isSummaryLoading: [kpi, market, store, trend].some(
      (query) => query.isLoading,
    ),
    status:
      [kpi.error, market.error, store.error, trend.error, detail.error].find(
        Boolean,
      ) ||
      ([kpi, market, store, trend, detail].some((query) => query.isLoading)
        ? "Loading reporting data"
        : "Connected to reporting endpoints"),
    clearCache: () => cache.current.clear(),
  };
}
