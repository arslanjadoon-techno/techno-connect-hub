import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { rankerService } from "@/services/ranker/ranker.service";
import type { GoalVsAchievementResponse } from "@/services/ranker/types";

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
function getWeeksForMonth(yearStr: string, monthStr: string): WeekDefinition[] {
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

// Transforms live API responses (weekData & mtdData) into UI-ready StoreGoalRecord[]
function transformApiDataToStoreGoalRecords(
  weekData: GoalVsAchievementResponse | null,
  mtdData: GoalVsAchievementResponse | null,
  category: MetricKey,
  activeWeekDef: WeekDefinition,
  yearStr: string,
  monthStr: string,
  fallbackMarket: string,
): StoreGoalRecord[] {
  if (!weekData && !mtdData) return [];

  const year = parseInt(yearStr, 10) || 2026;
  const monthIndex = MONTH_NAMES.indexOf(monthStr);
  const mIdx = monthIndex >= 0 ? monthIndex : 4; // May is index 4 in 0-indexed Date
  const abbr = MONTH_ABBRS[monthStr] || monthStr.slice(0, 3);

  // Extract distinct store metadata from Summary or other arrays
  const summaryList = mtdData?.Summary?.length ? mtdData.Summary : weekData?.Summary || [];

  interface StoreMeta {
    storeName: string;
    manager: string;
    tid: string;
    techId: string;
    market: string;
  }
  const storeMap = new Map<string, StoreMeta>();

  summaryList.forEach((s) => {
    if (s.storeName && !storeMap.has(s.storeName)) {
      storeMap.set(s.storeName, {
        storeName: s.storeName,
        manager: s.districtManager || (s as any).market_Manager || "ALI KHAN",
        tid: s.tid || "",
        techId: s.techId || "",
        market: s.market || fallbackMarket,
      });
    }
  });

  // If summary was empty, gather storeNames from category arrays
  if (storeMap.size === 0) {
    const candidateArrays = [
      weekData?.ACC,
      weekData?.VOICE,
      weekData?.HSI,
      weekData?.BTS,
      weekData?.UPGRADE,
      weekData?.MIM,
      weekData?.BYOD,
      weekData?.Affirm,
      mtdData?.ACC,
      mtdData?.VOICE,
    ];
    for (const arr of candidateArrays) {
      if (arr && arr.length > 0) {
        for (const item of arr) {
          if (item.storeName && !storeMap.has(item.storeName)) {
            storeMap.set(item.storeName, {
              storeName: item.storeName,
              manager: item.market_Manager || "ALI KHAN",
              tid: item.tid || "",
              techId: item.techId || "",
              market: item.market || fallbackMarket,
            });
          }
        }
      }
    }
  }

  const stores = Array.from(storeMap.values());
  if (stores.length === 0) return [];

  const isAffirm = category === "AFFIRM";
  const isByod = category === "BYOD";
  const isTotal = category === "TOTAL ACHIEVEMENTS";

  const getCatArray = (res: GoalVsAchievementResponse | null) => {
    if (!res) return [];
    switch (category) {
      case "ACCESSORIES":
        return res.ACC || [];
      case "VOICE":
        return res.VOICE || [];
      case "HSI":
        return res.HSI || [];
      case "BTS":
        return res.BTS || [];
      case "UPGRADES":
        return res.UPGRADE || [];
      case "MIM":
        return res.MIM || [];
      case "AFFIRM":
        return res.Affirm || [];
      case "BYOD":
        return res.BYOD || [];
      default:
        return [];
    }
  };

  const weekCatItems = getCatArray(weekData);
  const mtdCatItems = getCatArray(mtdData);

  return stores.map((st) => {
    // Days in current selected week
    const days: DayMetric[] = [];
    for (let d = activeWeekDef.startDay; d <= activeWeekDef.endDay; d++) {
      const dateObj = new Date(year, mIdx, d);
      const dayName = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dateObj.getDay()];
      const dateStr = `${abbr.toUpperCase()} ${d}`;

      if (isAffirm) {
        const item = (weekData?.Affirm || []).find(
          (x) => x.storeName === st.storeName && Number(x.day) === d,
        );
        const inv = item ? Number(item.invoice_Amount || 0) : 0;
        const fin = item ? Number(item.financed_Amount || 0) : 0;
        const nonFin = item ? Number(item.non_Financed_Amount || 0) : 0;
        days.push({
          dayNum: d,
          dayName,
          dateStr,
          tgt: Math.round(inv),
          act: Math.round(fin),
          pct: Math.round(nonFin),
        });
      } else if (isByod) {
        const item = (weekData?.BYOD || []).find(
          (x) => x.storeName === st.storeName && Number(x.day) === d,
        );
        const act = item ? Number(item.achieved || 0) : 0;
        days.push({
          dayNum: d,
          dayName,
          dateStr,
          tgt: 0,
          act: Math.round(act),
          pct: 0,
        });
      } else if (isTotal) {
        const explicitTot = (weekData?.TOTAL_ACHIEVEMENTS || []).find(
          (x) => x.storeName === st.storeName && Number(x.day) === d,
        );
        if (explicitTot) {
          const tgt = Number(explicitTot.target || 0);
          const act = Number(explicitTot.achieved || 0);
          const pct =
            explicitTot.percentage !== undefined
              ? Math.round(Number(explicitTot.percentage))
              : tgt > 0
                ? Math.round((act / tgt) * 100)
                : 0;
          days.push({
            dayNum: d,
            dayName,
            dateStr,
            tgt: Math.round(tgt),
            act: Math.round(act),
            pct: Math.round(pct),
          });
        } else {
          // Total activations across Voice + BTS + HSI + MIM + Upgrade
          const v = (weekData?.VOICE || []).find(
            (x) => x.storeName === st.storeName && Number(x.day) === d,
          );
          const b = (weekData?.BTS || []).find(
            (x) => x.storeName === st.storeName && Number(x.day) === d,
          );
          const h = (weekData?.HSI || []).find(
            (x) => x.storeName === st.storeName && Number(x.day) === d,
          );
          const m = (weekData?.MIM || []).find(
            (x) => x.storeName === st.storeName && Number(x.day) === d,
          );
          const u = (weekData?.UPGRADE || []).find(
            (x) => x.storeName === st.storeName && Number(x.day) === d,
          );

          const dailyTgt =
            (v?.target || 0) +
            (b?.target || 0) +
            (h?.target || 0) +
            (m?.target || 0) +
            (u?.target || 0);
          const dailyAct =
            (v?.achieved || 0) +
            (b?.achieved || 0) +
            (h?.achieved || 0) +
            (m?.achieved || 0) +
            (u?.achieved || 0);
          const dailyPct = dailyTgt > 0 ? Math.round((dailyAct / dailyTgt) * 100) : 0;
          days.push({
            dayNum: d,
            dayName,
            dateStr,
            tgt: Math.round(dailyTgt),
            act: Math.round(dailyAct),
            pct: Math.round(dailyPct),
          });
        }
      } else {
        const item = (weekCatItems as any[]).find(
          (x) => x.storeName === st.storeName && Number(x.day) === d,
        );
        const tgt = item ? Number(item.target || 0) : 0;
        const act = item ? Number(item.achieved || 0) : 0;
        const pct =
          item?.percentage !== undefined
            ? Math.round(Number(item.percentage))
            : tgt > 0
              ? Math.round((act / tgt) * 100)
              : 0;
        days.push({
          dayNum: d,
          dayName,
          dateStr,
          tgt: Math.round(tgt),
          act: Math.round(act),
          pct: Math.round(pct),
        });
      }
    }

    // Weekly summary
    const weeklyTgt = Math.round(days.reduce((sum, d) => sum + d.tgt, 0));
    const weeklyAct = Math.round(days.reduce((sum, d) => sum + d.act, 0));
    const weeklyPct = isAffirm
      ? Math.max(0, Math.round(weeklyTgt - weeklyAct))
      : isByod
        ? 0
        : weeklyTgt > 0
          ? Math.round((weeklyAct / weeklyTgt) * 100)
          : 0;

    // MTD and Full MTD
    let mtd = { tgt: 0, act: 0, pct: 0 };
    let fullMtd = { tgt: 0, act: 0, pct: 0 };

    if (isAffirm) {
      const mItem = (mtdData?.Affirm || []).find(
        (x) => x.storeName === st.storeName && Number(x.day) === 100,
      );
      const fItem =
        (mtdData?.Affirm || []).find(
          (x) => x.storeName === st.storeName && Number(x.day) === 1000,
        ) || mItem;
      const mInv = mItem ? Number(mItem.invoice_Amount || 0) : 0;
      const mFin = mItem ? Number(mItem.financed_Amount || 0) : 0;
      const mNon = mItem ? Number(mItem.non_Financed_Amount || 0) : 0;
      const fInv = fItem ? Number(fItem.invoice_Amount || 0) : mInv;
      const fFin = fItem ? Number(fItem.financed_Amount || 0) : mFin;
      const fNon = fItem ? Number(fItem.non_Financed_Amount || 0) : mNon;

      mtd = {
        tgt: Math.round(mInv),
        act: Math.round(mFin),
        pct: Math.round(mNon),
      };
      fullMtd = {
        tgt: Math.round(fInv),
        act: Math.round(fFin),
        pct: Math.round(fNon),
      };
    } else if (isByod) {
      const mItem = (mtdData?.BYOD || []).find(
        (x) => x.storeName === st.storeName && Number(x.day) === 100,
      );
      const fItem =
        (mtdData?.BYOD || []).find((x) => x.storeName === st.storeName && Number(x.day) === 1000) ||
        mItem;
      const mAct = mItem ? Number(mItem.achieved || 0) : 0;
      const fAct = fItem ? Number(fItem.achieved || 0) : mAct;
      mtd = { tgt: 0, act: Math.round(mAct), pct: 0 };
      fullMtd = { tgt: 0, act: Math.round(fAct), pct: 0 };
    } else if (isTotal) {
      const sumItem =
        (mtdData?.Summary || []).find((x) => x.storeName === st.storeName) ||
        (weekData?.Summary || []).find((x) => x.storeName === st.storeName);
      if (sumItem) {
        const mTgt = Math.round(Number(sumItem.mtD_Target || 0));
        const mAct = Math.round(Number(sumItem.mtD_Achieved || 0));
        const mPct = mTgt > 0 ? Math.round((mAct / mTgt) * 100) : 0;
        const fTgt = Math.round(Number(sumItem.full_Month_Target || 0));
        const fAct = Math.round(Number(sumItem.full_Month_Achieved || 0));
        const fPct = fTgt > 0 ? Math.round((fAct / fTgt) * 100) : 0;
        mtd = { tgt: mTgt, act: mAct, pct: mPct };
        fullMtd = { tgt: fTgt, act: fAct, pct: fPct };
      }
    } else {
      const mItem = (mtdCatItems as any[]).find(
        (x) => x.storeName === st.storeName && Number(x.day) === 100,
      );
      const fItem = (mtdCatItems as any[]).find(
        (x) => x.storeName === st.storeName && Number(x.day) === 1000,
      );
      const mTgt = mItem ? Number(mItem.target || 0) : 0;
      const mAct = mItem ? Number(mItem.achieved || 0) : 0;
      const mPct =
        mItem?.percentage !== undefined
          ? Math.round(Number(mItem.percentage))
          : mTgt > 0
            ? Math.round((mAct / mTgt) * 100)
            : 0;
      const fTgt = fItem ? Number(fItem.target || 0) : mItem ? Number(mItem.target || 0) : 0;
      const fAct = fItem ? Number(fItem.achieved || 0) : mItem ? Number(mItem.achieved || 0) : 0;
      const fPct =
        fItem?.percentage !== undefined
          ? Math.round(Number(fItem.percentage))
          : fTgt > 0
            ? Math.round((fAct / fTgt) * 100)
            : mPct;

      mtd = {
        tgt: Math.round(mTgt),
        act: Math.round(mAct),
        pct: Math.round(mPct),
      };
      fullMtd = {
        tgt: Math.round(fTgt),
        act: Math.round(fAct),
        pct: Math.round(fPct),
      };
    }

    return {
      id: st.tid || st.techId || st.storeName,
      store: st.storeName,
      manager: st.manager,
      market: st.market,
      mtd,
      fullMtd,
      days,
      weekly: {
        tgt: Math.round(weeklyTgt),
        act: Math.round(weeklyAct),
        pct: Math.round(weeklyPct),
      },
    };
  });
}

