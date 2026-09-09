import React, { useState, useMemo } from "react";
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
  Download,
  Store,
  Calendar,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { toast } from "sonner";

// Types
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

export interface SpecialReportStoreRecord {
  id: string;
  store: string;
  manager: string;
  market: string;
  // Tab 1: Summary Columns
  summary: {
    fullMonth: MetricQuad;
    mtd: MetricQuad;
    voice: MetricQuad;
    upgrade: MetricQuad;
    bts: MetricQuad;
    hsi: MetricQuad;
    mim: MetricQuad;
    acc: MetricQuad;
  };
  // Tab 2: DCS vs RTBDI Columns
  dcsVsRt: {
    fmtdAch: MetricQuint;
    voice: MetricQuint;
    bts: MetricQuint;
    hsi: MetricQuint;
    mim: MetricQuint;
  };
}

const MARKETS = ["ALL MARKETS", "ARIZONA", "TEXAS", "FLORIDA", "CALIFORNIA", "NEVADA", "NEW YORK"];

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

// Base Store Catalog with manager & market associations
const STORE_CATALOG = [
  { id: "az-1", store: "N ARIZONA AVE", manager: "ALI KHAN", market: "ARIZONA", baseVol: 1.15 },
  {
    id: "az-2",
    store: "3202 E GREENWAY RD",
    manager: "ALI KHAN",
    market: "ARIZONA",
    baseVol: 0.75,
  },
  { id: "az-3", store: "W VAN BUREN ST", manager: "ALI KHAN", market: "ARIZONA", baseVol: 1.85 },
  {
    id: "az-4",
    store: "6430 W GLENDALE AVE",
    manager: "ALI KHAN",
    market: "ARIZONA",
    baseVol: 0.88,
  },
  { id: "az-5", store: "N 75TH AVE", manager: "ALI KHAN", market: "ARIZONA", baseVol: 1.2 },
  {
    id: "az-6",
    store: "8129 NORTH 35TH AVENUE",
    manager: "ALI KHAN",
    market: "ARIZONA",
    baseVol: 0.65,
  },
  {
    id: "az-7",
    store: "SCOTTSDALE PAVILIONS",
    manager: "SARAH JENKINS",
    market: "ARIZONA",
    baseVol: 1.45,
  },
  {
    id: "az-8",
    store: "CAMELBACK COLONNADE",
    manager: "MARCUS VANCE",
    market: "ARIZONA",
    baseVol: 1.05,
  },
  {
    id: "tx-1",
    store: "WESTHEIMER RD GALLERIA",
    manager: "DAVID MARTINEZ",
    market: "TEXAS",
    baseVol: 1.5,
  },
  {
    id: "tx-2",
    store: "DALLAS MAIN ST DOWNTOWN",
    manager: "CARLOS REYES",
    market: "TEXAS",
    baseVol: 1.25,
  },
  {
    id: "tx-3",
    store: "ARGYLE SQUARE AUSTIN",
    manager: "JESSICA TAYLOR",
    market: "TEXAS",
    baseVol: 0.95,
  },
  {
    id: "fl-1",
    store: "BRICKELL FINANCIAL MIAMI",
    manager: "ELENA ROSTOVA",
    market: "FLORIDA",
    baseVol: 1.6,
  },
  {
    id: "fl-2",
    store: "ORLANDO MILLENIA MALL",
    manager: "MARIO MORENO",
    market: "FLORIDA",
    baseVol: 1.1,
  },
  {
    id: "ca-1",
    store: "SUNSET BLVD LOS ANGELES",
    manager: "KENJI SATO",
    market: "CALIFORNIA",
    baseVol: 1.7,
  },
  {
    id: "ca-2",
    store: "MARKET ST SAN FRANCISCO",
    manager: "RACHEL WEISS",
    market: "CALIFORNIA",
    baseVol: 1.35,
  },
  {
    id: "nv-1",
    store: "LAS VEGAS STRIP PAVILION",
    manager: "BRAD HARMON",
    market: "NEVADA",
    baseVol: 1.65,
  },
  {
    id: "ny-1",
    store: "TIMES SQUARE 42ND ST",
    manager: "MICHAEL BROOKS",
    market: "NEW YORK",
    baseVol: 1.9,
  },
  {
    id: "ny-2",
    store: "BROOKLYN FLATBUSH AVE",
    manager: "TARIQ AHMAD",
    market: "NEW YORK",
    baseVol: 1.0,
  },
];

