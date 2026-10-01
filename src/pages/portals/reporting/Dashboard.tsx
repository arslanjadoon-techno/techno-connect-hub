"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import {
  getExportUrl,
  getFilterValues,
  clearReportResponseCache,
  getStoreWiseExportUrl,
  getStoreWiseFilterValues,
} from "@/services/portals/reporting/report-api";
import { clearRetentionResponseCache } from "@/services/portals/reporting/retention-api";
import type { FilterOptionSet, Filters } from "./types";
import type { ReportView } from "./types";
import ProfitabilityReport from "../../../components/reporting/report/ProfitabilityReport";
import RetentionActivationReport from "./reports/retention-activation/RetentionActivationReport";
import { reportRegistry } from "../../../components/reporting/dashboard/report-registry";
import { usePdCompensationData } from "./reports/pd-compensation/usePdCompensationData";
import { useStoreWisePdData } from "./reports/store-wise-pd/useStoreWisePdData";
import ReportFilterWorkspace from "../../../components/reporting/dashboard/ReportFilterWorkspace";
import PdCompensationReport from "./reports/pd-compensation/PdCompensationReport";
import StoreWisePdReport from "./reports/store-wise-pd/StoreWisePdReport";
import { downloadFile, formatShortDate, getLastTenDays } from "./lib/report-utils";

type DashboardProps = {
  initialView: ReportView;
};

