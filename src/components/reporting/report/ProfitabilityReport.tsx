"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { FilterOptionSet, Filters } from "../../../pages/portals/reporting/types";
import {
  getProfitabilityFilterValues,
  getProfitabilityKpi,
  getProfitabilityExportUrl,
  getProfitabilityReport,
  profitabilityCategories as categories,
  type ProfitabilityMonth,
  type ProfitabilityRow,
  type ProfitabilityKpi,
} from "../../../pages/portals/reporting/lib/profitability-api";
import FilterPanel from "../filters/FilterPanel";
import KpiCard from "./KpiCard";
import ReportPanel from "./ReportPanel";
import LoadingIndicator from "./LoadingIndicator";
import { downloadFile } from "../../../pages/portals/reporting/lib/report-utils";
import { Button } from "@/components/ui/button";
import { formatMoney, getLastTenDays } from "../../../pages/portals/reporting/lib/report-utils";

const colors = [
  "#168ddb",
  "#1c3d96",
  "#ec713d",
  "#a723a9",
  "#d83d8d",
  "#7349bd",
  "#e0b410",
  "#dc454d",
];

const money = { format: formatMoney };
const shortMoney = money;

const initialFilters: Filters = {
  ...getLastTenDays(),
  postedStart: "2026-09-01",
  postedEnd: "2026-09-10",
  transactionStart: "",
  transactionEnd: "",
  programName: "All",
  transactionType: "All",
  compType: "All",
  dispute: "All",
  markets: [],
  stores: [],
};

