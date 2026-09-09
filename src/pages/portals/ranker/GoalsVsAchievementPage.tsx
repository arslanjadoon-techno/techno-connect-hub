import React, { useState, useMemo, useEffect } from "react";
import { ConfettiBackground } from "@/components/confetti-background";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Store,
  Calendar,
  Flame,
  Layers,
  Search,
  ShoppingBag,
  Phone,
  Wifi,
  Smartphone,
  TrendingUp,
  CreditCard,
  Receipt,
  UserPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Download,
} from "lucide-react";
import { toast } from "sonner";

// Metric definition
export type MetricKey =
  | "ACCESSORIES"
  | "VOICE"
  | "HSI"
  | "BTS"
  | "UPGRADES"
  | "MIM"
  | "AFFIRM"
  | "BYOD"
  | "TOTAL ACHIEVEMENTS";

interface MetricTab {
  key: MetricKey;
  label: string;
  icon: React.ElementType;
}

const METRIC_TABS: MetricTab[] = [
  { key: "ACCESSORIES", label: "ACCESSORIES", icon: ShoppingBag },
  { key: "VOICE", label: "VOICE", icon: Phone },
  { key: "HSI", label: "HSI", icon: Wifi },
  { key: "BTS", label: "BTS", icon: Smartphone },
  { key: "UPGRADES", label: "UPGRADES", icon: TrendingUp },
  { key: "MIM", label: "MIM", icon: CreditCard },
  { key: "AFFIRM", label: "AFFIRM", icon: Receipt },
  { key: "BYOD", label: "BYOD", icon: UserPlus },
  { key: "TOTAL ACHIEVEMENTS", label: "TOTAL ACHIEVEMENTS", icon: Trophy },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_ABBRS: Record<string, string> = {
  January: "Jan",
  February: "Feb",
  March: "Mar",
  April: "Apr",
  May: "May",
  June: "Jun",
  July: "Jul",
  August: "Aug",
  September: "Sep",
  October: "Oct",
  November: "Nov",
  December: "Dec",
};

export interface WeekDefinition {
  id: string;
  label: string;
  weekNum: number;
  startDay: number;
  endDay: number;
}

/**
 * Calculates weeks covering the entire month dynamically.
 * e.g., September (30 days):
 *   Week 1 (Sep 1 to 7)
 *   Week 2 (Sep 8 to 14)
 *   Week 3 (Sep 15 to 21)
 *   Week 4 (Sep 22 to 28)
 *   Week 5 (Sep 29 to 30)
 * e.g., October (31 days):
 *   Week 1 (Oct 1 to 7)
 *   ...
 *   Week 5 (Oct 29 to 31)
 */
export function getWeeksForMonth(yearStr: string, monthStr: string): WeekDefinition[] {
  const year = parseInt(yearStr, 10) || 2026;
  const monthIndex = MONTH_NAMES.indexOf(monthStr);
  const mIdx = monthIndex >= 0 ? monthIndex : 8; // Default September
  const abbr = MONTH_ABBRS[monthStr] || monthStr.slice(0, 3);

  const totalDays = new Date(year, mIdx + 1, 0).getDate();

  const weeks: WeekDefinition[] = [];
  let start = 1;
  let weekNum = 1;

  while (start <= totalDays) {
    const end = Math.min(start + 6, totalDays);
    weeks.push({
      id: `week-${weekNum}`,
      label: `Week ${weekNum} (${abbr} ${start} to ${end})`,
      weekNum,
      startDay: start,
      endDay: end,
    });
    start += 7;
    weekNum++;
  }

  return weeks;
}

export interface DayMetric {
  dayNum: number;
  dayName: string;
  dateStr: string;
  tgt: number;
  act: number;
  pct: number;
}

export interface StoreGoalRecord {
  id: string;
  store: string;
  manager: string;
  market: string;
  mtd: { tgt: number; act: number; pct: number };
  fullMtd: { tgt: number; act: number; pct: number };
  days: DayMetric[];
  weekly: { tgt: number; act: number; pct: number };
}

// Stores catalog
const BASE_STORE_LIST = [
  { id: "az-1", store: "N ARIZONA AVE", manager: "ALI KHAN", baseVolume: 1.1 },
  { id: "az-2", store: "3202 E GREENWAY RD", manager: "ALI KHAN", baseVolume: 0.65 },
  { id: "az-3", store: "W VAN BUREN ST", manager: "ALI KHAN", baseVolume: 1.95 },
  { id: "az-4", store: "6430 W GLENDALE AVE", manager: "ALI KHAN", baseVolume: 0.8 },
  { id: "az-5", store: "N 75TH AVE", manager: "ALI KHAN", baseVolume: 1.15 },
  { id: "az-6", store: "8129 NORTH 35TH AVENUE", manager: "ALI KHAN", baseVolume: 0.55 },
  { id: "az-7", store: "SCOTTSDALE PAVILIONS", manager: "SARAH JENKINS", baseVolume: 1.4 },
  { id: "az-8", store: "CAMELBACK COLONNADE", manager: "MARCUS VANCE", baseVolume: 1.0 },
  { id: "az-9", store: "CHANDLER FASHION CENTER", manager: "ELENA ROSTOVA", baseVolume: 1.25 },
  { id: "az-10", store: "MESA GRAND SHOPPING", manager: "RAUL ORTIZ", baseVolume: 0.9 },
  { id: "az-11", store: "TUCSON MALL NORTH", manager: "KAREN PATEL", baseVolume: 1.05 },
];

// Generates data dynamically based on the current week and category
function generateDynamicStoreData(
  category: MetricKey,
  market: string,
  yearStr: string,
  monthStr: string,
  weekDef: WeekDefinition,
): StoreGoalRecord[] {
  const year = parseInt(yearStr, 10) || 2026;
  const monthIndex = MONTH_NAMES.indexOf(monthStr);
  const mIdx = monthIndex >= 0 ? monthIndex : 8;
  const abbr = MONTH_ABBRS[monthStr] || monthStr.slice(0, 3);

  const multiplierMap: Record<MetricKey, number> = {
    ACCESSORIES: 1,
    VOICE: 0.35,
    HSI: 0.18,
    BTS: 0.22,
    UPGRADES: 0.45,
    MIM: 0.15,
    AFFIRM: 0.28,
    BYOD: 0.12,
    "TOTAL ACHIEVEMENTS": 2.4,
  };

  const catMult = multiplierMap[category] || 1;

  // Days in selected week
  const daysInfo: { dayNum: number; dayName: string; dateStr: string }[] = [];
  for (let d = weekDef.startDay; d <= weekDef.endDay; d++) {
    const dateObj = new Date(year, mIdx, d);
    const dayName = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dateObj.getDay()];
    const dateStr = `${abbr.toUpperCase()} ${d}`;
    daysInfo.push({ dayNum: d, dayName, dateStr });
  }

  return BASE_STORE_LIST.map((store, sIdx) => {
    // Seed variance based on store & day
    const days: DayMetric[] = daysInfo.map((info, dIdx) => {
      // Base daily target roughly 500-800 scaled by volume and category
      const baseDailyTgt = Math.round(
        (550 + ((sIdx * 43 + dIdx * 37) % 300)) * store.baseVolume * catMult,
      );

      // Performance factor (some stores perform high, some low, mirroring the screenshot)
      let perfFactor = 0.95;
      if (sIdx === 0) {
        perfFactor = [0.85, 0.34, 0.19, 1.56, 1.68, 1.27, 0.89][dIdx % 7] ?? 1.1;
      } else if (sIdx === 1) {
        perfFactor = [0.09, 0.33, 0.42, 0.1, 0.23, 1.0, 0.23][dIdx % 7] ?? 0.4;
      } else if (sIdx === 2) {
        perfFactor = [0.4, 0.46, 0.93, 0.31, 1.18, 0.32, 0.34][dIdx % 7] ?? 0.6;
      } else if (sIdx === 3) {
        perfFactor = [0.76, 0.8, 1.79, 3.27, 0.74, 0.88, 0.31][dIdx % 7] ?? 1.2;
      } else if (sIdx === 4) {
        perfFactor = [1.3, 1.7, 0.86, 1.86, 0.22, 0.93, 0.36][dIdx % 7] ?? 1.05;
      } else {
        perfFactor = 0.5 + ((sIdx * 29 + dIdx * 41) % 110) / 100;
      }

      if (category === "AFFIRM") {
        // For Affirm: Inv = invoices, Fin = financed transactions, Non-Fin = non-financed (Inv - Fin)
        const dailyFin = Math.max(
          1,
          Math.min(baseDailyTgt, Math.round(baseDailyTgt * Math.min(0.65, perfFactor * 0.42))),
        );
        const dailyNonFin = Math.max(0, baseDailyTgt - dailyFin);
        return {
          dayNum: info.dayNum,
          dayName: info.dayName,
          dateStr: info.dateStr,
          tgt: baseDailyTgt, // Inv
          act: dailyFin, // Fin
          pct: dailyNonFin, // Non-Fin
        };
      }

      const dailyAct = Math.max(1, Math.round(baseDailyTgt * perfFactor));
      const dailyPct = Math.round((dailyAct / baseDailyTgt) * 100);

      return {
        dayNum: info.dayNum,
        dayName: info.dayName,
        dateStr: info.dateStr,
        tgt: baseDailyTgt,
        act: dailyAct,
        pct: dailyPct,
      };
    });

    const isAffirm = category === "AFFIRM";
    const weeklyTgt = days.reduce((sum, d) => sum + d.tgt, 0);
    const weeklyAct = days.reduce((sum, d) => sum + d.act, 0);
    const weeklyPct = isAffirm
      ? Math.max(0, weeklyTgt - weeklyAct) // Non-Fin
      : weeklyTgt > 0
        ? Math.round((weeklyAct / weeklyTgt) * 100)
        : 0;

    // MTD and Full MTD (calculated proportionally to month progress)
    const totalDaysInMonth = new Date(year, mIdx + 1, 0).getDate();
    const fullMtdTgt = Math.round(weeklyTgt * (totalDaysInMonth / Math.max(1, days.length)));
    const mtdFactor = Math.min(1, weekDef.endDay / totalDaysInMonth);
    const mtdTgt = Math.max(weeklyTgt, Math.round(fullMtdTgt * mtdFactor));
    const mtdAct = isAffirm ? Math.round(mtdTgt * 0.38) : Math.round(mtdTgt * (weeklyPct / 100));
    const mtdPct = isAffirm
      ? Math.max(0, mtdTgt - mtdAct) // Non-Fin
      : mtdTgt > 0
        ? Math.round((mtdAct / mtdTgt) * 100)
        : 0;

    const fullMtdAct = isAffirm ? Math.round(fullMtdTgt * 0.38) : mtdAct;
    const fullMtdPct = isAffirm ? Math.max(0, fullMtdTgt - fullMtdAct) : mtdPct;

    return {
      id: store.id,
      store: store.store,
      manager: store.manager,
      market,
      mtd: { tgt: mtdTgt, act: mtdAct, pct: mtdPct },
      fullMtd: { tgt: fullMtdTgt, act: fullMtdAct, pct: fullMtdPct },
      days,
      weekly: { tgt: weeklyTgt, act: weeklyAct, pct: weeklyPct },
    };
  });
}