const FILTER_STORAGE_KEY = "pd-reporting-filters-v6";
const STORE_WISE_FILTER_STORAGE_KEY = "store-wise-pd-reporting-filters-v5";
const RETENTION_FILTER_STORAGE_KEY = "retention-activation-reporting-filters-v1";
const PAGE_SIZE = 50;
const reportPaths = Object.fromEntries(
  Object.entries(reportRegistry).map(([id, definition]) => [id, definition.path]),
) as Record<ReportView, string>;
const defaultFilters: Filters = {
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
const emptyFilterOptions: FilterOptionSet = {
  markets: [],
  storesByMarket: {},
  programs: [],
  transactionTypes: [],
  compTypes: [],
  disputes: [],
};

function getInitialFilters(storageKey: string) {
  if (typeof window === "undefined") {
    return defaultFilters;
  }

  const savedFilters = window.localStorage.getItem(storageKey);

  let storedFilters = defaultFilters;
  try {
    storedFilters = savedFilters
      ? ({ ...defaultFilters, ...JSON.parse(savedFilters) } as Filters)
      : defaultFilters;
  } catch {
    storedFilters = defaultFilters;
  }

  if (!storedFilters.postedStart && !storedFilters.postedEnd) {
    Object.assign(storedFilters, getLastTenDays());
  }

  const expectedPath =
    storageKey === FILTER_STORAGE_KEY
      ? reportPaths["pd-compensation"]
      : storageKey === STORE_WISE_FILTER_STORAGE_KEY
        ? reportPaths["store-wise-pd-compensation"]
        : reportPaths["retention-activation"];

  if (window.location.pathname !== expectedPath) {
    return storedFilters;
  }

  const params = new URLSearchParams(window.location.search);
  const read = (key: string, fallback: string) => params.get(key) ?? fallback;

  return {
    postedStart: read("postedFrom", storedFilters.postedStart),
    postedEnd: read("postedTo", storedFilters.postedEnd),
    transactionStart: read("transactionFrom", storedFilters.transactionStart),
    transactionEnd: read("transactionTo", storedFilters.transactionEnd),
    programName: read("program", storedFilters.programName),
    transactionType: read("transactionType", storedFilters.transactionType),
    compType: read("compType", storedFilters.compType),
    dispute: read("dispute", storedFilters.dispute),
    markets: params.has("market") ? params.getAll("market") : storedFilters.markets,
    stores: params.has("store") ? params.getAll("store") : storedFilters.stores,
  };
}

function getInitialView(): ReportView {
  if (typeof window !== "undefined" && window.location.pathname === reportPaths.profitability) {
    return "profitability";
  }
  if (
    typeof window !== "undefined" &&
    window.location.pathname === reportPaths["store-wise-pd-compensation"]
  ) {
    return "store-wise-pd-compensation";
  }
  if (
    typeof window !== "undefined" &&
    window.location.pathname === reportPaths["retention-activation"]
  ) {
    return "retention-activation";
  }

  return "pd-compensation";
}

function buildReportUrl(view: ReportView, filters: Filters) {
  const params = new URLSearchParams();
  if (filters.postedStart) params.set("postedFrom", filters.postedStart);
  if (filters.postedEnd) params.set("postedTo", filters.postedEnd);

  if (filters.transactionStart) params.set("transactionFrom", filters.transactionStart);
  if (filters.transactionEnd) params.set("transactionTo", filters.transactionEnd);
  if (filters.programName !== "All") params.set("program", filters.programName);
  if (filters.transactionType !== "All") {
    params.set("transactionType", filters.transactionType);
  }
  if (filters.compType !== "All") params.set("compType", filters.compType);
  if (filters.dispute !== "All") params.set("dispute", filters.dispute);
  filters.markets.forEach((market) => params.append("market", market));
  filters.stores.forEach((store) => params.append("store", store));

  return `${reportPaths[view]}?${params.toString()}`;
}

export default function Dashboard({ initialView }: DashboardProps) {
  const [activeView, setActiveView] = useState<ReportView>(initialView);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);
  const [storeWiseFilters, setStoreWiseFilters] = useState<Filters>(defaultFilters);
  const [storeWiseDraftFilters, setStoreWiseDraftFilters] = useState<Filters>(defaultFilters);
  const [retentionFilters, setRetentionFilters] = useState<Filters>(defaultFilters);
  const [retentionDraftFilters, setRetentionDraftFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [apiFilters, setApiFilters] = useState<FilterOptionSet>(emptyFilterOptions);
  const [apiStoreWiseFilters, setApiStoreWiseFilters] =
    useState<FilterOptionSet>(emptyFilterOptions);
  const hasRestoredFiltersRef = useRef(false);

  const pdReport = usePdCompensationData(filters, page, activeView === "pd-compensation");
  const storeWiseReport = useStoreWisePdData(
    storeWiseFilters,
    activeView === "store-wise-pd-compensation",
  );

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const pdFilters = getInitialFilters(FILTER_STORAGE_KEY);
      const storeFilters = getInitialFilters(STORE_WISE_FILTER_STORAGE_KEY);
      hasRestoredFiltersRef.current = true;
      setFilters(pdFilters);
      setDraftFilters(pdFilters);
      setStoreWiseFilters(storeFilters);
      setStoreWiseDraftFilters(storeFilters);
      const retention = getInitialFilters(RETENTION_FILTER_STORAGE_KEY);
      setRetentionFilters(retention);
      setRetentionDraftFilters(retention);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasRestoredFiltersRef.current) return;
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (!hasRestoredFiltersRef.current) return;
    window.localStorage.setItem(STORE_WISE_FILTER_STORAGE_KEY, JSON.stringify(storeWiseFilters));
  }, [storeWiseFilters]);

  useEffect(() => {
    if (!hasRestoredFiltersRef.current) return;
    window.localStorage.setItem(RETENTION_FILTER_STORAGE_KEY, JSON.stringify(retentionFilters));
  }, [retentionFilters]);

  useEffect(() => {
    function restoreUrlState() {
      const view = getInitialView();
      const storageKey =
        view === "store-wise-pd-compensation"
          ? STORE_WISE_FILTER_STORAGE_KEY
          : view === "retention-activation"
            ? RETENTION_FILTER_STORAGE_KEY
            : FILTER_STORAGE_KEY;
      const restoredFilters = getInitialFilters(storageKey);

      setActiveView(view);
      if (view === "pd-compensation") {
        setFilters(restoredFilters);
        setDraftFilters(restoredFilters);
      } else if (view === "store-wise-pd-compensation") {
        setStoreWiseFilters(restoredFilters);
        setStoreWiseDraftFilters(restoredFilters);
      } else {
        setRetentionFilters(restoredFilters);
        setRetentionDraftFilters(restoredFilters);
      }
    }

    window.addEventListener("popstate", restoreUrlState);
    return () => window.removeEventListener("popstate", restoreUrlState);
  }, []);

  useEffect(() => {
    if (activeView === "profitability") {
      return;
    }
    const controller = new AbortController();
    const loadFilters =
      activeView === "pd-compensation"
        ? getFilterValues({ signal: controller.signal }).then((options) => setApiFilters(options))
        : activeView === "retention-activation"
          ? getFilterValues({ signal: controller.signal }).then((options) =>
              setApiStoreWiseFilters(options),
            )
          : getStoreWiseFilterValues({ signal: controller.signal }).then((options) =>
              setApiStoreWiseFilters(options),
            );

    loadFilters.catch(() => {
      if (!controller.signal.aborted) {
        if (activeView === "pd-compensation") {
          setApiFilters(emptyFilterOptions);
        } else {
          setApiStoreWiseFilters(emptyFilterOptions);
        }
      }
    });

    return () => controller.abort();
  }, [activeView]);

  function updateFilters(nextFilters: Filters) {
    pdReport.clearCache();
    setPage(1);
    setFilters({ ...nextFilters });
    window.history.replaceState(null, "", buildReportUrl("pd-compensation", nextFilters));
  }

  function resetFilters() {
    setDraftFilters(defaultFilters);
    updateFilters(defaultFilters);
  }

  function resetStoreWiseFilters() {
    setStoreWiseDraftFilters(defaultFilters);
    setStoreWiseFilters({ ...defaultFilters });
    window.history.replaceState(
      null,
      "",
      buildReportUrl("store-wise-pd-compensation", defaultFilters),
    );
  }

  function changeReportView(view: ReportView) {
    const reportFilters =
      view === "pd-compensation"
        ? filters
        : view === "store-wise-pd-compensation"
          ? storeWiseFilters
          : retentionFilters;
    setActiveView(view);
    window.history.pushState(null, "", buildReportUrl(view, reportFilters));
  }

  function changePdFilters(nextFilters: Filters) {
    setDraftFilters(nextFilters);
  }

  function changeStoreWiseFilters(nextFilters: Filters) {
    setStoreWiseDraftFilters(nextFilters);
  }

  function applyPdFilters() {
    clearReportResponseCache();
    updateFilters(draftFilters);
  }

  function applyStoreWiseFilters() {
    clearReportResponseCache();
    setStoreWiseFilters({ ...storeWiseDraftFilters });
    window.history.replaceState(
      null,
      "",
      buildReportUrl("store-wise-pd-compensation", storeWiseDraftFilters),
    );
  }

  function applyRetentionFilters() {
    clearRetentionResponseCache();
    setRetentionFilters({ ...retentionDraftFilters });
    window.history.replaceState(
      null,
      "",
      buildReportUrl("retention-activation", retentionDraftFilters),
    );
  }

  function resetRetentionFilters() {
    setRetentionDraftFilters(defaultFilters);
    setRetentionFilters({ ...defaultFilters });
    window.history.replaceState(null, "", buildReportUrl("retention-activation", defaultFilters));
  }

  async function exportReport() {
    await downloadFile(getExportUrl(filters), "pd-compensation-report.xlsx");
  }

  async function exportStoreWiseReport() {
    await downloadFile(
      getStoreWiseExportUrl(storeWiseFilters),
      "store-wise-pd-compensation-report.xlsx",
    );
  }

  const isPdView = activeView === "pd-compensation";
  const isStoreWiseView = activeView === "store-wise-pd-compensation";
  const filterTitle = isPdView
    ? "PD Compensation"
    : isStoreWiseView
      ? "Store Wise PD"
      : "Retention & Activation";
  const draftReportFilters = isPdView
    ? draftFilters
    : isStoreWiseView
      ? storeWiseDraftFilters
      : retentionDraftFilters;
  const reportFilterOptions = isPdView ? apiFilters : apiStoreWiseFilters;
  const changeReportFilters = isPdView
    ? changePdFilters
    : isStoreWiseView
      ? changeStoreWiseFilters
      : setRetentionDraftFilters;
  const applyReportFilters = isPdView
    ? applyPdFilters
    : isStoreWiseView
      ? applyStoreWiseFilters
      : applyRetentionFilters;
  const resetReportFilters = isPdView
    ? resetFilters
    : isStoreWiseView
      ? resetStoreWiseFilters
      : resetRetentionFilters;
  const activeFilters = isPdView ? filters : isStoreWiseView ? storeWiseFilters : retentionFilters;
  const dateRange =
    activeFilters.postedStart && activeFilters.postedEnd
      ? `${formatShortDate(activeFilters.postedStart)} – ${formatShortDate(activeFilters.postedEnd)}`
      : "All dates";

  return (
    <main data-reporting-theme className="min-h-screen bg-[#f8f9fc] font-sans text-[#2d3033]">
      <div className="px-2 pb-3 pt-3 sm:px-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => setIsFilterPanelOpen((isOpen) => !isOpen)}
            aria-pressed={isFilterPanelOpen}
            className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-[6px] border px-3 text-[12px] font-bold shadow-sm transition ${
              isFilterPanelOpen
                ? "border-[#7600bc] bg-[#f5e8ff] text-[#7600bc]"
                : "border-[#eadcf2] bg-white text-[#3f3548] hover:border-[#7600bc] hover:text-[#7600bc]"
            }`}
          >
            <SlidersHorizontal size={15} />
            Filters
          </Button>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:gap-5 xl:flex-row">
          {isFilterPanelOpen && activeView !== "profitability" ? (
            <ReportFilterWorkspace
              title={filterTitle}
              filters={draftReportFilters}
              options={reportFilterOptions}
              resultCount={isPdView ? pdReport.detail.totalRows : 0}
              showProgramFilter={isPdView}
              showTransactionTypeFilter={isPdView}
              showCompTypeFilter={isPdView}
              showDisputeFilter={isPdView}
              showResultCount={isPdView}
              onChange={changeReportFilters}
              onApply={applyReportFilters}
              onReset={resetReportFilters}
              onClose={() => setIsFilterPanelOpen(false)}
            />
          ) : null}

          {activeView === "retention-activation" ? (
            <RetentionActivationReport filters={retentionFilters} />
          ) : activeView === "pd-compensation" ? (
            <PdCompensationReport
              status={pdReport.status}
              isSummaryLoading={pdReport.isSummaryLoading}
              isKpiLoading={pdReport.isKpiLoading}
              isMarketLoading={pdReport.isMarketLoading}
              isStoreLoading={pdReport.isStoreLoading}
              isTrendLoading={pdReport.isTrendLoading}
              isDetailLoading={pdReport.isDetailLoading}
              kpi={pdReport.kpi}
              marketData={pdReport.marketData}
              storeData={pdReport.storeData}
              trendData={pdReport.trendData}
              detail={pdReport.detail}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onExport={exportReport}
            />
          ) : activeView === "store-wise-pd-compensation" ? (
            <StoreWisePdReport
              status={storeWiseReport.status}
              isLoading={storeWiseReport.isLoading}
              isKpiLoading={storeWiseReport.isKpiLoading}
              isMatrixLoading={storeWiseReport.isMatrixLoading}
              isDoorCodesLoading={storeWiseReport.isDoorCodesLoading}
              isTransactionTypesLoading={storeWiseReport.isTransactionTypesLoading}
              isTrendLoading={storeWiseReport.isTrendLoading}
              isMatrixDeferred={storeWiseReport.isMatrixDeferred}
              isDoorCodesDeferred={storeWiseReport.isDoorCodesDeferred}
              isTransactionTypesDeferred={storeWiseReport.isTransactionTypesDeferred}
              isTrendDeferred={storeWiseReport.isTrendDeferred}
              kpi={storeWiseReport.kpi}
              doorCodes={storeWiseReport.doorCodes}
              transactionTypes={storeWiseReport.transactionTypes}
              trend={storeWiseReport.trend}
              matrix={storeWiseReport.matrix}
              onExport={exportStoreWiseReport}
            />
          ) : (
            <ProfitabilityReport
              showFilters={isFilterPanelOpen}
              onCloseFilters={() => setIsFilterPanelOpen(false)}
            />
          )}
        </div>
      </div>
    </main>
  );
}
