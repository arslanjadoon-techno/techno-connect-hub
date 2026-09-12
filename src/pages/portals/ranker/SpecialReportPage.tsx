import React, { useState, useEffect, useMemo } from "react";
import { ConfettiBackground } from "@/components/confetti-background";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RotateCcw,
  Store,
  Calendar,
  CalendarDays,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  GitCompare,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { rankerService } from "@/services/portals/ranker";
import type { GoalVsAchievementResponse } from "@/services/portals/ranker/types";

// Tab types
export type SpecialReportTab = "SUMMARY" | "DCS_VS_RTBDI";

export interface MetricQuad {
  tgt: number;
  act: number;
  diff: number;
  pct: number;
}

export interface MetricQuint {
  tgt: number;
  dcs: number;
  pct: number;
  rt: number;
  diff: number;
}

export interface SummaryRowRecord {
  id: string;
  store: string;
  manager: string;
  market: string;
  fullMonth: MetricQuad;
  mtd: MetricQuad;
  voice: MetricQuad;
  upgrade: MetricQuad;
  bts: MetricQuad;
  hsi: MetricQuad;
  mim: MetricQuad;
  acc: MetricQuad;
}

export interface DcsRowRecord {
  id: string;
  store: string;
  manager: string;
  market: string;
  fmtdAch: MetricQuint;
  voice: MetricQuint;
  bts: MetricQuint;
  hsi: MetricQuint;
  mim: MetricQuint;
}

const DEFAULT_MARKETS = ["ARIZONA", "TEXAS", "FLORIDA", "CALIFORNIA", "NEVADA", "NEW YORK"];

const MONTH_OPTIONS = [
  { name: "January", value: 1 },
  { name: "February", value: 2 },
  { name: "March", value: 3 },
  { name: "April", value: 4 },
  { name: "May", value: 5 },
  { name: "June", value: 6 },
  { name: "July", value: 7 },
  { name: "August", value: 8 },
  { name: "September", value: 9 },
  { name: "October", value: 10 },
  { name: "November", value: 11 },
  { name: "December", value: 12 },
];

function buildQuad(tgt?: number, act?: number): MetricQuad {
  const roundTgt = Math.round(Number(tgt) || 0);
  const roundAct = Math.round(Number(act) || 0);
  const diff = roundAct - roundTgt;
  const pct = roundTgt > 0 ? Math.round((roundAct / roundTgt) * 100) : 0;
  return { tgt: roundTgt, act: roundAct, diff, pct };
}

function buildQuint(tgt?: number, dcs?: number, rt?: number): MetricQuint {
  const roundTgt = Math.round(Number(tgt) || 0);
  const roundDcs = Math.round(Number(dcs) || 0);
  const roundRt = Math.round(Number(rt) || 0);
  const pct = roundTgt > 0 ? Math.round((roundDcs / roundTgt) * 100) : 0;
  const diff = roundDcs - roundRt;
  return { tgt: roundTgt, dcs: roundDcs, pct, rt: roundRt, diff };
}

