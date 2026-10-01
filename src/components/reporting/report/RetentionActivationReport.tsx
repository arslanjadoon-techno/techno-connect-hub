"use client";

import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import type { Filters } from "../../../pages/portals/reporting/types";
import {
  getRetentionExportUrl,
  getRetentionEmployeeWise,
  getRetentionKpi,
  getRetentionMarketWise,
  getRetentionStoreWise,
  getRetentionTrend,
  type RetentionKpi,
  type RetentionTableRow,
  type RetentionTrendDatum,
} from "@/services/portals/reporting/retention-api";
import LoadingIndicator from "./LoadingIndicator";
import ReportPanel from "./ReportPanel";
import RetentionTrendChart from "./RetentionTrendChart";
import RetentionBreakdownTable from "./RetentionBreakdownTable";
import { useReportQuery } from "../dashboard/useReportQuery";
import { useElementVisible } from "../dashboard/useElementVisible";
import {
  downloadFile,
  formatCompactNumber,
} from "../../../pages/portals/reporting/lib/report-utils";
import { Button } from "@/components/ui/button";

const emptyKpi: RetentionKpi = {
  activationCumulative: 0,
  retentionCumulative: 0,
};
const emptyRows: RetentionTableRow[] = [];
const emptyTrend: RetentionTrendDatum[] = [];
export default function RetentionActivationReport({ filters }: { filters: Filters }) {
  const marketEnabled = useElementVisible("retention-market-section");
  const storeEnabled = useElementVisible("retention-store-section");
  const employeeEnabled = useElementVisible("retention-employee-section");
  const trendEnabled = useElementVisible("retention-trend-section");
  const loadKpi = useCallback(
    (signal: AbortSignal) => getRetentionKpi(filters, { signal }),
    [filters],
  );
  const loadMarketWise = useCallback(
    (signal: AbortSignal) => getRetentionMarketWise(filters, { signal }),
    [filters],
  );
  const loadStoreWise = useCallback(
    (signal: AbortSignal) => getRetentionStoreWise(filters, { signal }),
    [filters],
  );
  const loadEmployeeWise = useCallback(
    (signal: AbortSignal) => getRetentionEmployeeWise(filters, { signal }),
    [filters],
  );
  const loadTrend = useCallback(
    (signal: AbortSignal) => getRetentionTrend(filters, { signal }),
    [filters],
  );
  const kpi = useReportQuery(loadKpi, emptyKpi, "KPI request failed");
  const marketWise = useReportQuery(
    loadMarketWise,
    emptyRows,
    "Market Wise request failed",
    marketEnabled,
  );
  const storeWise = useReportQuery(
    loadStoreWise,
    emptyRows,
    "Store Wise request failed",
    storeEnabled,
  );
  const employeeWise = useReportQuery(
    loadEmployeeWise,
    emptyRows,
    "Employee Wise request failed",
    employeeEnabled,
  );
  const trend = useReportQuery(loadTrend, emptyTrend, "Trend request failed", trendEnabled);
  const report = {
    kpis: kpi.data,
    marketWise: marketWise.data,
    storeWise: storeWise.data,
    employeeWise: employeeWise.data,
    trend: trend.data,
  };
  const loading = [kpi, marketWise, storeWise, employeeWise, trend].some(
    (query) => query.isLoading,
  );
  const error =
    [kpi, marketWise, storeWise, employeeWise, trend].map((query) => query.error).find(Boolean) ??
    "";
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadFile(getRetentionExportUrl(filters), "retention-activation-report.xlsx");
    } finally {
      setIsExporting(false);
    }
  }
  const compactMoney = formatCompactNumber;
  return (
    <section className="min-w-0 max-w-full flex-1 overflow-hidden rounded-2xl border border-[#7600bc] bg-white p-2.5 shadow-lg shadow-[#7600bc]/5 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-semibold text-[#6a5a75]" aria-live="polite">
          {loading ? (
            <LoadingIndicator label="Loading Retention & Activation" size="sm" />
          ) : (
            error || "Connected to Retention & Activation endpoints"
          )}
        </div>
        <Button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[6px] border border-[#176b87] bg-white px-3 text-[12px] font-bold text-[#176b87] shadow-sm hover:bg-[#eefafa] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={15} />
          {isExporting ? "Preparing download..." : "Export"}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReportPanel>
          <div className="min-h-[112px] rounded-[6px] border border-[#e5daf7] bg-white px-4 py-5 text-center transition-shadow hover:shadow-md hover:shadow-[#7600bc]/10">
            <div className="text-[clamp(2rem,5vw,2.7rem)] font-light leading-none text-[#42117d]">
              {kpi.isLoading ? (
                <LoadingIndicator label="Loading activation KPI" size="sm" />
              ) : (
                compactMoney(report.kpis.activationCumulative)
              )}
            </div>
            <div className="mt-3 text-[12px] font-medium text-[#5b167e]">
              Cumulative (Activation + HSI + Feature)
            </div>
          </div>
        </ReportPanel>
        <ReportPanel>
          <div className="min-h-[112px] rounded-[6px] border border-[#e5daf7] bg-white px-4 py-5 text-center transition-shadow hover:shadow-md hover:shadow-[#7600bc]/10">
            <div className="text-[clamp(2rem,5vw,2.7rem)] font-light leading-none text-[#42117d]">
              {kpi.isLoading ? (
                <LoadingIndicator label="Loading retention KPI" size="sm" />
              ) : (
                compactMoney(report.kpis.retentionCumulative)
              )}
            </div>
            <div className="mt-3 text-[12px] font-medium text-[#5b167e]">
              Retention - Cumulative
            </div>
          </div>
        </ReportPanel>
      </div>
      <div className="mt-6 grid gap-3">
        <div id="retention-market-section" className="min-w-0 max-w-full">
          <RetentionBreakdownTable
            title="Market Wise"
            rows={report.marketWise}
            isLoading={marketWise.isLoading}
          />
        </div>
        <div id="retention-store-section" className="min-w-0 max-w-full">
          <RetentionBreakdownTable
            title="Store Wise"
            rows={report.storeWise}
            isLoading={storeWise.isLoading}
          />
        </div>
        <div id="retention-employee-section" className="min-w-0 max-w-full">
          <RetentionBreakdownTable
            title="Employee Wise"
            rows={report.employeeWise}
            isLoading={employeeWise.isLoading}
          />
        </div>
        <div id="retention-trend-section" className="min-w-0 max-w-full">
          <RetentionTrendChart points={report.trend} isLoading={trend.isLoading} />
        </div>
      </div>
    </section>
  );
}