/**
 * Format any number as a clean integer without any decimal points.
 */
function formatRoundNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return "0";
  return Math.round(val).toLocaleString();
}

function renderThirdColumn(val: number, isAffirm: boolean) {
  const roundedVal = Math.round(val || 0);
  if (isAffirm) {
    return (
      <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-xs min-w-[46px] shadow-2xs bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
        {roundedVal.toLocaleString()}
      </span>
    );
  }

  let badgeClass = "";
  if (roundedVal >= 100) {
    badgeClass =
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50";
  } else if (roundedVal >= 60) {
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
      {roundedVal}%
    </span>
  );
}

/**
 * Renders the % To Target pill badge for TOTAL ACHIEVEMENTS tab:
 * - <= 70% : Red color
 * - 71% to 99% : Yellow color
 * - >= 100% : Green color
 */
function renderTotalAchievementPctBadge(pct: number) {
  const roundedPct = Math.round(pct || 0);
  let badgeClass = "";
  if (roundedPct <= 70) {
    // 70 or less: Red color
    badgeClass =
      "bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5] dark:bg-red-950/70 dark:text-red-300 dark:border-red-800";
  } else if (roundedPct <= 99) {
    // 71 to 99: Yellow color
    badgeClass =
      "bg-[#fef9c3] text-[#854d0e] border border-[#fde047] dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800";
  } else {
    // 100 above: Green color
    badgeClass =
      "bg-[#dcfce7] text-[#166534] border border-[#86efac] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800";
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-extrabold px-3.5 py-1 rounded-xl text-xs sm:text-sm min-w-[64px] shadow-2xs ${badgeClass}`}
    >
      {roundedPct}%
    </span>
  );
}

type SortColumn =
  | "store"
  | "market"
  | "date"
  | "dailyTgt"
  | "dailyAct"
  | "dailyPct"
  | "mtdAct"
  | "fullMtdAct"
  | "weeklyAct"
  | "mtdPct"
  | "fullMtdPct"
  | "weeklyPct";
type SortDirection = "asc" | "desc" | "normal";

/**
 * Helper to compute default date filters matching the current day.
 * e.g., if today is September 12, it selects September and Week 2 (Sep 8-14).
 */
function getCurrentDateDefaults() {
  const now = new Date();
  const yearStr = String(now.getFullYear());
  const monthIdx = now.getMonth();
  const monthStr = MONTH_NAMES[monthIdx] || "September";
  const day = now.getDate();

  const weeks = getWeeksForMonth(yearStr, monthStr);
  const matchedWeek = weeks.find((w) => day >= w.startDay && day <= w.endDay) || weeks[0];
  const weekId = matchedWeek?.id || "week-1";
  const dayIndex = matchedWeek ? Math.max(0, day - matchedWeek.startDay) : 0;

  return {
    year: yearStr,
    month: monthStr,
    weekId,
    dayIndex,
  };
}

export default function GoalsVsAchievementPage() {
  // Market list fetched from live API
  const [markets, setMarkets] = useState<string[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState<boolean>(true);

  // Compute current date defaults (e.g. Sep 12 -> Sep, Week 2)
  const dateDefaults = useMemo(() => getCurrentDateDefaults(), []);

  // Filter selections (default to current date: year, month, and week matching today's date)
  const [selectedMarket, setSelectedMarket] = useState<string>("ARIZONA");
  const [selectedYear, setSelectedYear] = useState<string>(dateDefaults.year);
  const [selectedMonth, setSelectedMonth] = useState<string>(dateDefaults.month);
  const [activeCategory, setActiveCategory] = useState<MetricKey>("ACCESSORIES");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(dateDefaults.dayIndex);

  // Live API data state
  const [weekData, setWeekData] = useState<GoalVsAchievementResponse | null>(null);
  const [mtdData, setMtdData] = useState<GoalVsAchievementResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const isByod = activeCategory === "BYOD";
  const isTotalAchievements = activeCategory === "TOTAL ACHIEVEMENTS";

  // Dynamic weeks covering the entire selected month
  const availableWeeks = useMemo(() => {
    return getWeeksForMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const [selectedWeekId, setSelectedWeekId] = useState<string>(dateDefaults.weekId);

  // If month changes and current selectedWeekId does not exist, fallback to first available week
  useEffect(() => {
    const exists = availableWeeks.some((w) => w.id === selectedWeekId);
    if (!exists && availableWeeks.length > 0) {
      setSelectedWeekId(availableWeeks[0].id);
      setSelectedDayIndex(0);
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

  // Load markets from live API
  useEffect(() => {
    let isMounted = true;
    async function loadMarkets() {
      try {
        setIsLoadingMarkets(true);
        const list = await rankerService.getMarketList();
        if (isMounted && list && list.length > 0) {
          setMarkets(list);
          if (!selectedMarket || !list.includes(selectedMarket)) {
            setSelectedMarket(list.includes("ARIZONA") ? "ARIZONA" : list[0]);
          }
        }
      } catch (err: any) {
        console.error("Failed to load market list:", err);
        if (isMounted && markets.length === 0) {
          setMarkets(["ARIZONA", "TEXAS", "FLORIDA", "CALIFORNIA", "NEVADA", "NEW YORK"]);
        }
      } finally {
        if (isMounted) setIsLoadingMarkets(false);
      }
    }
    loadMarkets();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch weekly and MTD Goal vs Achievement data from live API
  useEffect(() => {
    if (!selectedMarket) return;
    let isMounted = true;

    const monthIndex = MONTH_NAMES.indexOf(selectedMonth);
    const monthNum = monthIndex >= 0 ? monthIndex + 1 : 5;

    async function loadGoalVsAchievement() {
      try {
        setIsLoadingData(true);
        setDataError(null);

        const [weekRes, mtdRes] = await Promise.all([
          rankerService.getGoalVsAchievement({
            market: selectedMarket,
            year: selectedYear,
            month: monthNum,
            dayfrom: activeWeekDef.startDay,
            dayto: activeWeekDef.endDay,
          }),
          rankerService.getGoalVsAchievement({
            market: selectedMarket,
            year: selectedYear,
            month: monthNum,
            dayfrom: 100,
            dayto: 1000,
          }),
        ]);

        if (isMounted) {
          setWeekData(weekRes);
          setMtdData(mtdRes);
        }
      } catch (err: any) {
        console.error("Failed to load goal vs achievement:", err);
        if (isMounted) {
          setDataError(err?.message || "Failed to load data from API");
          toast.error("Failed to fetch achievement data from server");
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }

    loadGoalVsAchievement();

    return () => {
      isMounted = false;
    };
  }, [
    selectedMarket,
    selectedYear,
    selectedMonth,
    activeWeekDef.startDay,
    activeWeekDef.endDay,
    refreshTrigger,
  ]);

  // Sorting
  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("normal");

  const rawData = useMemo(() => {
    return transformApiDataToStoreGoalRecords(
      weekData,
      mtdData,
      activeCategory,
      activeWeekDef,
      selectedYear,
      selectedMonth,
      selectedMarket,
    );
  }, [
    weekData,
    mtdData,
    activeCategory,
    activeWeekDef,
    selectedYear,
    selectedMonth,
    selectedMarket,
  ]);

  // Days list for headers and Total Achievements day selector
  const weekDays = useMemo(() => {
    const year = parseInt(selectedYear, 10) || 2026;
    const monthIndex = MONTH_NAMES.indexOf(selectedMonth);
    const mIdx = monthIndex >= 0 ? monthIndex : 4;
    const abbr = MONTH_ABBRS[selectedMonth] || selectedMonth.slice(0, 3);
    const days: { dayNum: number; dayName: string; dateStr: string }[] = [];
    for (let d = activeWeekDef.startDay; d <= activeWeekDef.endDay; d++) {
      const dateObj = new Date(year, mIdx, d);
      const dayName = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dateObj.getDay()];
      const dateStr = `${abbr.toUpperCase()} ${d}`;
      days.push({ dayNum: d, dayName, dateStr });
    }
    return days;
  }, [selectedYear, selectedMonth, activeWeekDef]);

  const displayDays = rawData[0]?.days || weekDays;
  const activeDayIdx = Math.max(0, Math.min(selectedDayIndex, displayDays.length - 1));
  const activeDay = displayDays[activeDayIdx] || displayDays[0];
  const activeDayDateFormatted = activeDay
    ? `${activeDay.dayName}, ${activeDay.dateStr} ${selectedYear}`
    : `${selectedMonth} ${selectedYear}`;

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
        if (sortCol === "market") {
          return sortDir === "asc"
            ? a.market.localeCompare(b.market)
            : b.market.localeCompare(a.market);
        }
        if (sortCol === "dailyTgt") {
          valA = a.days[activeDayIdx]?.tgt ?? 0;
          valB = b.days[activeDayIdx]?.tgt ?? 0;
          return sortDir === "asc" ? valA - valB : valB - valA;
        }
        if (sortCol === "dailyAct") {
          valA = a.days[activeDayIdx]?.act ?? 0;
          valB = b.days[activeDayIdx]?.act ?? 0;
          return sortDir === "asc" ? valA - valB : valB - valA;
        }
        if (sortCol === "dailyPct") {
          valA = a.days[activeDayIdx]?.pct ?? 0;
          valB = b.days[activeDayIdx]?.pct ?? 0;
          return sortDir === "asc" ? valA - valB : valB - valA;
        }
        if (sortCol === "mtdAct") {
          valA = a.mtd.act;
          valB = b.mtd.act;
        } else if (sortCol === "fullMtdAct") {
          valA = a.fullMtd.act;
          valB = b.fullMtd.act;
        } else if (sortCol === "weeklyAct") {
          valA = a.weekly.act;
          valB = b.weekly.act;
        } else if (sortCol === "mtdPct") {
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
  }, [rawData, searchQuery, sortCol, sortDir, activeDayIdx]);

  const handleResetFilters = () => {
    const current = getCurrentDateDefaults();
    setSelectedMarket(markets.includes("ARIZONA") ? "ARIZONA" : markets[0] || "ARIZONA");
    setSelectedYear(current.year);
    setSelectedMonth(current.month);
    setSelectedWeekId(current.weekId);
    setSelectedDayIndex(current.dayIndex);
    setSearchQuery("");
    setActiveCategory("ACCESSORIES");
    setSortCol(null);
    setSortDir("normal");
    toast.success("Filters reset to current date");
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
                  <p className="text-xs font-semibold tracking-widest text-amber-400/95 uppercase flex items-center gap-2">
                    <span>MARKET: {selectedMarket}</span>
                    {isLoadingData && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full font-normal">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Fetching live data...
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Market Dropdown */}
              <div className="w-40">
                <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                  <SelectTrigger
                    id="market-select"
                    className="bg-white text-zinc-900 font-bold text-xs h-9 border-0 shadow-sm focus:ring-amber-400"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isLoadingMarkets ? (
                        <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
                      ) : (
                        <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <SelectValue placeholder={isLoadingMarkets ? "Loading..." : "Market"} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-xs max-h-64">
                    {(markets.length > 0 ? markets : ["ARIZONA"]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
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
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                    <SelectItem value="2028">2028</SelectItem>
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

              {/* Refresh Button */}
              <Button
                id="refresh-filters-btn"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefreshTrigger((prev) => prev + 1);
                  toast.info("Refreshing live data from server...");
                }}
                disabled={isLoadingData}
                className="h-9 px-2.5 text-xs bg-zinc-800/80 border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:text-white"
                title="Refresh Live Data"
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

        {/* Total Achievements Day-by-Day Selector */}
        {isTotalAchievements && displayDays.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" />
              Select Day:
            </span>
            {displayDays.map((d, idx) => (
              <button
                key={d.dayNum}
                id={`day-select-${d.dayNum}`}
                onClick={() => setSelectedDayIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all duration-150 shrink-0 whitespace-nowrap ${
                  activeDayIdx === idx
                    ? "bg-amber-400 text-zinc-950 font-black shadow-md shadow-amber-400/20 ring-2 ring-amber-500/50"
                    : "bg-card text-foreground hover:bg-muted border border-border/80"
                }`}
              >
                {d.dayName} {d.dayNum}
              </button>
            ))}
          </div>
        )}

        {/* 
          Main MIS Multi-tier Data Table Card 
          With 'isolate' class to strictly isolate internal z-indices from the rest of the page 
        */}
        <Card className="border border-border/80 shadow-md bg-card overflow-hidden isolate relative z-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-xs border-collapse">
                {/* Header Row 1: High Level Groupings */}
                <thead>
                  {isTotalAchievements ? (
                    // Total Achievement Headers: "Store / Manager", "Market", "Date", "Daily Target", "Daily Achieved", "% To Target"
                    <tr className="bg-zinc-100 dark:bg-zinc-900 text-foreground border-b border-border text-[11px] font-bold tracking-wider uppercase">
                      {/* Store / Manager */}
                      <th className="sticky left-0 z-20 bg-zinc-100 dark:bg-zinc-900 px-4 py-3 text-left min-w-[200px] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
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

                      {/* Market */}
                      <th className="px-4 py-3 text-center border-r border-border min-w-[120px]">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSort("market")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSort("market");
                            }
                          }}
                          className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-amber-600 transition-colors"
                        >
                          <span>MARKET</span>
                          {sortCol === "market" && sortDir !== "normal" ? (
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

                      {/* Date */}
                      <th className="px-4 py-3 text-center border-r border-border min-w-[150px]">
                        <span>DATE</span>
                      </th>

                      {/* Daily Target */}
                      <th className="px-4 py-3 text-center border-r border-border min-w-[130px]">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSort("dailyTgt")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSort("dailyTgt");
                            }
                          }}
                          className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-amber-600 transition-colors"
                        >
                          <span>DAILY TARGET</span>
                          {sortCol === "dailyTgt" && sortDir !== "normal" ? (
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

                      {/* Daily Achieved */}
                      <th className="px-4 py-3 text-center border-r border-border min-w-[130px]">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSort("dailyAct")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSort("dailyAct");
                            }
                          }}
                          className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-amber-600 transition-colors"
                        >
                          <span>DAILY ACHIEVED</span>
                          {sortCol === "dailyAct" && sortDir !== "normal" ? (
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

                      {/* % To Target */}
                      <th className="px-4 py-3 text-center min-w-[130px]">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSort("dailyPct")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSort("dailyPct");
                            }
                          }}
                          className="flex items-center justify-center gap-1.5 cursor-pointer hover:text-amber-600 transition-colors"
                        >
                          <span>% TO TARGET</span>
                          {sortCol === "dailyPct" && sortDir !== "normal" ? (
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
                    </tr>
                  ) : isByod ? (
                    // BYOD Header: Single Header row, NO sub-headers (TGT, ACT, %)
                    <tr className="bg-zinc-100 dark:bg-zinc-900 text-foreground border-b border-border text-[11px] font-bold tracking-wider uppercase">
                      {/* Sticky Store / Manager Column */}
                      <th className="sticky left-0 z-20 bg-zinc-100 dark:bg-zinc-900 px-4 py-3 text-left min-w-[200px] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
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
                        className="px-4 py-3 text-center border-r border-border bg-blue-50/50 dark:bg-blue-950/20 cursor-pointer hover:text-amber-600"
                        onClick={() => handleSort("mtdAct")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>MTD</span>
                          {sortCol === "mtdAct" && sortDir !== "normal" ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-amber-500" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-amber-500" />
                            )
                          ) : null}
                        </div>
                      </th>

                      {/* FULL MTD */}
                      <th
                        className="px-4 py-3 text-center border-r border-border bg-indigo-50/50 dark:bg-indigo-950/20 cursor-pointer hover:text-amber-600"
                        onClick={() => handleSort("fullMtdAct")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>FULL MTD</span>
                          {sortCol === "fullMtdAct" && sortDir !== "normal" ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-amber-500" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-amber-500" />
                            )
                          ) : null}
                        </div>
                      </th>

                      {/* Dynamic Days of the Selected Week */}
                      {displayDays.map((d, idx) => (
                        <th
                          key={idx}
                          className="px-3 py-2 text-center border-r border-border bg-muted/40 min-w-[85px]"
                        >
                          <div className="font-bold text-foreground">{d.dayName}</div>
                          <div className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                            {d.dateStr}
                          </div>
                        </th>
                      ))}

                      {/* WEEKLY Summary */}
                      <th
                        className="px-4 py-3 text-center bg-amber-50/60 dark:bg-amber-950/20 cursor-pointer hover:text-amber-600 min-w-[90px]"
                        onClick={() => handleSort("weeklyAct")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>WEEKLY</span>
                          {sortCol === "weeklyAct" && sortDir !== "normal" ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-amber-500" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-amber-500" />
                            )
                          ) : null}
                        </div>
                      </th>
                    </tr>
                  ) : (
                    // Standard Categories (ACCESSORIES, VOICE, HSI, BTS, UPGRADES, MIM, AFFIRM)
                    <>
                      <tr className="bg-zinc-100 dark:bg-zinc-900 text-foreground border-b border-border text-[11px] font-bold tracking-wider uppercase">
                        {/* Sticky Store / Manager Column scoped inside isolated card */}
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
                        {displayDays.map((d, idx) => (
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
                        {displayDays.map((_, idx) => (
                          <React.Fragment key={idx}>
                            <th className="px-2 py-1.5 text-center">{subCol1}</th>
                            <th className="px-2 py-1.5 text-center">{subCol2}</th>
                            <th className="px-2 py-1.5 text-center border-r border-border">
                              {subCol3}
                            </th>
                          </React.Fragment>
                        ))}

                        {/* Under WEEKLY */}
                        <th className="px-2 py-1.5 text-center font-bold text-foreground">
                          {subCol1}
                        </th>
                        <th className="px-2 py-1.5 text-center font-bold text-foreground">
                          {subCol2}
                        </th>
                        <th
                          className="px-2 py-1.5 text-center font-bold text-foreground cursor-pointer hover:text-amber-600"
                          onClick={() => handleSort("weeklyPct")}
                        >
                          {subCol3}
                        </th>
                      </tr>
                    </>
                  )}
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-border/60 font-medium">
                  {isLoadingData ? (
                    <tr>
                      <td
                        colSpan={
                          isTotalAchievements
                            ? 6
                            : isByod
                              ? 4 + displayDays.length
                              : 7 + displayDays.length * 3
                        }
                        className="py-20 text-center"
                      >
                        <div className="flex flex-col items-center justify-center gap-3">
                          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                          <p className="text-sm font-bold text-foreground">
                            Loading live {activeCategory} data for {selectedMarket}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Fetching weekly goals & achievements from Ranker API
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : dataError ? (
                    <tr>
                      <td
                        colSpan={
                          isTotalAchievements
                            ? 6
                            : isByod
                              ? 4 + displayDays.length
                              : 7 + displayDays.length * 3
                        }
                        className="py-16 text-center"
                      >
                        <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                          <AlertCircle className="w-8 h-8 text-rose-500" />
                          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                            Failed to load live data
                          </p>
                          <p className="text-xs text-muted-foreground">{dataError}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRefreshTrigger((p) => p + 1)}
                            className="mt-2 text-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            Retry
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          isTotalAchievements
                            ? 6
                            : isByod
                              ? 4 + displayDays.length
                              : 7 + displayDays.length * 3
                        }
                        className="py-12 text-center text-muted-foreground"
                      >
                        {searchQuery
                          ? `No stores found matching "${searchQuery}".`
                          : `No store records found for ${selectedMarket} in ${selectedMonth} ${selectedYear}.`}
                      </td>
                    </tr>
                  ) : isTotalAchievements ? (
                    // Total Achievement Rows: Store / Manager, Market, Date, Daily Target, Daily Achieved, % To Target
                    filteredData.map((row, index) => {
                      const d = row.days[activeDayIdx] || row.days[0];
                      const dailyTgt = d?.tgt ?? 0;
                      const dailyAct = d?.act ?? 0;
                      const dailyPct = d?.pct ?? 0;

                      return (
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
                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                              {row.manager}
                            </div>
                          </td>

                          {/* Market */}
                          <td className="px-4 py-2.5 text-center font-bold text-xs uppercase tracking-wider border-r border-border text-zinc-700 dark:text-zinc-300">
                            {row.market}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-2.5 text-center text-xs font-semibold whitespace-nowrap border-r border-border text-zinc-600 dark:text-zinc-400">
                            {activeDayDateFormatted}
                          </td>

                          {/* Daily Target */}
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-xs border-r border-border text-zinc-800 dark:text-zinc-200">
                            {formatRoundNumber(dailyTgt)}
                          </td>

                          {/* Daily Achieved */}
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-xs border-r border-border text-zinc-900 dark:text-zinc-100">
                            {formatRoundNumber(dailyAct)}
                          </td>

                          {/* % To Target (Red <= 70, Yellow 71-99, Green >= 100) */}
                          <td className="px-4 py-2.5 text-center">
                            {renderTotalAchievementPctBadge(dailyPct)}
                          </td>
                        </tr>
                      );
                    })
                  ) : isByod ? (
                    // BYOD Rows: Single value per column, no sub-headers
                    filteredData.map((row, index) => (
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
                          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                            {row.manager}
                          </div>
                        </td>

                        {/* MTD Single Metric */}
                        <td className="px-3 py-2 text-center font-mono font-semibold text-zinc-900 dark:text-zinc-100 border-r border-border">
                          {formatRoundNumber(row.mtd.act)}
                        </td>

                        {/* FULL MTD Single Metric */}
                        <td className="px-3 py-2 text-center font-mono font-semibold text-zinc-900 dark:text-zinc-100 border-r border-border">
                          {formatRoundNumber(row.fullMtd.act)}
                        </td>

                        {/* Dynamic Days Single Metrics */}
                        {row.days.map((day, dIdx) => (
                          <td
                            key={dIdx}
                            className="px-3 py-2 text-center font-mono font-medium text-zinc-900 dark:text-zinc-100 border-r border-border"
                          >
                            {formatRoundNumber(day.act)}
                          </td>
                        ))}

                        {/* WEEKLY Single Metric */}
                        <td className="px-3 py-2 text-center font-mono font-bold text-zinc-950 dark:text-white">
                          {formatRoundNumber(row.weekly.act)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Standard Multi-Metric Rows
                    filteredData.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`group transition-colors ${
                          index % 2 === 1
                            ? "bg-zinc-50/80 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            : "bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {/* Sticky Store & Manager Cell scoped inside isolated card */}
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
                          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                            {row.manager}
                          </div>
                        </td>

                        {/* MTD Metrics */}
                        <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                          {formatRoundNumber(row.mtd.tgt)}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatRoundNumber(row.mtd.act)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderThirdColumn(row.mtd.pct, isAffirm)}
                        </td>

                        {/* FULL MTD Metrics */}
                        <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                          {formatRoundNumber(row.fullMtd.tgt)}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatRoundNumber(row.fullMtd.act)}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderThirdColumn(row.fullMtd.pct, isAffirm)}
                        </td>

                        {/* Dynamic Days Metrics */}
                        {row.days.map((day, dIdx) => (
                          <React.Fragment key={dIdx}>
                            <td className="px-2 py-2 text-center font-mono text-zinc-600 dark:text-zinc-400">
                              {formatRoundNumber(day.tgt)}
                            </td>
                            <td className="px-2 py-2 text-center font-mono font-medium text-zinc-900 dark:text-zinc-100">
                              {formatRoundNumber(day.act)}
                            </td>
                            <td className="px-2 py-2 text-center border-r border-border">
                              {renderThirdColumn(day.pct, isAffirm)}
                            </td>
                          </React.Fragment>
                        ))}

                        {/* WEEKLY Summary Metrics */}
                        <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {formatRoundNumber(row.weekly.tgt)}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {formatRoundNumber(row.weekly.act)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {renderThirdColumn(row.weekly.pct, isAffirm)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ConfettiBackground>
  );
}