export default function ProfitabilityReport({
  showFilters,
  onCloseFilters,
}: {
  showFilters: boolean;
  onCloseFilters: () => void;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
  const [rows, setRows] = useState<ProfitabilityRow[]>([]);
  const [monthly, setMonthly] = useState<ProfitabilityMonth[]>([]);
  const [kpi, setKpi] = useState<ProfitabilityKpi | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportCategories, setReportCategories] = useState<string[]>([...categories]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptionSet>({
    markets: [],
    storesByMarket: {},
    programs: [],
    transactionTypes: [],
    compTypes: [],
    disputes: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    getProfitabilityFilterValues({ signal: controller.signal })
      .then(setFilterOptions)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setKpiLoading(true);
    setDataLoading(true);
    getProfitabilityKpi(filters, { signal: controller.signal })
      .then(setKpi)
      .catch(() => {
        if (!controller.signal.aborted) setKpi(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setKpiLoading(false);
      });
    getProfitabilityReport(filters, { signal: controller.signal })
      .then((result) => {
        setRows(result.rows);
        setMonthly(result.monthly);
        if (result.categories?.length) setReportCategories(result.categories);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : "Profitability API failed");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setDataLoading(false);
        }
      });
    return () => controller.abort();
  }, [filters]);

  const totals = useMemo(
    () => reportCategories.map((_, index) => rows.reduce((sum, row) => sum + row.values[index], 0)),
    [rows, reportCategories],
  );
  const grandTotal = totals.reduce((sum, value) => sum + value, 0);
  const chartMax = Math.max(...totals.map(Math.abs), 1);

  function updateFilters(nextFilters: Filters) {
    setIsLoading(true);
    setFilters(nextFilters);
    const params = new URLSearchParams();
    if (nextFilters.postedStart) params.set("postedFrom", nextFilters.postedStart);
    if (nextFilters.postedEnd) params.set("postedTo", nextFilters.postedEnd);
    if (nextFilters.transactionStart) params.set("transactionFrom", nextFilters.transactionStart);
    if (nextFilters.transactionEnd) params.set("transactionTo", nextFilters.transactionEnd);
    if (nextFilters.transactionType !== "All")
      params.set("transactionType", nextFilters.transactionType);
    if (nextFilters.compType !== "All") params.set("compType", nextFilters.compType);
    if (nextFilters.dispute !== "All") params.set("dispute", nextFilters.dispute);
    nextFilters.markets.forEach((market) => params.append("market", market));
    nextFilters.stores.forEach((store) => params.append("store", store));
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}${params.toString() ? `?${params}` : ""}`,
    );
  }

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadFile(getProfitabilityExportUrl(filters), "profitability-report.xlsx");
    } finally {
      setIsExporting(false);
    }
  }

  function resetFilters() {
    setDraftFilters(initialFilters);
    updateFilters(initialFilters);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row">
      {showFilters ? (
        <FilterPanel
          title="Profitability"
          filters={draftFilters}
          markets={filterOptions.markets}
          storesByMarket={filterOptions.storesByMarket}
          programs={filterOptions.programs}
          transactionTypes={filterOptions.transactionTypes}
          compTypes={filterOptions.compTypes}
          disputes={filterOptions.disputes}
          resultCount={rows.length}
          showProgramFilter={filterOptions.programs.length > 0}
          showResultCount={false}
          compTypeLabel="Profitability"
          onChange={setDraftFilters}
          onApply={() => updateFilters(draftFilters)}
          onReset={resetFilters}
          onClose={onCloseFilters}
        />
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-400 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      ) : null}

      <section className="profitability-report relative min-w-0 flex-1 rounded-2xl border-2 border-[#7600bc] bg-white p-2.5 text-[#3f2354] shadow-lg shadow-[#7600bc]/10 sm:p-3">
        <div className="grid gap-5">
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[6px] border border-[#176b87] bg-white px-3 text-[12px] font-bold text-[#176b87] shadow-sm transition hover:bg-[#eefafa] disabled:cursor-not-allowed disabled:opacity-60"
              title="Export Profitability report"
            >
              <Download size={14} />
              {isExporting ? "Preparing download..." : "Export"}
            </Button>
          </div>
          <KpiCard
            summary={{
              pdAmount: kpi?.total || grandTotal,
              pdTransactions: kpi?.transactions ?? 0,
            }}
            showTransactions={false}
            isLoading={kpiLoading}
          />

          <ReportPanel title="Store wise" className="overflow-hidden">
            {dataLoading ? (
              <div className="flex h-[430px] items-center justify-center">
                <LoadingIndicator label="Loading store wise profitability" size="lg" />
              </div>
            ) : (
              <div className="max-h-[430px] overflow-auto">
                <table className="w-full min-w-[950px] border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10 bg-primary text-primary-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left">Store</th>
                      {reportCategories.map((c) => (
                        <th key={c} className="px-2 py-2 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr
                        key={`${row.code}-${row.name}-${ri}`}
                        className={
                          ri % 2 ? "bg-muted/50 text-foreground" : "bg-card text-foreground"
                        }
                      >
                        <td className="whitespace-nowrap px-2 py-1">
                          {row.code} - {row.name}
                        </td>
                        {row.values.map((v, i) => (
                          <td key={reportCategories[i]} className="px-2 py-1 text-right">
                            {v < 0 ? `(${money.format(Math.abs(v))})` : money.format(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-primary/15 font-bold text-foreground">
                    <tr>
                      <td className="px-2 py-2">Total</td>
                      {totals.map((v, i) => (
                        <td key={reportCategories[i]} className="px-2 py-2 text-right">
                          {v < 0 ? `(${money.format(Math.abs(v))})` : money.format(v)}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </ReportPanel>

          <ReportPanel title="Profitability Headers" className="overflow-hidden p-3">
            {dataLoading ? (
              <div className="flex h-[300px] items-center justify-center">
                <LoadingIndicator label="Loading profitability headers" size="lg" />
              </div>
            ) : (
              <div className="flex h-[300px] items-end gap-3 overflow-x-auto border-b border-[#e7dce9] px-3 pb-8 pt-6">
                {totals.map((value, index) => (
                  <div
                    key={reportCategories[index]}
                    className="flex h-full min-w-[80px] flex-1 flex-col items-center justify-end"
                  >
                    <span className="mb-2 text-[10px] text-[#5b3a68]">
                      {shortMoney.format(value)}
                    </span>
                    <div
                      className="w-[70%] bg-[var(--primary)]"
                      style={{
                        height: `${Math.max((Math.abs(value) / chartMax) * 190, 3)}px`,
                        backgroundImage: "var(--gradient-primary)",
                      }}
                    />
                    <span className="mt-3 text-center text-[9px] text-[#5b3a68]">
                      {reportCategories[index]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ReportPanel>

          <ReportPanel
            title="Monthly Profitability Distribution (%)"
            className="overflow-hidden p-3"
          >
            {dataLoading ? (
              <div className="flex h-[300px] items-center justify-center">
                <LoadingIndicator label="Loading monthly profitability" size="lg" />
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  {reportCategories.map((c, i) => (
                    <span key={c} className="text-[9px] text-[#685a6e]">
                      <i
                        className="mr-1 inline-block h-2 w-2 rounded-full"
                        style={{ background: colors[i] }}
                      />
                      {c}
                    </span>
                  ))}
                </div>
                <div className="relative flex h-[300px] items-end gap-2 overflow-x-auto rounded-md border-b border-border px-3 pb-8 pt-4 [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_59px,color-mix(in_oklab,var(--border)_70%,transparent)_60px)]">
                  <div className="pointer-events-none absolute bottom-8 left-1 top-3 z-10 flex w-7 flex-col justify-between text-[8px] text-muted-foreground">
                    <span>100%</span>
                    <span>80%</span>
                    <span>60%</span>
                    <span>40%</span>
                    <span>20%</span>
                    <span>0%</span>
                  </div>
                  <div
                    className="ml-7 flex h-full min-w-full items-end gap-4"
                    style={{ minWidth: `${Math.max(monthly.length * 88, 720)}px` }}
                  >
                    {monthly.map((item, index) => {
                      const total = item.values.reduce((a, b) => a + Math.abs(b), 0);
                      return (
                        <div
                          key={`${item.month}-${index}`}
                          className="flex h-full w-[72px] flex-none flex-col justify-end"
                        >
                          <div className="flex h-[230px] w-16 shrink-0 flex-col-reverse justify-start rounded-t-md border-x border-t border-primary/20 bg-primary/5">
                            {item.values.map((v, i) => (
                              <div
                                key={reportCategories[i]}
                                title={`${reportCategories[i]} ${v.toFixed(1)}%`}
                                className="flex items-center justify-center overflow-hidden text-[8px] font-bold text-white"
                                style={{
                                  height: `${total ? Math.max((Math.abs(v) / total) * 100, 1.5) : 0}%`,
                                  background: colors[i],
                                }}
                              >
                                {total && Math.abs(v) / total > 0.09
                                  ? `${((Math.abs(v) / total) * 100).toFixed(1)}%`
                                  : ""}
                              </div>
                            ))}
                          </div>
                          <span className="mt-3 whitespace-nowrap text-center text-[9px] text-[#66586b]">
                            {item.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </ReportPanel>
        </div>
      </section>
    </div>
  );
}
