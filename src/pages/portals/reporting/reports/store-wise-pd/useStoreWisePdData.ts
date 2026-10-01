"use client";

import {
  getStoreWiseDoorCodeWise,
  getStoreWiseKpi,
  getStoreWiseMatrix,
  getStoreWiseMonthlyTrend,
  getStoreWiseTransactionTypeWise,
} from "@/services/portals/reporting/report-api";
import type { Filters, KpiSummary, MatrixDatum, SummaryDatum, TrendDatum } from "../../types";
import { useCallback } from "react";
import { useReportQuery } from "../../../../../components/reporting/dashboard/useReportQuery";
import { useElementVisible } from "../../../../../components/reporting/dashboard/useElementVisible";

const initial: {
  kpi: KpiSummary;
  matrix: MatrixDatum[];
  doorCodes: SummaryDatum[];
  transactionTypes: SummaryDatum[];
  trend: TrendDatum[];
} = {
  kpi: { pdAmount: 0, pdTransactions: 0 },
  matrix: [],
  doorCodes: [],
  transactionTypes: [],
  trend: [],
};

export function useStoreWisePdData(filters: Filters, enabled: boolean) {
  const doorCodesEnabled = useElementVisible("store-door-code-section", enabled);
  const transactionTypesEnabled = useElementVisible("store-transaction-type-section", enabled);
  const trendEnabled = useElementVisible("store-trend-section", enabled);
  const matrixEnabled = useElementVisible("store-matrix-section", enabled);
  const loadKpi = useCallback(
    (signal: AbortSignal) => getStoreWiseKpi(filters, { signal }),
    [filters],
  );
  const loadMatrix = useCallback(
    (signal: AbortSignal) => getStoreWiseMatrix(filters, { signal }),
    [filters],
  );
  const loadDoorCodes = useCallback(
    (signal: AbortSignal) => getStoreWiseDoorCodeWise(filters, { signal }),
    [filters],
  );
  const loadTransactionTypes = useCallback(
    (signal: AbortSignal) => getStoreWiseTransactionTypeWise(filters, { signal }),
    [filters],
  );
  const loadTrend = useCallback(
    (signal: AbortSignal) => getStoreWiseMonthlyTrend(filters, { signal }),
    [filters],
  );
  const kpi = useReportQuery(loadKpi, initial.kpi, "KPI request failed", enabled);
  const matrix = useReportQuery(loadMatrix, initial.matrix, "Matrix request failed", matrixEnabled);
  const doorCodes = useReportQuery(
    loadDoorCodes,
    initial.doorCodes,
    "Door Code request failed",
    doorCodesEnabled,
  );
  const transactionTypes = useReportQuery(
    loadTransactionTypes,
    initial.transactionTypes,
    "Transaction Type request failed",
    transactionTypesEnabled,
  );
  const trend = useReportQuery(loadTrend, initial.trend, "Trend request failed", trendEnabled);
  return {
    kpi: kpi.data,
    matrix: matrix.data,
    doorCodes: doorCodes.data,
    transactionTypes: transactionTypes.data,
    trend: trend.data,
    isKpiLoading: kpi.isLoading,
    isMatrixLoading: matrix.isLoading,
    isDoorCodesLoading: doorCodes.isLoading,
    isTransactionTypesLoading: transactionTypes.isLoading,
    isTrendLoading: trend.isLoading,
    isMatrixDeferred: matrix.isDeferred,
    isDoorCodesDeferred: doorCodes.isDeferred,
    isTransactionTypesDeferred: transactionTypes.isDeferred,
    isTrendDeferred: trend.isDeferred,
    isLoading: [kpi, matrix, doorCodes, transactionTypes, trend].some((query) => query.isLoading),
    status:
      [kpi, matrix, doorCodes, transactionTypes, trend].map((query) => query.error).find(Boolean) ||
      ([kpi, matrix, doorCodes, transactionTypes, trend].some((query) => query.isLoading)
        ? "Loading Store Wise PD report"
        : "Connected to Store Wise PD endpoint"),
  };
}
