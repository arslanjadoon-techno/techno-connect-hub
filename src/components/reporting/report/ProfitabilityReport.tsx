"use client";

import { useEffect, useMemo, useState } from "react";
import type { FilterOptionSet, Filters } from "../../../pages/portals/reporting/types";
import {
  getProfitabilityFilterValues,
  getProfitabilityReport,
  profitabilityCategories as categories,
  type ProfitabilityMonth,
  type ProfitabilityRow,
} from "../../../pages/portals/reporting/lib/profitability-api";
import FilterPanel from "../filters/FilterPanel";
import KpiCard from "./KpiCard";
import ReportPanel from "./ReportPanel";
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
    getProfitabilityFilterValues({ signal: controller.signal })
      .then(setFilterOptions)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getProfitabilityReport(filters, { signal: controller.signal })
      .then((result) => {
        setRows(result.rows);
        setMonthly(result.monthly);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  const totals = useMemo(
    () =>
      categories.map((_, index) =>
        rows.reduce((sum, row) => sum + row.values[index], 0),
      ),
    [rows],
  );
  const grandTotal = totals.reduce((sum, value) => sum + value, 0);
  const chartMax = Math.max(...totals.map(Math.abs), 1);

  function updateFilters(nextFilters: Filters) {
    setIsLoading(true);
    setFilters(nextFilters);
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
          programs={[]}
          transactionTypes={filterOptions.transactionTypes}
          compTypes={filterOptions.compTypes}
          disputes={filterOptions.disputes}
          resultCount={rows.length}
          showProgramFilter={false}
          showResultCount={false}
          compTypeLabel="Profitability"
          onChange={setDraftFilters}
          onApply={() => updateFilters(draftFilters)}
          onReset={resetFilters}
          onClose={onCloseFilters}
        />
      ) : null}

      <section className="min-w-0 flex-1 rounded-2xl border border-[#7600bc] bg-white p-2.5 shadow-lg shadow-[#7600bc]/5 sm:p-5">
        <div className="grid gap-5">
          <KpiCard
            summary={{ pdAmount: grandTotal, pdTransactions: 0 }}
            showTransactions={false}
            isLoading={isLoading}
          />

          <ReportPanel title="Store wise" className="overflow-hidden">
            <div className="max-h-[430px] overflow-auto">
              <table className="w-full min-w-[950px] border-collapse text-[11px]">
                <thead className="sticky top-0 z-10 bg-primary text-primary-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left">Store</th>
                    {categories.map((c) => (
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
                      className={ri % 2 ? "bg-muted/50 text-foreground" : "bg-card text-foreground"}
                    >
                      <td className="whitespace-nowrap px-2 py-1">
                        {row.code} - {row.name}
                      </td>
                      {row.values.map((v, i) => (
                        <td
                          key={categories[i]}
                          className="px-2 py-1 text-right"
                        >
                          {v < 0
                            ? `(${money.format(Math.abs(v))})`
                            : money.format(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-primary/15 font-bold text-foreground">
                  <tr>
                    <td className="px-2 py-2">Total</td>
                    {totals.map((v, i) => (
                      <td key={categories[i]} className="px-2 py-2 text-right">
                        {v < 0
                          ? `(${money.format(Math.abs(v))})`
                          : money.format(v)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </ReportPanel>

          <ReportPanel
            title="Profitability Headers"
            className="overflow-hidden p-3"
          >
            <div className="flex h-[300px] items-end gap-3 overflow-x-auto border-b border-[#e7dce9] px-3 pb-8 pt-6">
              {totals.map((value, index) => (
                <div
                  key={categories[index]}
                  className="flex h-full min-w-[80px] flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-2 text-[10px] text-[#5b3a68]">
                    {shortMoney.format(value)}
                  </span>
                  <div
                    className="w-[70%] bg-[#765197]"
                    style={{
                      height: `${Math.max((Math.abs(value) / chartMax) * 190, 3)}px`,
                    }}
                  />
                  <span className="mt-3 text-center text-[9px] text-[#5b3a68]">
                    {categories[index]}
                  </span>
                </div>
              ))}
            </div>
          </ReportPanel>

          <ReportPanel
            title="Monthly Profitability Distribution (%)"
            className="overflow-hidden p-3"
          >
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {categories.map((c, i) => (
                <span key={c} className="text-[9px] text-[#685a6e]">
                  <i
                    className="mr-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: colors[i] }}
                  />
                  {c}
                </span>
              ))}
            </div>
            <div className="flex h-[300px] items-end gap-2 overflow-x-auto px-3 pb-8">
              {monthly.map((item, index) => {
                const total = item.values.reduce((a, b) => a + b, 0);
                return (
                  <div
                    key={`${item.month}-${index}`}
                    className="flex h-full min-w-[54px] flex-1 flex-col justify-end"
                  >
                    <div className="flex h-[230px] flex-col-reverse">
                      {item.values.map((v, i) => (
                        <div
                          key={categories[i]}
                          title={`${categories[i]} ${v.toFixed(1)}%`}
                          className="flex items-center justify-center overflow-hidden text-[8px] font-bold text-white"
                          style={{
                            height: `${(v / total) * 100}%`,
                            background: colors[i],
                          }}
                        >
                          {v / total > 0.09
                            ? `${((v / total) * 100).toFixed(1)}%`
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
          </ReportPanel>
        </div>
      </section>
    </div>
  );
}