function buildQuad(tgt: number, act: number): MetricQuad {
  const diff = act - tgt;
  const pct = tgt > 0 ? Math.round((act / tgt) * 100) : 0;
  return { tgt, act, diff, pct };
}

function buildQuint(tgt: number, dcs: number, rtDiscrepancy: number): MetricQuint {
  const pct = tgt > 0 ? Math.round((dcs / tgt) * 100) : 0;
  const rt = Math.max(0, dcs + rtDiscrepancy);
  const diff = dcs - rt;
  return { tgt, dcs, pct, rt, diff };
}

// Generate realistic data for all stores based on year and month
function generateSpecialReportData(yearStr: string, monthStr: string): SpecialReportStoreRecord[] {
  const year = parseInt(yearStr, 10) || 2026;
  const monthIdx = MONTH_NAMES.indexOf(monthStr);
  const mIdx = monthIdx >= 0 ? monthIdx : 8;

  // Realistic performance variation multipliers
  const performanceProfiles = [
    { name: "high", factor: 1.18, dcsRtDrift: 1 },
    { name: "mid", factor: 0.92, dcsRtDrift: -2 },
    { name: "stellar", factor: 1.42, dcsRtDrift: 0 },
    { name: "struggling", factor: 0.62, dcsRtDrift: 3 },
    { name: "onTarget", factor: 1.02, dcsRtDrift: -1 },
    { name: "low", factor: 0.58, dcsRtDrift: 0 },
  ];

  return STORE_CATALOG.map((st, idx) => {
    const prof = performanceProfiles[(idx + mIdx + (year % 5)) % performanceProfiles.length];
    const vol = st.baseVol;

    // Target scales for each metric
    const fullMonthTgt = Math.round(2800 * vol);
    const fullMonthAct = Math.round(fullMonthTgt * prof.factor);

    const mtdTgt = Math.round(950 * vol);
    const mtdAct = Math.round(mtdTgt * prof.factor);

    const voiceTgt = Math.round(180 * vol);
    const voiceAct = Math.round(voiceTgt * (prof.factor + ((idx % 3) - 1) * 0.08));

    const upgradeTgt = Math.round(130 * vol);
    const upgradeAct = Math.round(upgradeTgt * (prof.factor - (idx % 2 === 0 ? 0.05 : -0.06)));

    const btsTgt = Math.round(90 * vol);
    const btsAct = Math.round(btsTgt * (prof.factor + ((idx % 4) - 2) * 0.06));

    const hsiTgt = Math.round(55 * vol);
    const hsiAct = Math.round(hsiTgt * (prof.factor + (idx % 3 === 0 ? 0.12 : -0.1)));

    const mimTgt = Math.round(40 * vol);
    const mimAct = Math.round(mimTgt * (prof.factor + (idx % 2 === 1 ? 0.15 : -0.08)));

    const accTgt = Math.round(1250 * vol);
    const accAct = Math.round(accTgt * (prof.factor + 0.04));

    // DCS vs RTBDI metrics
    const fmtdTgt = Math.round(2400 * vol);
    const fmtdDcs = Math.round(fmtdTgt * prof.factor);
    const fmtdRtDrift = prof.dcsRtDrift * 3;

    const voiceDcs = Math.round(voiceTgt * prof.factor);
    const voiceRtDrift = prof.dcsRtDrift;

    const btsDcs = Math.round(btsTgt * (prof.factor + 0.02));
    const btsRtDrift = (idx % 3) - 1;

    const hsiDcs = Math.round(hsiTgt * (prof.factor - 0.03));
    const hsiRtDrift = idx % 2 === 0 ? 1 : 0;

    const mimDcs = Math.round(mimTgt * (prof.factor + 0.05));
    const mimRtDrift = idx % 3 === 0 ? -1 : 0;

    return {
      id: st.id,
      store: st.store,
      manager: st.manager,
      market: st.market,
      summary: {
        fullMonth: buildQuad(fullMonthTgt, fullMonthAct),
        mtd: buildQuad(mtdTgt, mtdAct),
        voice: buildQuad(voiceTgt, voiceAct),
        upgrade: buildQuad(upgradeTgt, upgradeAct),
        bts: buildQuad(btsTgt, btsAct),
        hsi: buildQuad(hsiTgt, hsiAct),
        mim: buildQuad(mimTgt, mimAct),
        acc: buildQuad(accTgt, accAct),
      },
      dcsVsRt: {
        fmtdAch: buildQuint(fmtdTgt, fmtdDcs, fmtdRtDrift),
        voice: buildQuint(voiceTgt, voiceDcs, voiceRtDrift),
        bts: buildQuint(btsTgt, btsDcs, btsRtDrift),
        hsi: buildQuint(hsiTgt, hsiDcs, hsiRtDrift),
        mim: buildQuint(mimTgt, mimDcs, mimRtDrift),
      },
    };
  });
}