function renderThirdColumn(val: number, isAffirm: boolean) {
  if (isAffirm) {
    return (
      <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-xs min-w-[46px] shadow-2xs bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
        {val}
      </span>
    );
  }

  let badgeClass = "";
  if (val >= 100) {
    badgeClass =
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50";
  } else if (val >= 60) {
    badgeClass =
      "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/50";
  } else {
    badgeClass =
      "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/50";
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-xs min-w-[46px] shadow-2xs ${badgeClass}`}
    >
      {val}%
    </span>
  );
}

type SortColumn = "store" | "mtdPct" | "fullMtdPct" | "weeklyPct";
type SortDirection = "asc" | "desc" | "normal";

export default function GoalsVsAchievementPage() {
  const [selectedMarket, setSelectedMarket] = useState<string>("ARIZONA");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("September");
  const [activeCategory, setActiveCategory] = useState<MetricKey>("ACCESSORIES");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dynamic weeks covering the entire selected month
  const availableWeeks = useMemo(() => {
    return getWeeksForMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const [selectedWeekId, setSelectedWeekId] = useState<string>("week-1");

  // If month changes and current selectedWeekId does not exist, fallback to first available week
  useEffect(() => {
    const exists = availableWeeks.some((w) => w.id === selectedWeekId);
    if (!exists && availableWeeks.length > 0) {
      setSelectedWeekId(availableWeeks[0].id);
    }
  }, [availableWeeks, selectedWeekId]);

  const activeWeekDef = useMemo(() => {
    return (
      availableWeeks.find((w) => w.id === selectedWeekId) ||
      availableWeeks[0] || {
        id: "week-1",
        label: "Week 1",
        weekNum: 1,
        startDay: 1,
        endDay: 7,
      }
    );
  }, [availableWeeks, selectedWeekId]);

  // Sorting
  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("normal");

  const rawData = useMemo(() => {
    return generateDynamicStoreData(
      activeCategory,
      selectedMarket,
      selectedYear,
      selectedMonth,
      activeWeekDef,
    );
  }, [activeCategory, selectedMarket, selectedYear, selectedMonth, activeWeekDef]);

  const handleSort = (col: SortColumn) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("asc");
    } else {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortCol(null);
        setSortDir("normal");
      } else {
        setSortCol(col);
        setSortDir("asc");
      }
    }
  };

  const filteredData = useMemo(() => {
    let list = [...rawData];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) => item.store.toLowerCase().includes(q) || item.manager.toLowerCase().includes(q),
      );
    }

    if (sortCol && sortDir !== "normal") {
      list.sort((a, b) => {
        let valA = 0;
        let valB = 0;
        if (sortCol === "store") {
          return sortDir === "asc"
            ? a.store.localeCompare(b.store)
            : b.store.localeCompare(a.store);
        }
        if (sortCol === "mtdPct") {
          valA = a.mtd.pct;
          valB = b.mtd.pct;
        } else if (sortCol === "fullMtdPct") {
          valA = a.fullMtd.pct;
          valB = b.fullMtd.pct;
        } else if (sortCol === "weeklyPct") {
          valA = a.weekly.pct;
          valB = b.weekly.pct;
        }
        return sortDir === "asc" ? valA - valB : valB - valA;
      });
    }

    return list;
  }, [rawData, searchQuery, sortCol, sortDir]);

  // Total row aggregates
  const totalRow = useMemo(() => {
    if (filteredData.length === 0 || !filteredData[0]?.days) return null;

    const isAffirm = activeCategory === "AFFIRM";
    const mtdTgt = filteredData.reduce((sum, r) => sum + r.mtd.tgt, 0);
    const mtdAct = filteredData.reduce((sum, r) => sum + r.mtd.act, 0);
    const mtdPct = isAffirm
      ? Math.max(0, mtdTgt - mtdAct)
      : mtdTgt > 0
        ? Math.round((mtdAct / mtdTgt) * 100)
        : 0;

    const fullMtdTgt = filteredData.reduce((sum, r) => sum + r.fullMtd.tgt, 0);
    const fullMtdAct = filteredData.reduce((sum, r) => sum + r.fullMtd.act, 0);
    const fullMtdPct = isAffirm
      ? Math.max(0, fullMtdTgt - fullMtdAct)
      : fullMtdTgt > 0
        ? Math.round((fullMtdAct / fullMtdTgt) * 100)
        : 0;

    const dayTotals = filteredData[0].days.map((_, dayIdx) => {
      const dt = filteredData.reduce((sum, r) => sum + (r.days[dayIdx]?.tgt || 0), 0);
      const da = filteredData.reduce((sum, r) => sum + (r.days[dayIdx]?.act || 0), 0);
      const dp = isAffirm ? Math.max(0, dt - da) : dt > 0 ? Math.round((da / dt) * 100) : 0;
      return { tgt: dt, act: da, pct: dp };
    });

    const weeklyTgt = filteredData.reduce((sum, r) => sum + r.weekly.tgt, 0);
    const weeklyAct = filteredData.reduce((sum, r) => sum + r.weekly.act, 0);
    const weeklyPct = isAffirm
      ? Math.max(0, weeklyTgt - weeklyAct)
      : weeklyTgt > 0
        ? Math.round((weeklyAct / weeklyTgt) * 100)
        : 0;

    return {
      mtdTgt,
      mtdAct,
      mtdPct,
      fullMtdTgt,
      fullMtdAct,
      fullMtdPct,
      dayTotals,
      weeklyTgt,
      weeklyAct,
      weeklyPct,
    };
  }, [filteredData, activeCategory]);

  const handleResetFilters = () => {
    setSelectedMarket("ARIZONA");
    setSelectedYear("2026");
    setSelectedMonth("September");
    setSelectedWeekId("week-1");
    setSearchQuery("");
    setActiveCategory("ACCESSORIES");
    setSortCol(null);
    setSortDir("normal");
    toast.success("Filters reset to default");
  };

  const handleExportCSV = () => {
    const isAffirm = activeCategory === "AFFIRM";
    const subCol1 = isAffirm ? "Inv" : "Target";
    const subCol2 = isAffirm ? "Fin" : "Actual";
    const subCol3 = isAffirm ? "Non-Fin" : "%";

    const dayHeaders = (rawData[0]?.days || []).flatMap((d) => [
      `${d.dayName} ${d.dateStr} ${subCol1}`,
      `${d.dayName} ${d.dateStr} ${subCol2}`,
      `${d.dayName} ${d.dateStr} ${subCol3}`,
    ]);

    const headers = [
      "Store",
      "Manager",
      "Market",
      `MTD ${subCol1}`,
      `MTD ${subCol2}`,
      `MTD ${subCol3}`,
      `Full MTD ${subCol1}`,
      `Full MTD ${subCol2}`,
      `Full MTD ${subCol3}`,
      ...dayHeaders,
      `Weekly ${subCol1}`,
      `Weekly ${subCol2}`,
      `Weekly ${subCol3}`,
    ];

    const rows = filteredData.map((r) => [
      `"${r.store}"`,
      `"${r.manager}"`,
      `"${r.market}"`,
      r.mtd.tgt,
      r.mtd.act,
      isAffirm ? r.mtd.pct : `${r.mtd.pct}%`,
      r.fullMtd.tgt,
      r.fullMtd.act,
      isAffirm ? r.fullMtd.pct : `${r.fullMtd.pct}%`,
      ...r.days.flatMap((d) => [d.tgt, d.act, isAffirm ? d.pct : `${d.pct}%`]),
      r.weekly.tgt,
      r.weekly.act,
      isAffirm ? r.weekly.pct : `${r.weekly.pct}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Goals_vs_Achievement_${selectedMarket}_${selectedMonth}_${activeWeekDef.label.replace(/[^a-zA-Z0-9]/g, "_")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export downloaded successfully");
  };

  const isAffirm = activeCategory === "AFFIRM";
  const subCol1 = isAffirm ? "Inv" : "TGT";
  const subCol2 = isAffirm ? "Fin" : "ACT";
  const subCol3 = isAffirm ? "Non-Fin" : "%";

  return (
    <ConfettiBackground>
      {/* 
        Container is isolated with max-w-full and overflow-x-hidden 
        to ensure the sidebar menu (fixed z-40) is NEVER overlapped by horizontal scroll 
      */}
      <div className="space-y-5 p-2 sm:p-4 max-w-full overflow-x-hidden animate-fade-in relative z-0">
        {/* Top Celebration Banner & Filter Card */}
        <div className="rounded-xl overflow-hidden shadow-lg border border-border/70 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white relative">
          <div className="absolute inset-0 bg-radial-at-t from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 relative z-10">
            {/* Title & Market Subtitle */}
            <div className="space-y-1 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase font-display text-white drop-shadow-sm">
                    WEEKLY BREAKDOWN
                  </h1>
                  <p className="text-xs font-semibold tracking-widest text-amber-400/95 uppercase">
                    MARKET: {selectedMarket}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Market Dropdown */}
              <div className="w-36">
                <Select value={selectedMarket} onValueChange={setSelectedMarket}>
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
                    <SelectItem value="ARIZONA">ARIZONA</SelectItem>
                    <SelectItem value="TEXAS">TEXAS</SelectItem>
                    <SelectItem value="FLORIDA">FLORIDA</SelectItem>
                    <SelectItem value="CALIFORNIA">CALIFORNIA</SelectItem>
                    <SelectItem value="NEVADA">NEVADA</SelectItem>
                    <SelectItem value="NEW YORK">NEW YORK</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Year Dropdown */}
              <div className="w-24">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
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
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Month Dropdown */}
              <div className="w-32">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger
                    id="month-select"
                    className="bg-white text-zinc-900 font-bold text-xs h-9 border-0 shadow-sm focus:ring-amber-400"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <SelectValue placeholder="Month" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-64">
                    {MONTH_NAMES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Week Dropdown covering the entire month */}
              <div className="w-52">
                <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
                  <SelectTrigger
                    id="week-select"
                    className="bg-white text-zinc-900 font-bold text-xs h-9 border-0 shadow-sm focus:ring-amber-400"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <SelectValue placeholder="Select Week" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {availableWeeks.map((week) => (
                      <SelectItem key={week.id} value={week.id}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Store Name Input */}
              <div className="relative w-44 sm:w-52">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                <Input
                  id="store-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search store name..."
                  className="bg-white text-zinc-900 placeholder:text-zinc-400 pl-8 h-9 text-xs font-medium border-0 shadow-sm focus-visible:ring-amber-400"
                />
              </div>

              {/* Reset & Export Buttons */}
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

              <Button
                id="export-csv-btn"
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-9 px-2.5 text-xs bg-zinc-800/80 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Category / Metric Tabs Row */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          {METRIC_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setActiveCategory(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-200 shrink-0 whitespace-nowrap shadow-xs ${
                  isActive
                    ? "bg-amber-400 text-zinc-950 ring-2 ring-amber-500/50 shadow-amber-400/20 shadow-md transform scale-[1.02]"
                    : "bg-card text-foreground hover:bg-muted/80 border border-border/80 hover:border-amber-400/50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-zinc-950" : "text-amber-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 
          Main MIS Multi-tier Data Table Card 
          With 'isolate' class to strictly isolate internal z-indices from the rest of the page 
        */}
        <Card className="border border-border/80 shadow-md bg-card/95 backdrop-blur-xs overflow-hidden isolate relative z-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-xs border-collapse">
                {/* Header Row 1: High Level Groupings */}
                <thead>
                  <tr className="bg-muted/90 dark:bg-zinc-900/90 text-foreground border-b border-border text-[11px] font-bold tracking-wider uppercase">
                    {/* Sticky Store / Manager Column scoped inside isolated card */}
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-20 bg-muted dark:bg-zinc-900 px-4 py-3 text-left min-w-[200px] border-r border-border shadow-xs"
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
                        {sortCol === "store" && sortDir !== "normal" ? (
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

                    {/* MTD */}
                    <th
                      colSpan={3}
                      className="px-3 py-2 text-center border-r border-border bg-blue-50/50 dark:bg-blue-950/20"
                    >
                      MTD
                    </th>

                    {/* FULL MTD */}
                    <th
                      colSpan={3}
                      className="px-3 py-2 text-center border-r border-border bg-indigo-50/50 dark:bg-indigo-950/20"
                    >
                      FULL MTD
                    </th>

                    {/* Dynamic Days of the Selected Week */}
                    {rawData[0]?.days.map((d, idx) => (
                      <th
                        key={idx}
                        colSpan={3}
                        className="px-3 py-2 text-center border-r border-border bg-muted/40"
                      >
                        <div className="font-bold text-foreground">{d.dayName}</div>
                        <div className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                          {d.dateStr}
                        </div>
                      </th>
                    ))}

                    {/* WEEKLY Summary */}
                    <th
                      colSpan={3}
                      className="px-3 py-2 text-center bg-amber-50/60 dark:bg-amber-950/20"
                    >
                      WEEKLY
                    </th>
                  </tr>

                  {/* Header Row 2: Sub-headers (TGT, ACT, % or Inv, Fin, Non-Fin for Affirm) */}
                  <tr className="bg-muted/60 dark:bg-zinc-900/60 text-muted-foreground border-b border-border/80 text-[10px] font-semibold">
                    {/* Under MTD */}
                    <th className="px-2 py-1.5 text-center">{subCol1}</th>
                    <th className="px-2 py-1.5 text-center">{subCol2}</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("mtdPct")}
                    >
                      {subCol3}
                    </th>

                    {/* Under FULL MTD */}
                    <th className="px-2 py-1.5 text-center">{subCol1}</th>
                    <th className="px-2 py-1.5 text-center">{subCol2}</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("fullMtdPct")}
                    >
                      {subCol3}
                    </th>

                    {/* Under Daily Days */}
                    {rawData[0]?.days.map((_, idx) => (
                      <React.Fragment key={idx}>
                        <th className="px-2 py-1.5 text-center">{subCol1}</th>
                        <th className="px-2 py-1.5 text-center">{subCol2}</th>
                        <th className="px-2 py-1.5 text-center border-r border-border">
                          {subCol3}
                        </th>
                      </React.Fragment>
                    ))}

                    {/* Under WEEKLY */}
                    <th className="px-2 py-1.5 text-center font-bold text-foreground">{subCol1}</th>
                    <th className="px-2 py-1.5 text-center font-bold text-foreground">{subCol2}</th>
                    <th
                      className="px-2 py-1.5 text-center font-bold text-foreground cursor-pointer hover:text-amber-600"
                      onClick={() => handleSort("weeklyPct")}
                    >
                      {subCol3}
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-border/60 font-medium">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7 + (rawData[0]?.days.length || 7) * 3}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No stores found matching "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-muted/50 dark:hover:bg-zinc-800/50 transition-colors ${
                          index % 2 === 1 ? "bg-muted/20 dark:bg-zinc-900/30" : "bg-card"
                        }`}
                      >
                        {/* Sticky Store & Manager Cell scoped inside isolated card */}
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 border-r border-border whitespace-nowrap shadow-xs">
                          <div className="font-bold text-foreground text-xs tracking-tight uppercase">
                            {row.store}
                          </div>
                          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                            {row.manager}
                          </div>
                        </td>

                        {/* MTD Metrics */}
                        <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                          {row.mtd.tgt}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {row.mtd.act}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderThirdColumn(row.mtd.pct, isAffirm)}
                        </td>

                        {/* FULL MTD Metrics */}
                        <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                          {row.fullMtd.tgt}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {row.fullMtd.act}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderThirdColumn(row.fullMtd.pct, isAffirm)}
                        </td>

                        {/* Dynamic Days Metrics */}
                        {row.days.map((day, dIdx) => (
                          <React.Fragment key={dIdx}>
                            <td className="px-2 py-2 text-center font-mono text-zinc-600 dark:text-zinc-400">
                              {day.tgt}
                            </td>
                            <td className="px-2 py-2 text-center font-mono font-medium text-zinc-900 dark:text-zinc-100">
                              {day.act}
                            </td>
                            <td className="px-2 py-2 text-center border-r border-border">
                              {renderThirdColumn(day.pct, isAffirm)}
                            </td>
                          </React.Fragment>
                        ))}

                        {/* WEEKLY Summary Metrics */}
                        <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {row.weekly.tgt}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {row.weekly.act}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {renderThirdColumn(row.weekly.pct, isAffirm)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Table Footer: Total / Summary Row */}
                {totalRow && (
                  <tfoot>
                    <tr className="bg-zinc-100 dark:bg-zinc-900 border-t-2 border-border font-bold text-foreground">
                      <td className="sticky left-0 z-10 bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border-r border-border text-left uppercase tracking-wider text-xs">
                        TOTAL / AVERAGE
                      </td>

                      {/* MTD Total */}
                      <td className="px-2 py-2 text-center font-mono">{totalRow.mtdTgt}</td>
                      <td className="px-2 py-2 text-center font-mono">{totalRow.mtdAct}</td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderThirdColumn(totalRow.mtdPct, isAffirm)}
                      </td>

                      {/* FULL MTD Total */}
                      <td className="px-2 py-2 text-center font-mono">{totalRow.fullMtdTgt}</td>
                      <td className="px-2 py-2 text-center font-mono">{totalRow.fullMtdAct}</td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderThirdColumn(totalRow.fullMtdPct, isAffirm)}
                      </td>

                      {/* Dynamic Days Totals */}
                      {totalRow.dayTotals.map((dt, dIdx) => (
                        <React.Fragment key={dIdx}>
                          <td className="px-2 py-2 text-center font-mono">{dt.tgt}</td>
                          <td className="px-2 py-2 text-center font-mono">{dt.act}</td>
                          <td className="px-2 py-2 text-center border-r border-border">
                            {renderThirdColumn(dt.pct, isAffirm)}
                          </td>
                        </React.Fragment>
                      ))}

                      {/* WEEKLY Total */}
                      <td className="px-2 py-2 text-center font-mono text-zinc-950 dark:text-white">
                        {totalRow.weeklyTgt}
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-950 dark:text-white">
                        {totalRow.weeklyAct}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {renderThirdColumn(totalRow.weeklyPct, isAffirm)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ConfettiBackground>
  );
}