// Percentage Badge Component following the strict Red, Yellow, Green color rule:
// <= 70% : Red
// 71% - 99% : Yellow
// >= 100% : Green
function renderPctBadge(pct: number) {
  const roundedPct = Math.round(pct);
  let badgeClass = "";
  if (roundedPct <= 70) {
    badgeClass =
      "bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
  } else if (roundedPct < 100) {
    badgeClass =
      "bg-[#fef9c3] text-[#854d0e] border border-[#fde047] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
  } else {
    badgeClass =
      "bg-[#dcfce7] text-[#166534] border border-[#86efac] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800";
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-extrabold px-2 py-0.5 rounded-lg text-xs min-w-[48px] shadow-2xs ${badgeClass}`}
    >
      {roundedPct}%
    </span>
  );
}

// Formatter for integer differences (+ / - / 0) with no decimals
function renderDiff(diff: number) {
  const roundedDiff = Math.round(diff);
  if (roundedDiff > 0) {
    return (
      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
        +{roundedDiff.toLocaleString()}
      </span>
    );
  }
  if (roundedDiff < 0) {
    return (
      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
        {roundedDiff.toLocaleString()}
      </span>
    );
  }
  return <span className="font-mono text-muted-foreground font-semibold">0</span>;
}

export default function SpecialReportPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  // Filter year options: 2 years behind, current year, 2 years ahead
  const yearOptions = useMemo(() => {
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(
      String,
    );
  }, [currentYear]);

  // Tab & Filters state
  const [activeTab, setActiveTab] = useState<SpecialReportTab>("SUMMARY");
  const [selectedMarket, setSelectedMarket] = useState<string>("ARIZONA");
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Market options state
  const [markets, setMarkets] = useState<string[]>(DEFAULT_MARKETS);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState<boolean>(false);

  // API response state
  const [apiData, setApiData] = useState<GoalVsAchievementResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Sorting state
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Load Markets from API
  useEffect(() => {
    let isMounted = true;
    async function loadMarkets() {
      try {
        setIsLoadingMarkets(true);
        const list = await rankerService.getMarketList();
        if (isMounted && list && list.length > 0) {
          setMarkets(list);
          setSelectedMarket((current) => {
            if (!list.includes(current)) {
              return list.includes("ARIZONA") ? "ARIZONA" : list[0];
            }
            return current;
          });
        }
      } catch (err: any) {
        console.error("Failed to load market list:", err);
      } finally {
        if (isMounted) setIsLoadingMarkets(false);
      }
    }
    loadMarkets();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch live Goal vs Achievement data from API
  useEffect(() => {
    if (!selectedMarket) return;
    let isMounted = true;

    async function loadSpecialReportData() {
      try {
        setIsLoadingData(true);
        setDataError(null);

        const res = await rankerService.getGoalVsAchievement({
          market: selectedMarket,
          year: selectedYear,
          month: selectedMonth,
          dayfrom: 0,
          dayto: 31,
        });

        if (isMounted) {
          setApiData(res);
        }
      } catch (err: any) {
        console.error("Failed to load special report data:", err);
        if (isMounted) {
          setDataError(err?.message || "Failed to load data from server");
          toast.error("Failed to fetch special report data from server");
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }

    loadSpecialReportData();

    return () => {
      isMounted = false;
    };
  }, [selectedMarket, selectedYear, selectedMonth, refreshKey]);

  // Tab 1: Summary List mapped from API
  const summaryRows: SummaryRowRecord[] = useMemo(() => {
    if (!apiData?.Summary || !Array.isArray(apiData.Summary)) return [];
    return apiData.Summary.map((s, idx) => ({
      id: s.tid ? String(s.tid) : `${s.storeName}-${idx}`,
      store: s.storeName || "N/A",
      manager: s.districtManager || "N/A",
      market: s.market || selectedMarket,
      fullMonth: buildQuad(s.full_Month_Target, s.full_Month_Achieved),
      mtd: buildQuad(s.mtD_Target, s.mtD_Achieved),
      voice: buildQuad(s.voicE_Target, s.voicE_Achieved),
      upgrade: buildQuad(s.upgrade_Target, s.upgrade_Achieved),
      bts: buildQuad(s.btS_Target, s.btS_Achieved),
      hsi: buildQuad(s.hsI_Target, s.hsI_Achieved),
      mim: buildQuad(s.miM_Target, s.miM_Achieved),
      acc: buildQuad(s.acC_Target, s.acC_Achieved),
    }));
  }, [apiData, selectedMarket]);

  // Tab 2: DCS vs RTBDI List mapped from API
  const dcsRows: DcsRowRecord[] = useMemo(() => {
    if (!apiData?.DCS_VS_RTBDI || !Array.isArray(apiData.DCS_VS_RTBDI)) return [];
    return apiData.DCS_VS_RTBDI.map((d, idx) => ({
      id: d.tid ? String(d.tid) : `${d.storeName}-${idx}`,
      store: d.storeName || "N/A",
      manager: d.market_Manager || "N/A",
      market: d.market || selectedMarket,
      fmtdAch: buildQuint(d.total_Targets_FMTD, d.dcS_ACHIEVED_FMTD, d.rT_ACHIEVED_FMTD),
      voice: buildQuint(d.total_Targets_Voice, d.dcS_ACHIEVED_Voice, d.rT_ACHIEVED_Voice),
      bts: buildQuint(d.total_Targets_BTS, d.dcS_ACHIEVED_BTS, d.rT_ACHIEVED_BTS),
      hsi: buildQuint(d.total_Targets_HSI, d.dcS_ACHIEVED_HSI, d.rT_ACHIEVED_HSI),
      mim: buildQuint(d.total_Targets_MIM, d.dcS_ACHIEVED_MIM, d.rT_ACHIEVED_MIM),
    }));
  }, [apiData, selectedMarket]);

  // Filtered & Sorted Tab 1 Summary Data
  const filteredSummaryData = useMemo(() => {
    let list = summaryRows;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.store.toLowerCase().includes(q) ||
          r.manager.toLowerCase().includes(q) ||
          r.market.toLowerCase().includes(q),
      );
    }

    if (sortCol) {
      list = [...list].sort((a, b) => {
        if (sortCol === "store") {
          return sortDir === "asc"
            ? a.store.localeCompare(b.store)
            : b.store.localeCompare(a.store);
        }
        if (sortCol === "manager") {
          return sortDir === "asc"
            ? a.manager.localeCompare(b.manager)
            : b.manager.localeCompare(a.manager);
        }
        if (sortCol === "fullMonthPct") {
          return sortDir === "asc"
            ? a.fullMonth.pct - b.fullMonth.pct
            : b.fullMonth.pct - a.fullMonth.pct;
        }
        if (sortCol === "mtdPct") {
          return sortDir === "asc" ? a.mtd.pct - b.mtd.pct : b.mtd.pct - a.mtd.pct;
        }
        if (sortCol === "voicePct") {
          return sortDir === "asc" ? a.voice.pct - b.voice.pct : b.voice.pct - a.voice.pct;
        }
        if (sortCol === "upgradePct") {
          return sortDir === "asc" ? a.upgrade.pct - b.upgrade.pct : b.upgrade.pct - a.upgrade.pct;
        }
        if (sortCol === "btsPct") {
          return sortDir === "asc" ? a.bts.pct - b.bts.pct : b.bts.pct - a.bts.pct;
        }
        if (sortCol === "hsiPct") {
          return sortDir === "asc" ? a.hsi.pct - b.hsi.pct : b.hsi.pct - a.hsi.pct;
        }
        if (sortCol === "mimPct") {
          return sortDir === "asc" ? a.mim.pct - b.mim.pct : b.mim.pct - a.mim.pct;
        }
        if (sortCol === "accPct") {
          return sortDir === "asc" ? a.acc.pct - b.acc.pct : b.acc.pct - a.acc.pct;
        }
        return 0;
      });
    }

    return list;
  }, [summaryRows, searchQuery, sortCol, sortDir]);

  // Filtered & Sorted Tab 2 DCS Data
  const filteredDcsData = useMemo(() => {
    let list = dcsRows;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.store.toLowerCase().includes(q) ||
          r.manager.toLowerCase().includes(q) ||
          r.market.toLowerCase().includes(q),
      );
    }

    if (sortCol) {
      list = [...list].sort((a, b) => {
        if (sortCol === "store") {
          return sortDir === "asc"
            ? a.store.localeCompare(b.store)
            : b.store.localeCompare(a.store);
        }
        if (sortCol === "manager") {
          return sortDir === "asc"
            ? a.manager.localeCompare(b.manager)
            : b.manager.localeCompare(a.manager);
        }
        if (sortCol === "dcsFmtdPct") {
          return sortDir === "asc" ? a.fmtdAch.pct - b.fmtdAch.pct : b.fmtdAch.pct - a.fmtdAch.pct;
        }
        if (sortCol === "dcsVoicePct") {
          return sortDir === "asc" ? a.voice.pct - b.voice.pct : b.voice.pct - a.voice.pct;
        }
        if (sortCol === "dcsBtsPct") {
          return sortDir === "asc" ? a.bts.pct - b.bts.pct : b.bts.pct - a.bts.pct;
        }
        if (sortCol === "dcsHsiPct") {
          return sortDir === "asc" ? a.hsi.pct - b.hsi.pct : b.hsi.pct - a.hsi.pct;
        }
        if (sortCol === "dcsMimPct") {
          return sortDir === "asc" ? a.mim.pct - b.mim.pct : b.mim.pct - a.mim.pct;
        }
        return 0;
      });
    }

    return list;
  }, [dcsRows, searchQuery, sortCol, sortDir]);

  const handleSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("desc");
    } else {
      if (sortDir === "desc") {
        setSortDir("asc");
      } else {
        setSortCol(null);
        setSortDir("desc");
      }
    }
  };

  const handleResetFilters = () => {
    const currentY = new Date().getFullYear();
    const currentM = new Date().getMonth() + 1;
    setSelectedMarket(markets.includes("ARIZONA") ? "ARIZONA" : markets[0] || "ARIZONA");
    setSelectedYear(String(currentY));
    setSelectedMonth(currentM);
    setSearchQuery("");
    setSortCol(null);
    setSortDir("desc");
    toast.info("Filters reset to default");
  };

  const selectedMonthObj = MONTH_OPTIONS.find((m) => m.value === selectedMonth);
  const selectedMonthName = selectedMonthObj ? selectedMonthObj.name : "May";

  return (
    <ConfettiBackground>
      <div className="space-y-5 p-2 sm:p-4 max-w-full overflow-x-hidden animate-fade-in relative z-0">
        {/* Top Header Card & Filter Banner */}
        <div className="rounded-xl overflow-hidden shadow-lg border border-border/70 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white relative">
          <div className="absolute inset-0 bg-radial-at-t from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 relative z-10">
            {/* Title & Market Subtitle */}
            <div className="space-y-1 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase font-display text-white drop-shadow-sm">
                    SPECIAL REPORT
                  </h1>
                  <p className="text-xs font-semibold tracking-widest text-amber-400/95 uppercase">
                    MARKET: {selectedMarket} • {selectedMonthName.toUpperCase()} {selectedYear}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Market Dropdown */}
              <div className="w-36 sm:w-44">
                <Select
                  value={selectedMarket}
                  onValueChange={(val) => {
                    setSelectedMarket(val);
                    setSortCol(null);
                  }}
                  disabled={isLoadingMarkets}
                >
                  <SelectTrigger
                    id="market-select"
                    className="bg-white text-zinc-900 font-bold text-xs h-9 border-0 shadow-sm focus:ring-amber-400"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <SelectValue placeholder="Market" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {markets.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Dropdown (Current -2 to +2 years) */}
              <div className="w-28 sm:w-32">
                <Select
                  value={selectedYear}
                  onValueChange={(val) => {
                    setSelectedYear(val);
                    setSortCol(null);
                  }}
                >
                  <SelectTrigger
                    id="year-select"
                    className="bg-white text-zinc-900 font-bold text-xs h-9 border-0 shadow-sm focus:ring-amber-400"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <SelectValue placeholder="Year" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {yearOptions.map((yr) => (
                      <SelectItem key={yr} value={yr}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Dropdown (Static 12 Months) */}
              <div className="w-32 sm:w-36">
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(val) => {
                    setSelectedMonth(Number(val));
                    setSortCol(null);
                  }}
                >
                  <SelectTrigger
                    id="month-select"
                    className="bg-white text-zinc-900 font-bold text-xs h-9 border-0 shadow-sm focus:ring-amber-400"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <CalendarDays className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <SelectValue placeholder="Month" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {MONTH_OPTIONS.map((mo) => (
                      <SelectItem key={mo.value} value={String(mo.value)}>
                        {mo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Store Name / Manager Input */}
              <div className="relative w-44 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                <Input
                  id="store-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search store or manager..."
                  className="bg-white text-zinc-900 placeholder:text-zinc-400 pl-8 h-9 text-xs font-medium border-0 shadow-sm focus-visible:ring-amber-400"
                />
              </div>

              {/* Refresh Button */}
              <Button
                id="refresh-data-btn"
                variant="outline"
                size="sm"
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={isLoadingData}
                className="h-9 px-2.5 text-xs bg-zinc-800/80 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                title="Refresh Data"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingData ? "animate-spin text-amber-400" : ""}`}
                />
              </Button>

              {/* Reset Button */}
              <Button
                id="reset-filters-btn"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2.5 text-xs bg-zinc-800/80 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                title="Reset Filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* 2 Tabs Pill Selector */}
        <div className="flex items-center gap-2">
          {/* Tab 1: Summary */}
          <button
            id="tab-summary"
            onClick={() => {
              setActiveTab("SUMMARY");
              setSortCol(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-200 shadow-xs ${
              activeTab === "SUMMARY"
                ? "bg-amber-400 text-zinc-950 ring-2 ring-amber-500/50 shadow-amber-400/20 shadow-md transform scale-[1.02]"
                : "bg-card text-foreground hover:bg-muted/80 border border-border/80 hover:border-amber-400/50"
            }`}
          >
            <FileSpreadsheet
              className={`w-4 h-4 ${activeTab === "SUMMARY" ? "text-zinc-950" : "text-amber-500"}`}
            />
            <span>SUMMARY</span>
            {summaryRows.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === "SUMMARY"
                    ? "bg-zinc-950/20 text-zinc-950"
                    : "bg-amber-400/20 text-amber-600 dark:text-amber-400"
                }`}
              >
                {filteredSummaryData.length}
              </span>
            )}
          </button>

          {/* Tab 2: DCS vs RTBDI */}
          <button
            id="tab-dcs-vs-rtbdi"
            onClick={() => {
              setActiveTab("DCS_VS_RTBDI");
              setSortCol(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-200 shadow-xs ${
              activeTab === "DCS_VS_RTBDI"
                ? "bg-amber-400 text-zinc-950 ring-2 ring-amber-500/50 shadow-amber-400/20 shadow-md transform scale-[1.02]"
                : "bg-card text-foreground hover:bg-muted/80 border border-border/80 hover:border-amber-400/50"
            }`}
          >
            <GitCompare
              className={`w-4 h-4 ${activeTab === "DCS_VS_RTBDI" ? "text-zinc-950" : "text-amber-500"}`}
            />
            <span>DCS VS RTBDI</span>
            {dcsRows.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === "DCS_VS_RTBDI"
                    ? "bg-zinc-950/20 text-zinc-950"
                    : "bg-amber-400/20 text-amber-600 dark:text-amber-400"
                }`}
              >
                {filteredDcsData.length}
              </span>
            )}
          </button>
        </div>

        {/* Error Alert if any */}
        {dataError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dataError}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="h-7 text-xs border-destructive/30 hover:bg-destructive/20 text-destructive"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Data Table Container */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[750px] relative scrollbar-thin scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-700">
            <table className="w-full text-xs border-collapse">
              {/* TAB 1: SUMMARY TABLE HEADERS */}
              {activeTab === "SUMMARY" ? (
                <thead>
                  {/* Header Row 1: High Level Groupings */}
                  <tr className="bg-zinc-100 dark:bg-zinc-900 text-foreground border-b border-border text-[11px] font-bold tracking-wider uppercase">
                    {/* Sticky Store / Manager */}
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-20 bg-zinc-100 dark:bg-zinc-900 px-4 py-3 text-left min-w-[200px] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSort("store")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSort("store");
                          }
                        }}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-amber-600 transition-colors"
                      >
                        <span>STORE / MANAGER</span>
                        {sortCol === "store" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </th>

                    {/* FULL MONTH */}
                    <th
                      colSpan={4}
                      className="px-3 py-2 text-center border-r border-border bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200"
                    >
                      FULL MONTH
                    </th>

                    {/* MONTH TO DATE */}
                    <th
                      colSpan={4}
                      className="px-3 py-2 text-center border-r border-border bg-blue-50/60 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200"
                    >
                      MONTH TO DATE
                    </th>

                    {/* VOICE */}
                    <th
                      colSpan={4}
                      className="px-3 py-2 text-center border-r border-border bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200"
                    >
                      VOICE
                    </th>

                    {/* UPGRADE */}
                    <th
                      colSpan={4}
                      className="px-3 py-2 text-center border-r border-border bg-purple-50/60 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200"
                    >
                      UPGRADE
                    </th>

                    {/* BTS */}
                    <th
                      colSpan={4}
                      className="px-3 py-2 text-center border-r border-border bg-cyan-50/60 dark:bg-cyan-950/30 text-cyan-950 dark:text-cyan-200"
                    >
                      BTS
                    </th>

                    {/* HSI */}
                    <th
                      colSpan={4}
                      className="px-3 py-2 text-center border-r border-border bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200"
                    >
                      HSI
                    </th>

                    {/* MIM */}
                    <th
                      colSpan={4}
                      className="px-3 py-2 text-center border-r border-border bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200"
                    >
                      MIM
                    </th>

                    {/* ACC */}
                    <th
                      colSpan={4}
                      className="px-3 py-2 text-center bg-orange-50/60 dark:bg-orange-950/30 text-orange-950 dark:text-orange-200"
                    >
                      ACC
                    </th>
                  </tr>

                  {/* Header Row 2: Sub-headers (Tgt, Act, Diff, %) */}
                  <tr className="bg-muted/60 dark:bg-zinc-900/60 text-muted-foreground border-b border-border/80 text-[10px] font-semibold">
                    {/* Under FULL MONTH */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Act</th>
                    <th className="px-2 py-1.5 text-center">Diff</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("fullMonthPct")}
                    >
                      %
                    </th>

                    {/* Under MONTH TO DATE */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Act</th>
                    <th className="px-2 py-1.5 text-center">Diff</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("mtdPct")}
                    >
                      %
                    </th>

                    {/* Under VOICE */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Act</th>
                    <th className="px-2 py-1.5 text-center">Diff</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("voicePct")}
                    >
                      %
                    </th>

                    {/* Under UPGRADE */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Act</th>
                    <th className="px-2 py-1.5 text-center">Diff</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("upgradePct")}
                    >
                      %
                    </th>

                    {/* Under BTS */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Act</th>
                    <th className="px-2 py-1.5 text-center">Diff</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("btsPct")}
                    >
                      %
                    </th>

                    {/* Under HSI */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Act</th>
                    <th className="px-2 py-1.5 text-center">Diff</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("hsiPct")}
                    >
                      %
                    </th>

                    {/* Under MIM */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Act</th>
                    <th className="px-2 py-1.5 text-center">Diff</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("mimPct")}
                    >
                      %
                    </th>

                    {/* Under ACC */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Act</th>
                    <th className="px-2 py-1.5 text-center">Diff</th>
                    <th
                      className="px-2 py-1.5 text-center cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("accPct")}
                    >
                      %
                    </th>
                  </tr>
                </thead>
              ) : (
                /* TAB 2: DCS VS RTBDI TABLE HEADERS */
                <thead>
                  {/* Header Row 1: High Level Groupings */}
                  <tr className="bg-zinc-100 dark:bg-zinc-900 text-foreground border-b border-border text-[11px] font-bold tracking-wider uppercase">
                    {/* Sticky Store / Manager */}
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-20 bg-zinc-100 dark:bg-zinc-900 px-4 py-3 text-left min-w-[200px] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSort("store")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSort("store");
                          }
                        }}
                        className="flex items-center gap-1.5 cursor-pointer hover:text-amber-600 transition-colors"
                      >
                        <span>STORE / MANAGER</span>
                        {sortCol === "store" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </th>

                    {/* FMTD ACHIEVEMENT */}
                    <th
                      colSpan={5}
                      className="px-3 py-2 text-center border-r border-border bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200"
                    >
                      FMTD ACHIEVEMENT
                    </th>

                    {/* VOICE */}
                    <th
                      colSpan={5}
                      className="px-3 py-2 text-center border-r border-border bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200"
                    >
                      VOICE
                    </th>

                    {/* BTS */}
                    <th
                      colSpan={5}
                      className="px-3 py-2 text-center border-r border-border bg-cyan-50/60 dark:bg-cyan-950/30 text-cyan-950 dark:text-cyan-200"
                    >
                      BTS
                    </th>

                    {/* HSI */}
                    <th
                      colSpan={5}
                      className="px-3 py-2 text-center border-r border-border bg-amber-50/60 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200"
                    >
                      HSI
                    </th>

                    {/* MIM */}
                    <th
                      colSpan={5}
                      className="px-3 py-2 text-center bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200"
                    >
                      MIM
                    </th>
                  </tr>

                  {/* Header Row 2: Sub-headers (Tgt, Dcs, %, Rt, Diff) */}
                  <tr className="bg-muted/60 dark:bg-zinc-900/60 text-muted-foreground border-b border-border/80 text-[10px] font-semibold">
                    {/* Under FMTD ACHIEVEMENT */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Dcs</th>
                    <th
                      className="px-2 py-1.5 text-center cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("dcsFmtdPct")}
                    >
                      %
                    </th>
                    <th className="px-2 py-1.5 text-center">Rt</th>
                    <th className="px-2 py-1.5 text-center border-r border-border">Diff</th>

                    {/* Under VOICE */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Dcs</th>
                    <th
                      className="px-2 py-1.5 text-center cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("dcsVoicePct")}
                    >
                      %
                    </th>
                    <th className="px-2 py-1.5 text-center">Rt</th>
                    <th className="px-2 py-1.5 text-center border-r border-border">Diff</th>

                    {/* Under BTS */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Dcs</th>
                    <th
                      className="px-2 py-1.5 text-center cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("dcsBtsPct")}
                    >
                      %
                    </th>
                    <th className="px-2 py-1.5 text-center">Rt</th>
                    <th className="px-2 py-1.5 text-center border-r border-border">Diff</th>

                    {/* Under HSI */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Dcs</th>
                    <th
                      className="px-2 py-1.5 text-center cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("dcsHsiPct")}
                    >
                      %
                    </th>
                    <th className="px-2 py-1.5 text-center">Rt</th>
                    <th className="px-2 py-1.5 text-center border-r border-border">Diff</th>

                    {/* Under MIM */}
                    <th className="px-2 py-1.5 text-center">Tgt</th>
                    <th className="px-2 py-1.5 text-center">Dcs</th>
                    <th
                      className="px-2 py-1.5 text-center cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("dcsMimPct")}
                    >
                      %
                    </th>
                    <th className="px-2 py-1.5 text-center">Rt</th>
                    <th className="px-2 py-1.5 text-center">Diff</th>
                  </tr>
                </thead>
              )}

              {/* TABLE BODY */}
              <tbody className="divide-y divide-border">
                {isLoadingData ? (
                  <tr>
                    <td
                      colSpan={activeTab === "SUMMARY" ? 33 : 26}
                      className="py-20 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                        <p className="text-sm font-medium">
                          Loading Special Report for {selectedMarket}...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : activeTab === "SUMMARY" ? (
                  filteredSummaryData.length === 0 ? (
                    <tr>
                      <td colSpan={33} className="py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Store className="w-8 h-8 text-muted-foreground/40" />
                          <p className="text-sm font-semibold text-foreground">No records found</p>
                          <p className="text-xs">
                            No summary achievements found for {selectedMarket} in{" "}
                            {selectedMonthName} {selectedYear}.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* TAB 1: SUMMARY DATA ROWS */
                    filteredSummaryData.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`group transition-colors ${
                          index % 2 === 1
                            ? "bg-zinc-50/80 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            : "bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {/* Sticky Store & Manager Cell */}
                        <td
                          className={`sticky left-0 z-10 px-4 py-2.5 border-r border-border whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] transition-colors ${
                            index % 2 === 1
                              ? "bg-zinc-50 dark:bg-zinc-900 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
                              : "bg-white dark:bg-zinc-950 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
                          }`}
                        >
                          <div className="font-bold text-foreground text-xs tracking-tight uppercase">
                            {row.store}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                              {row.manager}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase font-semibold">
                              {row.market}
                            </span>
                          </div>
                        </td>

                        {/* FULL MONTH (Tgt, Act, Diff, %) */}
                        <td className="px-2 py-2 text-center font-mono">
                          {row.fullMonth.tgt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold">
                          {row.fullMonth.act.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">
                          {renderDiff(row.fullMonth.diff)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderPctBadge(row.fullMonth.pct)}
                        </td>

                        {/* MONTH TO DATE (Tgt, Act, Diff, %) */}
                        <td className="px-2 py-2 text-center font-mono">
                          {row.mtd.tgt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold">
                          {row.mtd.act.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">
                          {renderDiff(row.mtd.diff)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderPctBadge(row.mtd.pct)}
                        </td>

                        {/* VOICE (Tgt, Act, Diff, %) */}
                        <td className="px-2 py-2 text-center font-mono">
                          {row.voice.tgt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold">
                          {row.voice.act.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">
                          {renderDiff(row.voice.diff)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderPctBadge(row.voice.pct)}
                        </td>

                        {/* UPGRADE (Tgt, Act, Diff, %) */}
                        <td className="px-2 py-2 text-center font-mono">
                          {row.upgrade.tgt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold">
                          {row.upgrade.act.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">
                          {renderDiff(row.upgrade.diff)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderPctBadge(row.upgrade.pct)}
                        </td>

                        {/* BTS (Tgt, Act, Diff, %) */}
                        <td className="px-2 py-2 text-center font-mono">
                          {row.bts.tgt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold">
                          {row.bts.act.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">
                          {renderDiff(row.bts.diff)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderPctBadge(row.bts.pct)}
                        </td>

                        {/* HSI (Tgt, Act, Diff, %) */}
                        <td className="px-2 py-2 text-center font-mono">
                          {row.hsi.tgt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold">
                          {row.hsi.act.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">
                          {renderDiff(row.hsi.diff)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderPctBadge(row.hsi.pct)}
                        </td>

                        {/* MIM (Tgt, Act, Diff, %) */}
                        <td className="px-2 py-2 text-center font-mono">
                          {row.mim.tgt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold">
                          {row.mim.act.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">
                          {renderDiff(row.mim.diff)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderPctBadge(row.mim.pct)}
                        </td>

                        {/* ACC (Tgt, Act, Diff, %) */}
                        <td className="px-2 py-2 text-center font-mono">
                          {row.acc.tgt.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold">
                          {row.acc.act.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">
                          {renderDiff(row.acc.diff)}
                        </td>
                        <td className="px-2 py-2 text-center">{renderPctBadge(row.acc.pct)}</td>
                      </tr>
                    ))
                  )
                ) : filteredDcsData.length === 0 ? (
                  <tr>
                    <td colSpan={26} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <GitCompare className="w-8 h-8 text-muted-foreground/40" />
                        <p className="text-sm font-semibold text-foreground">No records found</p>
                        <p className="text-xs">
                          No DCS vs RTBDI achievements found for {selectedMarket} in{" "}
                          {selectedMonthName} {selectedYear}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* TAB 2: DCS VS RTBDI DATA ROWS */
                  filteredDcsData.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`group transition-colors ${
                        index % 2 === 1
                          ? "bg-zinc-50/80 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          : "bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {/* Sticky Store & Manager Cell */}
                      <td
                        className={`sticky left-0 z-10 px-4 py-2.5 border-r border-border whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] transition-colors ${
                          index % 2 === 1
                            ? "bg-zinc-50 dark:bg-zinc-900 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
                            : "bg-white dark:bg-zinc-950 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
                        }`}
                      >
                        <div className="font-bold text-foreground text-xs tracking-tight uppercase">
                          {row.store}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                            {row.manager}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase font-semibold">
                            {row.market}
                          </span>
                        </div>
                      </td>

                      {/* FMTD ACHIEVEMENT (Tgt, Dcs, %, Rt, Diff) */}
                      <td className="px-2 py-2 text-center font-mono">
                        {row.fmtdAch.tgt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.fmtdAch.dcs.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">{renderPctBadge(row.fmtdAch.pct)}</td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.fmtdAch.rt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono border-r border-border">
                        {renderDiff(row.fmtdAch.diff)}
                      </td>

                      {/* VOICE (Tgt, Dcs, %, Rt, Diff) */}
                      <td className="px-2 py-2 text-center font-mono">
                        {row.voice.tgt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.voice.dcs.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">{renderPctBadge(row.voice.pct)}</td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.voice.rt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono border-r border-border">
                        {renderDiff(row.voice.diff)}
                      </td>

                      {/* BTS (Tgt, Dcs, %, Rt, Diff) */}
                      <td className="px-2 py-2 text-center font-mono">
                        {row.bts.tgt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.bts.dcs.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">{renderPctBadge(row.bts.pct)}</td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.bts.rt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono border-r border-border">
                        {renderDiff(row.bts.diff)}
                      </td>

                      {/* HSI (Tgt, Dcs, %, Rt, Diff) */}
                      <td className="px-2 py-2 text-center font-mono">
                        {row.hsi.tgt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.hsi.dcs.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">{renderPctBadge(row.hsi.pct)}</td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.hsi.rt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono border-r border-border">
                        {renderDiff(row.hsi.diff)}
                      </td>

                      {/* MIM (Tgt, Dcs, %, Rt, Diff) */}
                      <td className="px-2 py-2 text-center font-mono">
                        {row.mim.tgt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.mim.dcs.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center">{renderPctBadge(row.mim.pct)}</td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.mim.rt.toLocaleString()}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.mim.diff)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ConfettiBackground>
  );
}