// Percentage Badge Component following the strict Red, Yellow, Green color rule:
// <= 70% : Red
// 71% - 99% : Yellow
// >= 100% : Green
function renderPctBadge(pct: number) {
  let badgeClass = "";
  if (pct <= 70) {
    badgeClass =
      "bg-[#fee2e2] text-[#991b1b] border border-[#fca5a5] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
  } else if (pct < 100) {
    badgeClass =
      "bg-[#fef9c3] text-[#854d0e] border border-[#fde047] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
  } else {
    badgeClass =
      "bg-[#dcfce7] text-[#166534] border border-[#86efac] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800";
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-extrabold px-2.5 py-0.5 rounded-lg text-xs min-w-[50px] shadow-2xs ${badgeClass}`}
    >
      {pct}%
    </span>
  );
}

// Formatter for differences (+ / - / 0)
function renderDiff(diff: number) {
  if (diff > 0) {
    return (
      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+{diff}</span>
    );
  }
  if (diff < 0) {
    return <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{diff}</span>;
  }
  return <span className="font-mono text-muted-foreground font-semibold">0</span>;
}

export default function SpecialReportPage() {
  const [activeTab, setActiveTab] = useState<SpecialReportTab>("SUMMARY");
  const [selectedMarket, setSelectedMarket] = useState<string>("ALL MARKETS");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("September");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sorting state
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Raw dataset
  const rawData = useMemo(() => {
    return generateSpecialReportData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    let list = rawData;

    // Filter by market
    if (selectedMarket !== "ALL MARKETS") {
      list = list.filter((r) => r.market.toUpperCase() === selectedMarket.toUpperCase());
    }

    // Filter by search query (store or manager)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.store.toLowerCase().includes(q) ||
          r.manager.toLowerCase().includes(q) ||
          r.market.toLowerCase().includes(q),
      );
    }

    // Sorting
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
        if (sortCol === "market") {
          return sortDir === "asc"
            ? a.market.localeCompare(b.market)
            : b.market.localeCompare(a.market);
        }

        // Summary Tab Sorts
        if (sortCol === "fullMonthPct") {
          return sortDir === "asc"
            ? a.summary.fullMonth.pct - b.summary.fullMonth.pct
            : b.summary.fullMonth.pct - a.summary.fullMonth.pct;
        }
        if (sortCol === "mtdPct") {
          return sortDir === "asc"
            ? a.summary.mtd.pct - b.summary.mtd.pct
            : b.summary.mtd.pct - a.summary.mtd.pct;
        }
        if (sortCol === "voicePct") {
          return sortDir === "asc"
            ? a.summary.voice.pct - b.summary.voice.pct
            : b.summary.voice.pct - a.summary.voice.pct;
        }
        if (sortCol === "upgradePct") {
          return sortDir === "asc"
            ? a.summary.upgrade.pct - b.summary.upgrade.pct
            : b.summary.upgrade.pct - a.summary.upgrade.pct;
        }
        if (sortCol === "btsPct") {
          return sortDir === "asc"
            ? a.summary.bts.pct - b.summary.bts.pct
            : b.summary.bts.pct - a.summary.bts.pct;
        }
        if (sortCol === "hsiPct") {
          return sortDir === "asc"
            ? a.summary.hsi.pct - b.summary.hsi.pct
            : b.summary.hsi.pct - a.summary.hsi.pct;
        }
        if (sortCol === "mimPct") {
          return sortDir === "asc"
            ? a.summary.mim.pct - b.summary.mim.pct
            : b.summary.mim.pct - a.summary.mim.pct;
        }
        if (sortCol === "accPct") {
          return sortDir === "asc"
            ? a.summary.acc.pct - b.summary.acc.pct
            : b.summary.acc.pct - a.summary.acc.pct;
        }

        // DCS vs RTBDI Sorts
        if (sortCol === "dcsFmtdPct") {
          return sortDir === "asc"
            ? a.dcsVsRt.fmtdAch.pct - b.dcsVsRt.fmtdAch.pct
            : b.dcsVsRt.fmtdAch.pct - a.dcsVsRt.fmtdAch.pct;
        }
        if (sortCol === "dcsVoicePct") {
          return sortDir === "asc"
            ? a.dcsVsRt.voice.pct - b.dcsVsRt.voice.pct
            : b.dcsVsRt.voice.pct - a.dcsVsRt.voice.pct;
        }
        if (sortCol === "dcsBtsPct") {
          return sortDir === "asc"
            ? a.dcsVsRt.bts.pct - b.dcsVsRt.bts.pct
            : b.dcsVsRt.bts.pct - a.dcsVsRt.bts.pct;
        }
        if (sortCol === "dcsHsiPct") {
          return sortDir === "asc"
            ? a.dcsVsRt.hsi.pct - b.dcsVsRt.hsi.pct
            : b.dcsVsRt.hsi.pct - a.dcsVsRt.hsi.pct;
        }
        if (sortCol === "dcsMimPct") {
          return sortDir === "asc"
            ? a.dcsVsRt.mim.pct - b.dcsVsRt.mim.pct
            : b.dcsVsRt.mim.pct - a.dcsVsRt.mim.pct;
        }

        return 0;
      });
    }

    return list;
  }, [rawData, selectedMarket, searchQuery, sortCol, sortDir]);

  // Aggregates for Total / Average row
  const summaryTotals = useMemo(() => {
    if (filteredData.length === 0) return null;

    const sumQuad = (key: keyof SpecialReportStoreRecord["summary"]): MetricQuad => {
      let tgt = 0;
      let act = 0;
      filteredData.forEach((row) => {
        tgt += row.summary[key].tgt;
        act += row.summary[key].act;
      });
      const diff = act - tgt;
      const pct = tgt > 0 ? Math.round((act / tgt) * 100) : 0;
      return { tgt, act, diff, pct };
    };

    return {
      fullMonth: sumQuad("fullMonth"),
      mtd: sumQuad("mtd"),
      voice: sumQuad("voice"),
      upgrade: sumQuad("upgrade"),
      bts: sumQuad("bts"),
      hsi: sumQuad("hsi"),
      mim: sumQuad("mim"),
      acc: sumQuad("acc"),
    };
  }, [filteredData]);

  const dcsVsRtTotals = useMemo(() => {
    if (filteredData.length === 0) return null;

    const sumQuint = (key: keyof SpecialReportStoreRecord["dcsVsRt"]): MetricQuint => {
      let tgt = 0;
      let dcs = 0;
      let rt = 0;
      filteredData.forEach((row) => {
        tgt += row.dcsVsRt[key].tgt;
        dcs += row.dcsVsRt[key].dcs;
        rt += row.dcsVsRt[key].rt;
      });
      const pct = tgt > 0 ? Math.round((dcs / tgt) * 100) : 0;
      const diff = dcs - rt;
      return { tgt, dcs, pct, rt, diff };
    };

    return {
      fmtdAch: sumQuint("fmtdAch"),
      voice: sumQuint("voice"),
      bts: sumQuint("bts"),
      hsi: sumQuint("hsi"),
      mim: sumQuint("mim"),
    };
  }, [filteredData]);

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
    setSelectedMarket("ALL MARKETS");
    setSelectedYear("2026");
    setSelectedMonth("September");
    setSearchQuery("");
    setSortCol(null);
    setSortDir("desc");
    toast.info("Filters reset to default");
  };

  const handleExportCSV = () => {
    if (activeTab === "SUMMARY") {
      const headers = [
        "Store",
        "Manager",
        "Market",
        // FULL MONTH
        "Full Month Tgt",
        "Full Month Act",
        "Full Month Diff",
        "Full Month %",
        // MTD
        "MTD Tgt",
        "MTD Act",
        "MTD Diff",
        "MTD %",
        // VOICE
        "Voice Tgt",
        "Voice Act",
        "Voice Diff",
        "Voice %",
        // UPGRADE
        "Upgrade Tgt",
        "Upgrade Act",
        "Upgrade Diff",
        "Upgrade %",
        // BTS
        "BTS Tgt",
        "BTS Act",
        "BTS Diff",
        "BTS %",
        // HSI
        "HSI Tgt",
        "HSI Act",
        "HSI Diff",
        "HSI %",
        // MIM
        "MIM Tgt",
        "MIM Act",
        "MIM Diff",
        "MIM %",
        // ACC
        "ACC Tgt",
        "ACC Act",
        "ACC Diff",
        "ACC %",
      ];

      const rows = filteredData.map((r) => [
        `"${r.store}"`,
        `"${r.manager}"`,
        `"${r.market}"`,
        r.summary.fullMonth.tgt,
        r.summary.fullMonth.act,
        r.summary.fullMonth.diff,
        `${r.summary.fullMonth.pct}%`,
        r.summary.mtd.tgt,
        r.summary.mtd.act,
        r.summary.mtd.diff,
        `${r.summary.mtd.pct}%`,
        r.summary.voice.tgt,
        r.summary.voice.act,
        r.summary.voice.diff,
        `${r.summary.voice.pct}%`,
        r.summary.upgrade.tgt,
        r.summary.upgrade.act,
        r.summary.upgrade.diff,
        `${r.summary.upgrade.pct}%`,
        r.summary.bts.tgt,
        r.summary.bts.act,
        r.summary.bts.diff,
        `${r.summary.bts.pct}%`,
        r.summary.hsi.tgt,
        r.summary.hsi.act,
        r.summary.hsi.diff,
        `${r.summary.hsi.pct}%`,
        r.summary.mim.tgt,
        r.summary.mim.act,
        r.summary.mim.diff,
        `${r.summary.mim.pct}%`,
        r.summary.acc.tgt,
        r.summary.acc.act,
        r.summary.acc.diff,
        `${r.summary.acc.pct}%`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Special_Report_Summary_${selectedMarket}_${selectedMonth}_${selectedYear}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Summary report exported to CSV");
      return;
    }

    // DCS vs RTBDI CSV
    const headers = [
      "Store",
      "Manager",
      "Market",
      // FMTD ACHIEVEMENT
      "FMTD Tgt",
      "FMTD Dcs",
      "FMTD %",
      "FMTD Rt",
      "FMTD Diff",
      // VOICE
      "Voice Tgt",
      "Voice Dcs",
      "Voice %",
      "Voice Rt",
      "Voice Diff",
      // BTS
      "BTS Tgt",
      "BTS Dcs",
      "BTS %",
      "BTS Rt",
      "BTS Diff",
      // HSI
      "HSI Tgt",
      "HSI Dcs",
      "HSI %",
      "HSI Rt",
      "HSI Diff",
      // MIM
      "MIM Tgt",
      "MIM Dcs",
      "MIM %",
      "MIM Rt",
      "MIM Diff",
    ];

    const rows = filteredData.map((r) => [
      `"${r.store}"`,
      `"${r.manager}"`,
      `"${r.market}"`,
      r.dcsVsRt.fmtdAch.tgt,
      r.dcsVsRt.fmtdAch.dcs,
      `${r.dcsVsRt.fmtdAch.pct}%`,
      r.dcsVsRt.fmtdAch.rt,
      r.dcsVsRt.fmtdAch.diff,
      r.dcsVsRt.voice.tgt,
      r.dcsVsRt.voice.dcs,
      `${r.dcsVsRt.voice.pct}%`,
      r.dcsVsRt.voice.rt,
      r.dcsVsRt.voice.diff,
      r.dcsVsRt.bts.tgt,
      r.dcsVsRt.bts.dcs,
      `${r.dcsVsRt.bts.pct}%`,
      r.dcsVsRt.bts.rt,
      r.dcsVsRt.bts.diff,
      r.dcsVsRt.hsi.tgt,
      r.dcsVsRt.hsi.dcs,
      `${r.dcsVsRt.hsi.pct}%`,
      r.dcsVsRt.hsi.rt,
      r.dcsVsRt.hsi.diff,
      r.dcsVsRt.mim.tgt,
      r.dcsVsRt.mim.dcs,
      `${r.dcsVsRt.mim.pct}%`,
      r.dcsVsRt.mim.rt,
      r.dcsVsRt.mim.diff,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Special_Report_DCS_vs_RTBDI_${selectedMarket}_${selectedMonth}_${selectedYear}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("DCS vs RTBDI report exported to CSV");
  };

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
                    MARKET: {selectedMarket}
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
                      <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <SelectValue placeholder="Market" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    {MARKETS.map((m) => (
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

              {/* Search Store Name Input */}
              <div className="relative w-44 sm:w-52">
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
          </button>
        </div>

        {/* Quick KPI Cards Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                Active Stores
              </div>
              <div className="text-base font-bold text-foreground">{filteredData.length}</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                {activeTab === "SUMMARY" ? "MTD Achieved" : "DCS Total"}
              </div>
              <div className="text-base font-bold text-foreground">
                {activeTab === "SUMMARY"
                  ? (summaryTotals?.mtd.act ?? 0).toLocaleString()
                  : (dcsVsRtTotals?.fmtdAch.dcs ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                {activeTab === "SUMMARY" ? "MTD % Target" : "FMTD % Target"}
              </div>
              <div className="text-base font-bold text-foreground">
                {activeTab === "SUMMARY"
                  ? `${summaryTotals?.mtd.pct ?? 0}%`
                  : `${dcsVsRtTotals?.fmtdAch.pct ?? 0}%`}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                {activeTab === "SUMMARY" ? "Net Discrepancy" : "DCS vs RT Diff"}
              </div>
              <div className="text-base font-bold text-foreground">
                {activeTab === "SUMMARY"
                  ? (summaryTotals?.mtd.diff ?? 0) >= 0
                    ? `+${summaryTotals?.mtd.diff ?? 0}`
                    : `${summaryTotals?.mtd.diff ?? 0}`
                  : (dcsVsRtTotals?.fmtdAch.diff ?? 0) >= 0
                    ? `+${dcsVsRtTotals?.fmtdAch.diff ?? 0}`
                    : `${dcsVsRtTotals?.fmtdAch.diff ?? 0}`}
              </div>
            </div>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden isolate relative z-0">
          <div className="overflow-x-auto max-w-full">
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
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "SUMMARY" ? 33 : 26}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No stores found matching your query "{searchQuery}".
                    </td>
                  </tr>
                ) : activeTab === "SUMMARY" ? (
                  /* TAB 1: SUMMARY DATA ROWS */
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
                        {row.summary.fullMonth.tgt}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold">
                        {row.summary.fullMonth.act}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.summary.fullMonth.diff)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderPctBadge(row.summary.fullMonth.pct)}
                      </td>

                      {/* MONTH TO DATE (Tgt, Act, Diff, %) */}
                      <td className="px-2 py-2 text-center font-mono">{row.summary.mtd.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold">
                        {row.summary.mtd.act}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.summary.mtd.diff)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderPctBadge(row.summary.mtd.pct)}
                      </td>

                      {/* VOICE (Tgt, Act, Diff, %) */}
                      <td className="px-2 py-2 text-center font-mono">{row.summary.voice.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold">
                        {row.summary.voice.act}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.summary.voice.diff)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderPctBadge(row.summary.voice.pct)}
                      </td>

                      {/* UPGRADE (Tgt, Act, Diff, %) */}
                      <td className="px-2 py-2 text-center font-mono">{row.summary.upgrade.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold">
                        {row.summary.upgrade.act}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.summary.upgrade.diff)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderPctBadge(row.summary.upgrade.pct)}
                      </td>

                      {/* BTS (Tgt, Act, Diff, %) */}
                      <td className="px-2 py-2 text-center font-mono">{row.summary.bts.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold">
                        {row.summary.bts.act}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.summary.bts.diff)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderPctBadge(row.summary.bts.pct)}
                      </td>

                      {/* HSI (Tgt, Act, Diff, %) */}
                      <td className="px-2 py-2 text-center font-mono">{row.summary.hsi.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold">
                        {row.summary.hsi.act}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.summary.hsi.diff)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderPctBadge(row.summary.hsi.pct)}
                      </td>

                      {/* MIM (Tgt, Act, Diff, %) */}
                      <td className="px-2 py-2 text-center font-mono">{row.summary.mim.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold">
                        {row.summary.mim.act}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.summary.mim.diff)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-border">
                        {renderPctBadge(row.summary.mim.pct)}
                      </td>

                      {/* ACC (Tgt, Act, Diff, %) */}
                      <td className="px-2 py-2 text-center font-mono">{row.summary.acc.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold">
                        {row.summary.acc.act}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.summary.acc.diff)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {renderPctBadge(row.summary.acc.pct)}
                      </td>
                    </tr>
                  ))
                ) : (
                  /* TAB 2: DCS VS RTBDI DATA ROWS */
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
                      <td className="px-2 py-2 text-center font-mono">{row.dcsVsRt.fmtdAch.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.dcsVsRt.fmtdAch.dcs}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {renderPctBadge(row.dcsVsRt.fmtdAch.pct)}
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.dcsVsRt.fmtdAch.rt}
                      </td>
                      <td className="px-2 py-2 text-center font-mono border-r border-border">
                        {renderDiff(row.dcsVsRt.fmtdAch.diff)}
                      </td>

                      {/* VOICE (Tgt, Dcs, %, Rt, Diff) */}
                      <td className="px-2 py-2 text-center font-mono">{row.dcsVsRt.voice.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.dcsVsRt.voice.dcs}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {renderPctBadge(row.dcsVsRt.voice.pct)}
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.dcsVsRt.voice.rt}
                      </td>
                      <td className="px-2 py-2 text-center font-mono border-r border-border">
                        {renderDiff(row.dcsVsRt.voice.diff)}
                      </td>

                      {/* BTS (Tgt, Dcs, %, Rt, Diff) */}
                      <td className="px-2 py-2 text-center font-mono">{row.dcsVsRt.bts.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.dcsVsRt.bts.dcs}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {renderPctBadge(row.dcsVsRt.bts.pct)}
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.dcsVsRt.bts.rt}
                      </td>
                      <td className="px-2 py-2 text-center font-mono border-r border-border">
                        {renderDiff(row.dcsVsRt.bts.diff)}
                      </td>

                      {/* HSI (Tgt, Dcs, %, Rt, Diff) */}
                      <td className="px-2 py-2 text-center font-mono">{row.dcsVsRt.hsi.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.dcsVsRt.hsi.dcs}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {renderPctBadge(row.dcsVsRt.hsi.pct)}
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.dcsVsRt.hsi.rt}
                      </td>
                      <td className="px-2 py-2 text-center font-mono border-r border-border">
                        {renderDiff(row.dcsVsRt.hsi.diff)}
                      </td>

                      {/* MIM (Tgt, Dcs, %, Rt, Diff) */}
                      <td className="px-2 py-2 text-center font-mono">{row.dcsVsRt.mim.tgt}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {row.dcsVsRt.mim.dcs}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {renderPctBadge(row.dcsVsRt.mim.pct)}
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.dcsVsRt.mim.rt}
                      </td>
                      <td className="px-2 py-2 text-center font-mono">
                        {renderDiff(row.dcsVsRt.mim.diff)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* TABLE FOOTER: TOTAL / AVERAGE ROW */}
              <tfoot>
                {activeTab === "SUMMARY" && summaryTotals ? (
                  <tr className="bg-zinc-100 dark:bg-zinc-900 border-t-2 border-border font-bold text-foreground">
                    <td className="sticky left-0 z-10 bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border-r border-border text-left uppercase tracking-wider text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                      TOTAL / AVERAGE
                    </td>

                    {/* FULL MONTH TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {summaryTotals.fullMonth.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {summaryTotals.fullMonth.act.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {renderDiff(summaryTotals.fullMonth.diff)}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-border">
                      {renderPctBadge(summaryTotals.fullMonth.pct)}
                    </td>

                    {/* MONTH TO DATE TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {summaryTotals.mtd.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {summaryTotals.mtd.act.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {renderDiff(summaryTotals.mtd.diff)}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-border">
                      {renderPctBadge(summaryTotals.mtd.pct)}
                    </td>

                    {/* VOICE TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {summaryTotals.voice.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {summaryTotals.voice.act.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {renderDiff(summaryTotals.voice.diff)}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-border">
                      {renderPctBadge(summaryTotals.voice.pct)}
                    </td>

                    {/* UPGRADE TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {summaryTotals.upgrade.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {summaryTotals.upgrade.act.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {renderDiff(summaryTotals.upgrade.diff)}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-border">
                      {renderPctBadge(summaryTotals.upgrade.pct)}
                    </td>

                    {/* BTS TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {summaryTotals.bts.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {summaryTotals.bts.act.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {renderDiff(summaryTotals.bts.diff)}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-border">
                      {renderPctBadge(summaryTotals.bts.pct)}
                    </td>

                    {/* HSI TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {summaryTotals.hsi.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {summaryTotals.hsi.act.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {renderDiff(summaryTotals.hsi.diff)}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-border">
                      {renderPctBadge(summaryTotals.hsi.pct)}
                    </td>

                    {/* MIM TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {summaryTotals.mim.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {summaryTotals.mim.act.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {renderDiff(summaryTotals.mim.diff)}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-border">
                      {renderPctBadge(summaryTotals.mim.pct)}
                    </td>

                    {/* ACC TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {summaryTotals.acc.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {summaryTotals.acc.act.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {renderDiff(summaryTotals.acc.diff)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {renderPctBadge(summaryTotals.acc.pct)}
                    </td>
                  </tr>
                ) : activeTab === "DCS_VS_RTBDI" && dcsVsRtTotals ? (
                  <tr className="bg-zinc-100 dark:bg-zinc-900 border-t-2 border-border font-bold text-foreground">
                    <td className="sticky left-0 z-10 bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border-r border-border text-left uppercase tracking-wider text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                      TOTAL / AVERAGE
                    </td>

                    {/* FMTD TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.fmtdAch.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {dcsVsRtTotals.fmtdAch.dcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {renderPctBadge(dcsVsRtTotals.fmtdAch.pct)}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.fmtdAch.rt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono border-r border-border">
                      {renderDiff(dcsVsRtTotals.fmtdAch.diff)}
                    </td>

                    {/* VOICE TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.voice.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {dcsVsRtTotals.voice.dcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {renderPctBadge(dcsVsRtTotals.voice.pct)}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.voice.rt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono border-r border-border">
                      {renderDiff(dcsVsRtTotals.voice.diff)}
                    </td>

                    {/* BTS TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.bts.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {dcsVsRtTotals.bts.dcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {renderPctBadge(dcsVsRtTotals.bts.pct)}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.bts.rt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono border-r border-border">
                      {renderDiff(dcsVsRtTotals.bts.diff)}
                    </td>

                    {/* HSI TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.hsi.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {dcsVsRtTotals.hsi.dcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {renderPctBadge(dcsVsRtTotals.hsi.pct)}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.hsi.rt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono border-r border-border">
                      {renderDiff(dcsVsRtTotals.hsi.diff)}
                    </td>

                    {/* MIM TOTAL */}
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.mim.tgt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black">
                      {dcsVsRtTotals.mim.dcs.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {renderPctBadge(dcsVsRtTotals.mim.pct)}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {dcsVsRtTotals.mim.rt.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-center font-mono">
                      {renderDiff(dcsVsRtTotals.mim.diff)}
                    </td>
                  </tr>
                ) : null}
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </ConfettiBackground>
  );
}
