import React, { useState, useMemo } from "react";
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
  Award,
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

export interface DayMetric {
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

// Data generator helper
function generateStoreData(
  category: MetricKey,
  market: string
): StoreGoalRecord[] {
  // Base raw records inspired directly by user's screenshot
  const baseStores = [
    {
      id: "az-1",
      store: "N ARIZONA AVE",
      manager: "ALI KHAN",
      market: "ARIZONA",
      mtd: { tgt: 16664, act: 23432, pct: 141 },
      fullMtd: { tgt: 16664, act: 23432, pct: 141 },
      days: [
        { dayName: "FRI", dateStr: "MAY 1", tgt: 750, act: 635, pct: 85 },
        { dayName: "SAT", dateStr: "MAY 2", tgt: 700, act: 239, pct: 34 },
        { dayName: "SUN", dateStr: "MAY 3", tgt: 406, act: 79, pct: 19 },
        { dayName: "MON", dateStr: "MAY 4", tgt: 557, act: 870, pct: 156 },
        { dayName: "TUE", dateStr: "MAY 5", tgt: 528, act: 888, pct: 168 },
        { dayName: "WED", dateStr: "MAY 6", tgt: 550, act: 697, pct: 127 },
        { dayName: "THU", dateStr: "MAY 7", tgt: 571, act: 511, pct: 89 },
      ],
      weekly: { tgt: 4063, act: 3919, pct: 96 },
    },
    {
      id: "az-2",
      store: "3202 E GREENWAY RD",
      manager: "ALI KHAN",
      market: "ARIZONA",
      mtd: { tgt: 10369, act: 6088, pct: 59 },
      fullMtd: { tgt: 10369, act: 6088, pct: 59 },
      days: [
        { dayName: "FRI", dateStr: "MAY 1", tgt: 467, act: 40, pct: 9 },
        { dayName: "SAT", dateStr: "MAY 2", tgt: 436, act: 144, pct: 33 },
        { dayName: "SUN", dateStr: "MAY 3", tgt: 253, act: 106, pct: 42 },
        { dayName: "MON", dateStr: "MAY 4", tgt: 347, act: 35, pct: 10 },
        { dayName: "TUE", dateStr: "MAY 5", tgt: 328, act: 75, pct: 23 },
        { dayName: "WED", dateStr: "MAY 6", tgt: 342, act: 342, pct: 100 },
        { dayName: "THU", dateStr: "MAY 7", tgt: 356, act: 83, pct: 23 },
      ],
      weekly: { tgt: 2528, act: 825, pct: 33 },
    },
    {
      id: "az-3",
      store: "W VAN BUREN ST",
      manager: "ALI KHAN",
      market: "ARIZONA",
      mtd: { tgt: 32382, act: 24386, pct: 75 },
      fullMtd: { tgt: 32382, act: 24386, pct: 75 },
      days: [
        { dayName: "FRI", dateStr: "MAY 1", tgt: 1457, act: 579, pct: 40 },
        { dayName: "SAT", dateStr: "MAY 2", tgt: 1361, act: 623, pct: 46 },
        { dayName: "SUN", dateStr: "MAY 3", tgt: 790, act: 738, pct: 93 },
        { dayName: "MON", dateStr: "MAY 4", tgt: 1083, act: 340, pct: 31 },
        { dayName: "TUE", dateStr: "MAY 5", tgt: 1025, act: 1214, pct: 118 },
        { dayName: "WED", dateStr: "MAY 6", tgt: 1068, act: 341, pct: 32 },
        { dayName: "THU", dateStr: "MAY 7", tgt: 1111, act: 375, pct: 34 },
      ],
      weekly: { tgt: 7895, act: 4209, pct: 53 },
    },
    {
      id: "az-4",
      store: "6430 W GLENDALE AVE",
      manager: "ALI KHAN",
      market: "ARIZONA",
      mtd: { tgt: 12900, act: 11455, pct: 89 },
      fullMtd: { tgt: 12900, act: 11455, pct: 89 },
      days: [
        { dayName: "FRI", dateStr: "MAY 1", tgt: 581, act: 443, pct: 76 },
        { dayName: "SAT", dateStr: "MAY 2", tgt: 542, act: 432, pct: 80 },
        { dayName: "SUN", dateStr: "MAY 3", tgt: 314, act: 564, pct: 179 },
        { dayName: "MON", dateStr: "MAY 4", tgt: 432, act: 1412, pct: 327 },
        { dayName: "TUE", dateStr: "MAY 5", tgt: 409, act: 302, pct: 74 },
        { dayName: "WED", dateStr: "MAY 6", tgt: 426, act: 372, pct: 88 },
        { dayName: "THU", dateStr: "MAY 7", tgt: 442, act: 137, pct: 31 },
      ],
      weekly: { tgt: 3145, act: 3663, pct: 116 },
    },
    {
      id: "az-5",
      store: "N 75TH AVE",
      manager: "ALI KHAN",
      market: "ARIZONA",
      mtd: { tgt: 17385, act: 22306, pct: 128 },
      fullMtd: { tgt: 17385, act: 22306, pct: 128 },
      days: [
        { dayName: "FRI", dateStr: "MAY 1", tgt: 782, act: 1020, pct: 130 },
        { dayName: "SAT", dateStr: "MAY 2", tgt: 731, act: 1242, pct: 170 },
        { dayName: "SUN", dateStr: "MAY 3", tgt: 424, act: 363, pct: 86 },
        { dayName: "MON", dateStr: "MAY 4", tgt: 581, act: 1082, pct: 186 },
        { dayName: "TUE", dateStr: "MAY 5", tgt: 551, act: 122, pct: 22 },
        { dayName: "WED", dateStr: "MAY 6", tgt: 574, act: 535, pct: 93 },
        { dayName: "THU", dateStr: "MAY 7", tgt: 596, act: 215, pct: 36 },
      ],
      weekly: { tgt: 4239, act: 4578, pct: 108 },
    },
    {
      id: "az-6",
      store: "8129 NORTH 35TH AVENUE",
      manager: "ALI KHAN",
      market: "ARIZONA",
      mtd: { tgt: 8610, act: 4727, pct: 55 },
      fullMtd: { tgt: 8610, act: 4727, pct: 55 },
      days: [
        { dayName: "FRI", dateStr: "MAY 1", tgt: 388, act: 140, pct: 36 },
        { dayName: "SAT", dateStr: "MAY 2", tgt: 362, act: 55, pct: 15 },
        { dayName: "SUN", dateStr: "MAY 3", tgt: 210, act: 25, pct: 12 },
        { dayName: "MON", dateStr: "MAY 4", tgt: 288, act: 90, pct: 31 },
        { dayName: "TUE", dateStr: "MAY 5", tgt: 273, act: 55, pct: 20 },
        { dayName: "WED", dateStr: "MAY 6", tgt: 284, act: 154, pct: 54 },
        { dayName: "THU", dateStr: "MAY 7", tgt: 295, act: 175, pct: 59 },
      ],
      weekly: { tgt: 2101, act: 693, pct: 33 },
    },
    {
      id: "az-7",
      store: "SCOTTSDALE PAVILIONS",
      manager: "SARAH JENKINS",
      market: "ARIZONA",
      mtd: { tgt: 22100, act: 26840, pct: 121 },
      fullMtd: { tgt: 22100, act: 26840, pct: 121 },
      days: [
        { dayName: "FRI", dateStr: "MAY 1", tgt: 994, act: 1140, pct: 115 },
        { dayName: "SAT", dateStr: "MAY 2", tgt: 928, act: 1390, pct: 150 },
        { dayName: "SUN", dateStr: "MAY 3", tgt: 539, act: 620, pct: 115 },
        { dayName: "MON", dateStr: "MAY 4", tgt: 739, act: 890, pct: 120 },
        { dayName: "TUE", dateStr: "MAY 5", tgt: 701, act: 740, pct: 106 },
        { dayName: "WED", dateStr: "MAY 6", tgt: 730, act: 810, pct: 111 },
        { dayName: "THU", dateStr: "MAY 7", tgt: 758, act: 890, pct: 117 },
      ],
      weekly: { tgt: 5389, act: 6480, pct: 120 },
    },
    {
      id: "az-8",
      store: "CAMELBACK COLONNADE",
      manager: "MARCUS VANCE",
      market: "ARIZONA",
      mtd: { tgt: 18500, act: 15350, pct: 83 },
      fullMtd: { tgt: 18500, act: 15350, pct: 83 },
      days: [
        { dayName: "FRI", dateStr: "MAY 1", tgt: 832, act: 690, pct: 83 },
        { dayName: "SAT", dateStr: "MAY 2", tgt: 777, act: 820, pct: 106 },
        { dayName: "SUN", dateStr: "MAY 3", tgt: 451, act: 340, pct: 75 },
        { dayName: "MON", dateStr: "MAY 4", tgt: 618, act: 510, pct: 83 },
        { dayName: "TUE", dateStr: "MAY 5", tgt: 587, act: 490, pct: 83 },
        { dayName: "WED", dateStr: "MAY 6", tgt: 611, act: 590, pct: 97 },
        { dayName: "THU", dateStr: "MAY 7", tgt: 635, act: 530, pct: 83 },
      ],
      weekly: { tgt: 4511, act: 3970, pct: 88 },
    },
    {
      id: "az-9",
      store: "CHANDLER FASHION CENTER",
      manager: "ELENA ROSTOVA",
      market: "ARIZONA",
      mtd: { tgt: 19800, act: 20790, pct: 105 },
      fullMtd: { tgt: 19800, act: 20790, pct: 105 },
      days: [
        { dayName: "FRI", dateStr: "MAY 1", tgt: 891, act: 980, pct: 110 },
        { dayName: "SAT", dateStr: "MAY 2", tgt: 832, act: 1050, pct: 126 },
        { dayName: "SUN", dateStr: "MAY 3", tgt: 483, act: 490, pct: 101 },
        { dayName: "MON", dateStr: "MAY 4", tgt: 662, act: 710, pct: 107 },
        { dayName: "TUE", dateStr: "MAY 5", tgt: 628, act: 650, pct: 104 },
        { dayName: "WED", dateStr: "MAY 6", tgt: 654, act: 680, pct: 104 },
        { dayName: "THU", dateStr: "MAY 7", tgt: 680, act: 610, pct: 90 },
      ],
      weekly: { tgt: 4830, act: 5170, pct: 107 },
    },
  ];

  // Category multiplier to provide realistic numbers per category
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

  const mult = multiplierMap[category] || 1;

  return baseStores.map((store) => {
    // If not accessories, adjust the targets and actuals slightly
    if (category === "ACCESSORIES" && market === "ARIZONA") {
      return store;
    }

    const adjust = (val: number) => Math.max(1, Math.round(val * mult));
    const newMtdTgt = adjust(store.mtd.tgt);
    const newMtdAct = adjust(store.mtd.act);
    const newMtdPct = Math.round((newMtdAct / newMtdTgt) * 100);

    const newDays = store.days.map((d) => {
      const dt = adjust(d.tgt);
      const da = adjust(d.act);
      return {
        ...d,
        tgt: dt,
        act: da,
        pct: Math.round((da / dt) * 100),
      };
    });

    const weeklyTgt = newDays.reduce((sum, d) => sum + d.tgt, 0);
    const weeklyAct = newDays.reduce((sum, d) => sum + d.act, 0);
    const weeklyPct = Math.round((weeklyAct / weeklyTgt) * 100);

    return {
      ...store,
      market,
      mtd: { tgt: newMtdTgt, act: newMtdAct, pct: newMtdPct },
      fullMtd: { tgt: newMtdTgt, act: newMtdAct, pct: newMtdPct },
      days: newDays,
      weekly: { tgt: weeklyTgt, act: weeklyAct, pct: weeklyPct },
    };
  });
}

// Color badges for % achievements exactly as in screenshot
function renderPctBadge(pct: number) {
  let badgeClass = "";
  if (pct >= 100) {
    badgeClass =
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/50";
  } else if (pct >= 60) {
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
      {pct}%
    </span>
  );
}

type SortColumn = "store" | "mtdPct" | "fullMtdPct" | "weeklyPct";
type SortDirection = "asc" | "desc" | "normal";

export default function GoalsVsAchievementPage() {
  const [selectedMarket, setSelectedMarket] = useState<string>("ARIZONA");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("May");
  const [selectedWeek, setSelectedWeek] = useState<string>("Week 1 (May 1 - 7)");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<MetricKey>("ACCESSORIES");

  // Sorting
  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("normal");

  const rawData = useMemo(() => {
    return generateStoreData(activeCategory, selectedMarket);
  }, [activeCategory, selectedMarket]);

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
        (item) =>
          item.store.toLowerCase().includes(q) ||
          item.manager.toLowerCase().includes(q)
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

  // Overall calculations for Total Row
  const totalRow = useMemo(() => {
    if (filteredData.length === 0) return null;

    const mtdTgt = filteredData.reduce((sum, r) => sum + r.mtd.tgt, 0);
    const mtdAct = filteredData.reduce((sum, r) => sum + r.mtd.act, 0);
    const mtdPct = mtdTgt > 0 ? Math.round((mtdAct / mtdTgt) * 100) : 0;

    const fullMtdTgt = filteredData.reduce((sum, r) => sum + r.fullMtd.tgt, 0);
    const fullMtdAct = filteredData.reduce((sum, r) => sum + r.fullMtd.act, 0);
    const fullMtdPct = fullMtdTgt > 0 ? Math.round((fullMtdAct / fullMtdTgt) * 100) : 0;

    const dayTotals = filteredData[0].days.map((_, dayIdx) => {
      const dt = filteredData.reduce((sum, r) => sum + r.days[dayIdx].tgt, 0);
      const da = filteredData.reduce((sum, r) => sum + r.days[dayIdx].act, 0);
      const dp = dt > 0 ? Math.round((da / dt) * 100) : 0;
      return { tgt: dt, act: da, pct: dp };
    });

    const weeklyTgt = filteredData.reduce((sum, r) => sum + r.weekly.tgt, 0);
    const weeklyAct = filteredData.reduce((sum, r) => sum + r.weekly.act, 0);
    const weeklyPct = weeklyTgt > 0 ? Math.round((weeklyAct / weeklyTgt) * 100) : 0;

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
  }, [filteredData]);

  const handleResetFilters = () => {
    setSelectedMarket("ARIZONA");
    setSelectedYear("2026");
    setSelectedMonth("May");
    setSelectedWeek("Week 1 (May 1 - 7)");
    setSearchQuery("");
    setActiveCategory("ACCESSORIES");
    setSortCol(null);
    setSortDir("normal");
    toast.success("Filters reset to default");
  };

  const handleExportCSV = () => {
    const headers = [
      "Store",
      "Manager",
      "Market",
      "MTD Target",
      "MTD Actual",
      "MTD %",
      "Full MTD Target",
      "Full MTD Actual",
      "Full MTD %",
      "Fri May 1 Tgt",
      "Fri May 1 Act",
      "Fri May 1 %",
      "Sat May 2 Tgt",
      "Sat May 2 Act",
      "Sat May 2 %",
      "Sun May 3 Tgt",
      "Sun May 3 Act",
      "Sun May 3 %",
      "Mon May 4 Tgt",
      "Mon May 4 Act",
      "Mon May 4 %",
      "Tue May 5 Tgt",
      "Tue May 5 Act",
      "Tue May 5 %",
      "Wed May 6 Tgt",
      "Wed May 6 Act",
      "Wed May 6 %",
      "Thu May 7 Tgt",
      "Thu May 7 Act",
      "Thu May 7 %",
      "Weekly Target",
      "Weekly Actual",
      "Weekly %",
    ];

    const rows = filteredData.map((r) => [
      `"${r.store}"`,
      `"${r.manager}"`,
      `"${r.market}"`,
      r.mtd.tgt,
      r.mtd.act,
      `${r.mtd.pct}%`,
      r.fullMtd.tgt,
      r.fullMtd.act,
      `${r.fullMtd.pct}%`,
      ...r.days.flatMap((d) => [d.tgt, d.act, `${d.pct}%`]),
      r.weekly.tgt,
      r.weekly.act,
      `${r.weekly.pct}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Goals_vs_Achievement_${selectedMarket}_${activeCategory}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export downloaded successfully");
  };

  return (
    <ConfettiBackground>
      <div className="space-y-5 p-3 sm:p-5 max-w-[1680px] mx-auto animate-fade-in relative z-10">
        {/* Top Celebration Banner & Filter Card */}
        <div className="rounded-xl overflow-hidden shadow-lg border border-border/70 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white relative">
          <div className="absolute inset-0 bg-radial-at-t from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
            {/* Title & Market Subtitle */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-wider uppercase font-display text-white drop-shadow-sm flex items-center gap-2">
                    WEEKLY BREAKDOWN
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold tracking-widest text-amber-400/95 uppercase">
                    MARKET: {selectedMarket}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Controls Row matching user image */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Market Dropdown */}
              <div className="w-36 sm:w-40">
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
              <div className="w-24 sm:w-28">
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
              <div className="w-28 sm:w-32">
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
                  <SelectContent className="text-xs">
                    <SelectItem value="January">January</SelectItem>
                    <SelectItem value="February">February</SelectItem>
                    <SelectItem value="March">March</SelectItem>
                    <SelectItem value="April">April</SelectItem>
                    <SelectItem value="May">May</SelectItem>
                    <SelectItem value="June">June</SelectItem>
                    <SelectItem value="July">July</SelectItem>
                    <SelectItem value="August">August</SelectItem>
                    <SelectItem value="September">September</SelectItem>
                    <SelectItem value="October">October</SelectItem>
                    <SelectItem value="November">November</SelectItem>
                    <SelectItem value="December">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Week Dropdown */}
              <div className="w-44 sm:w-48">
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger
                    id="week-select"
                    className="bg-white text-zinc-900 font-bold text-xs h-9 border-0 shadow-sm focus:ring-amber-400"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <SelectValue placeholder="Week" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Week 1 (May 1 - 7)">
                      Week 1 (May 1 - 7)
                    </SelectItem>
                    <SelectItem value="Week 2 (May 8 - 14)">
                      Week 2 (May 8 - 14)
                    </SelectItem>
                    <SelectItem value="Week 3 (May 15 - 21)">
                      Week 3 (May 15 - 21)
                    </SelectItem>
                    <SelectItem value="Week 4 (May 22 - 28)">
                      Week 4 (May 22 - 28)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Store Name Input */}
              <div className="relative w-48 sm:w-60">
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

              {/* Quick Actions */}
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
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-none">
          {METRIC_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setActiveCategory(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-200 shrink-0 whitespace-nowrap shadow-xs ${
                  isActive
                    ? "bg-amber-400 text-zinc-950 ring-2 ring-amber-500/50 shadow-amber-400/20 shadow-md transform scale-[1.02]"
                    : "bg-card text-foreground hover:bg-muted/80 border border-border/80 hover:border-amber-400/50"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? "text-zinc-950" : "text-amber-500"
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main MIS Multi-tier Data Table Card */}
        <Card className="border border-border/80 shadow-md bg-card/95 backdrop-blur-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto relative">
              <table className="w-full text-xs border-collapse">
                {/* Header Row 1: High Level Groupings */}
                <thead>
                  <tr className="bg-muted/90 dark:bg-zinc-900/90 text-foreground border-b border-border text-[11px] font-bold tracking-wider uppercase">
                    {/* Sticky Store / Manager Column */}
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-30 bg-muted dark:bg-zinc-900 px-4 py-3 text-left min-w-[200px] border-r border-border shadow-xs"
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

                    {/* 7 Days of the Week */}
                    {rawData[0]?.days.map((d, idx) => (
                      <th
                        key={idx}
                        colSpan={3}
                        className="px-3 py-2 text-center border-r border-border bg-muted/40"
                      >
                        <div className="font-bold text-foreground">
                          {d.dayName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium">
                          {d.dateStr}
                        </div>
                      </th>
                    ))}

                    {/* WEEKLY */}
                    <th
                      colSpan={3}
                      className="px-3 py-2 text-center bg-amber-50/60 dark:bg-amber-950/20"
                    >
                      WEEKLY
                    </th>
                  </tr>

                  {/* Header Row 2: Sub-headers (TGT, ACT, %) */}
                  <tr className="bg-muted/60 dark:bg-zinc-900/60 text-muted-foreground border-b border-border/80 text-[10px] font-semibold">
                    {/* Under MTD */}
                    <th className="px-2 py-1.5 text-center">TGT</th>
                    <th className="px-2 py-1.5 text-center">ACT</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("mtdPct")}
                    >
                      %
                    </th>

                    {/* Under FULL MTD */}
                    <th className="px-2 py-1.5 text-center">TGT</th>
                    <th className="px-2 py-1.5 text-center">ACT</th>
                    <th
                      className="px-2 py-1.5 text-center border-r border-border cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("fullMtdPct")}
                    >
                      %
                    </th>

                    {/* Under Days 1 to 7 */}
                    {rawData[0]?.days.map((_, idx) => (
                      <React.Fragment key={idx}>
                        <th className="px-2 py-1.5 text-center">TGT</th>
                        <th className="px-2 py-1.5 text-center">ACT</th>
                        <th className="px-2 py-1.5 text-center border-r border-border">
                          %
                        </th>
                      </React.Fragment>
                    ))}

                    {/* Under WEEKLY */}
                    <th className="px-2 py-1.5 text-center font-bold text-foreground">
                      TGT
                    </th>
                    <th className="px-2 py-1.5 text-center font-bold text-foreground">
                      ACT
                    </th>
                    <th
                      className="px-2 py-1.5 text-center font-bold text-foreground cursor-pointer hover:text-amber-600"
                      onClick={() => handleSort("weeklyPct")}
                    >
                      %
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-border/60 font-medium">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={31}
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
                          index % 2 === 1
                            ? "bg-muted/20 dark:bg-zinc-900/30"
                            : "bg-card"
                        }`}
                      >
                        {/* Sticky Store & Manager Cell */}
                        <td className="sticky left-0 z-20 bg-inherit px-4 py-2.5 border-r border-border whitespace-nowrap shadow-xs">
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
                          {renderPctBadge(row.mtd.pct)}
                        </td>

                        {/* FULL MTD Metrics */}
                        <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                          {row.fullMtd.tgt}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          {row.fullMtd.act}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border">
                          {renderPctBadge(row.fullMtd.pct)}
                        </td>

                        {/* 7 Daily Metrics */}
                        {row.days.map((day, dIdx) => (
                          <React.Fragment key={dIdx}>
                            <td className="px-2 py-2 text-center font-mono text-zinc-600 dark:text-zinc-400">
                              {day.tgt}
                            </td>
                            <td className="px-2 py-2 text-center font-mono font-medium text-zinc-900 dark:text-zinc-100">
                              {day.act}
                            </td>
                            <td className="px-2 py-2 text-center border-r border-border">
                              {renderPctBadge(day.pct)}
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
                          {renderPctBadge(row.weekly.pct)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Table Footer: Total / Summary Row */}
                {totalRow && (
                  <tfoot>
                    <tr className="bg-zinc-100 dark:bg-zinc-900 border-t-2 border-border font-bold text-foreground">
                      <td className="sticky left-0 z-20 bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border-r border-border text-left uppercase tracking-wider text-xs">
                        TOTAL / AVERAGE
                      </td>

                      {/* MTD Total */}
                      <td className="px-2 py-2 text-center font-mono">
                        {totalRow.mtdTgt}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {totalRow.mtdAct}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderPctBadge(totalRow.mtdPct)}
                      </td>

                      {/* FULL MTD Total */}
                      <td className="px-2 py-2 text-center font-mono">
                        {totalRow.fullMtdTgt}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {totalRow.fullMtdAct}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderPctBadge(totalRow.fullMtdPct)}
                      </td>

                      {/* 7 Days Totals */}
                      {totalRow.dayTotals.map((dt, dIdx) => (
                        <React.Fragment key={dIdx}>
                          <td className="px-2 py-2 text-center font-mono">
                            {dt.tgt}
                          </td>
                          <td className="px-2 py-2 text-center font-mono">
                            {dt.act}
                          </td>
                          <td className="px-2 py-2 text-center border-r border-border">
                            {renderPctBadge(dt.pct)}
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
                        {renderPctBadge(totalRow.weeklyPct)}
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
