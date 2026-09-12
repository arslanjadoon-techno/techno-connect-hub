import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CrudPage } from "@/components/crud-page";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableRow, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { ConfettiBackground } from "@/components/confetti-background";
import { rankerService, getLatestDate } from "@/services/portals/ranker";
import type { RankerAggregatedRecord } from "@/services/portals/ranker/types";
import { useRankerAuth, isCurrentManager } from "@/services/portals/ranker/ranker-auth";
import { RankerUserAccessModal } from "@/components/ranker/RankerUserAccessModal";

// 1. Types & Interfaces
interface KPIMetrics {
  tgt: string | number;
  act: string | number;
  pct: number;
}

interface StoreDetailRow {
  id: number;
  tId: string;
  market: string;
  store: string;
  dmName?: string;
  accessories: KPIMetrics;
  voice: KPIMetrics;
  hsi: KPIMetrics;
  bts: KPIMetrics;
  upgrades: KPIMetrics;
  mim: KPIMetrics;
  retention: KPIMetrics;
  total: KPIMetrics;
}

type SortField =
  "accessories" | "voice" | "hsi" | "bts" | "upgrades" | "mim" | "retention" | "total";
type SortOrder = "asc" | "desc" | "normal";

const MONTH_NAMES: Record<number, string> = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

export default function StandingsDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useRankerAuth();

  const marketName = searchParams.get("market") || "LA-EAST";
  const urlYear = searchParams.get("year");
  const urlMonth = searchParams.get("month");
  const urlDay = searchParams.get("day");

  // API State
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [storeRecords, setStoreRecords] = useState<RankerAggregatedRecord[]>([]);

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>(urlYear || "");
  const [selectedMonth, setSelectedMonth] = useState<string>(urlMonth || "");
  const [selectedDay, setSelectedDay] = useState<string>(urlDay || "");

  // Available options
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableMonths, setAvailableMonths] = useState<number[]>([]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);

  // Sorting State
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("normal");

  // Pagination
  const [size] = useState<number>(50);

  // Unauthorized manager check state
  const [isUnauthorizedManager, setIsUnauthorizedManager] = useState<boolean>(false);

  // Initialize available dates from aggregated service
  useEffect(() => {
    let isMounted = true;
    async function loadDates() {
      try {
        const aggregated = await rankerService.getAggregatedAchieved();
        if (!isMounted || aggregated.length === 0) return;

        // Distinct years
        const years = Array.from(new Set(aggregated.map((r) => r.year)))
          .filter((y) => typeof y === "number" && y > 0)
          .sort((a, b) => b - a);

        setAvailableYears(years);

        const defaultYear =
          urlYear && years.map(String).includes(urlYear) ? urlYear : String(years[0] || 2026);

        setSelectedYear((prev) => prev || defaultYear);

        // Filter months for that year
        const months = Array.from(
          new Set(aggregated.filter((r) => String(r.year) === defaultYear).map((r) => r.month)),
        )
          .filter((m) => typeof m === "number" && m > 0)
          .sort((a, b) => a - b);

        setAvailableMonths(months);

        const defaultMonth =
          urlMonth && months.map(String).includes(urlMonth)
            ? urlMonth
            : String(months[months.length - 1] || 8);

        setSelectedMonth((prev) => prev || defaultMonth);

        // Filter days for that year & month
        const days = Array.from(
          new Set(
            aggregated
              .filter((r) => String(r.year) === defaultYear && String(r.month) === defaultMonth)
              .map((r) => r.day),
          ),
        )
          .filter((d) => typeof d === "number" && d > 0)
          .sort((a, b) => a - b);

        setAvailableDays(days);

        const defaultDay =
          urlDay && days.map(String).includes(urlDay)
            ? urlDay
            : String(days[days.length - 1] || 31);

        setSelectedDay((prev) => prev || defaultDay);
      } catch (err) {
        console.error("Failed to load initial date filters:", err);
      }
    }

    loadDates();
    return () => {
      isMounted = false;
    };
  }, [urlYear, urlMonth, urlDay]);

  // Sync available months when selectedYear changes
  useEffect(() => {
    if (!selectedYear) return;
    rankerService.getAggregatedAchieved().then((aggregated) => {
      const months = Array.from(
        new Set(aggregated.filter((r) => String(r.year) === selectedYear).map((r) => r.month)),
      )
        .filter((m) => typeof m === "number" && m > 0)
        .sort((a, b) => a - b);

      setAvailableMonths(months);
      if (months.length > 0 && (!selectedMonth || !months.map(String).includes(selectedMonth))) {
        setSelectedMonth(String(months[months.length - 1]));
      }
    });
  }, [selectedYear, selectedMonth]);

  // Sync available days when selectedMonth or selectedYear changes
  useEffect(() => {
    if (!selectedYear || !selectedMonth) return;
    rankerService.getAggregatedAchieved().then((aggregated) => {
      const days = Array.from(
        new Set(
          aggregated
            .filter((r) => String(r.year) === selectedYear && String(r.month) === selectedMonth)
            .map((r) => r.day),
        ),
      )
        .filter((d) => typeof d === "number" && d > 0)
        .sort((a, b) => a - b);

      setAvailableDays(days);
      if (days.length > 0 && (!selectedDay || !days.map(String).includes(selectedDay))) {
        setSelectedDay(String(days[days.length - 1]));
      }
    });
  }, [selectedYear, selectedMonth, selectedDay]);

  // Fetch store data using GetMonthlyAchieved API
  const fetchMonthlyAchieved = useCallback(
    async (isManualRefresh = false) => {
      if (!selectedYear || !selectedMonth || !selectedDay || !marketName) {
        return;
      }

      try {
        if (isManualRefresh) setIsRefreshing(true);
        else setLoading(true);

        const data = await rankerService.getMonthlyAchieved({
          year: selectedYear,
          month: selectedMonth,
          day: selectedDay,
          market: marketName,
        });

        // If current user is a manager, verify they have permission for this market
        if (auth.isRankerManager && data.length > 0) {
          const hasMatch = data.some((r) =>
            isCurrentManager(r.dM_Name || r.marketManager, auth.fullName),
          );
          if (!hasMatch) {
            setIsUnauthorizedManager(true);
            setStoreRecords([]);
            return;
          }
        }

        setIsUnauthorizedManager(false);
        setStoreRecords(data);
        if (isManualRefresh) toast.success("Store details updated from API");
      } catch (err) {
        console.error("Error fetching monthly achieved store data:", err);
        toast.error("Failed to load store achievements for this market");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedYear, selectedMonth, selectedDay, marketName, auth.isRankerManager, auth.fullName],
  );

  // Trigger fetch when date parameters are set
  useEffect(() => {
    if (selectedYear && selectedMonth && selectedDay) {
      fetchMonthlyAchieved();
    }
  }, [selectedYear, selectedMonth, selectedDay, fetchMonthlyAchieved]);

  // User color rule:
  // < 70: Red
  // 70 to 100: Dark Yellow (replacing orange/amber)
  // > 100: Green
  const getPctColorClass = (value: number) => {
    if (value < 70) return "text-red-600 dark:text-red-400 font-bold";
    if (value <= 100) return "text-yellow-600 dark:text-yellow-400 font-bold";
    return "text-emerald-600 dark:text-emerald-400 font-bold";
  };

  const handleSort = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortOrder("asc");
    } else {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else if (sortOrder === "desc") {
        setSortField(null);
        setSortOrder("normal");
      } else {
        setSortField(field);
        setSortOrder("asc");
      }
    }
  };

  // Sortable Header Component with Arrow indicator
  const renderSortableHeader = (label: string, field: SortField) => {
    const isActive = sortField === field && sortOrder !== "normal";
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          handleSort(field);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSort(field);
          }
        }}
        className="flex items-center justify-center gap-1.5 cursor-pointer select-none group py-1 hover:text-primary transition-colors uppercase font-bold text-[11px] tracking-wider w-full"
      >
        <span>{label}</span>
        {isActive ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary stroke-[2.5] shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary stroke-[2.5] shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
        )}
      </div>
    );
  };

  // Process store rows (Without fake subheader row, so rowCount is exact!)
  const processedData = useMemo(() => {
    const rows: StoreDetailRow[] = storeRecords.map((r, idx) => {
      const accPct = Number(r.accessoriesAchievedPCt) || 0;
      const voicePct = Number(r.voiceAchievedPCt) || 0;
      const hsiPct = Number(r.hsiAchievedPCt) || 0;
      const btsPct = Number(r.btsAchievedPCt) || 0;
      const upgradesPct = Number(r.upgradesAchievedPCt) || 0;
      const mimPct = Number(r.mimAchievedPCt) || 0;
      const retentionPct = Number(r.retentionAchievedPCt) || 0;

      // User's formula: (10+20+25+100+96+67+78) / 7 = 56.57 => 57%
      const totalScore = Math.round(
        (accPct + voicePct + hsiPct + btsPct + upgradesPct + mimPct + retentionPct) / 7,
      );

      return {
        id: idx + 1,
        tId: r.tid || r.techID || "N/A",
        market: r.market || marketName,
        store: r.storeName || `Store #${r.tid || idx + 1}`,
        dmName: r.dM_Name || r.marketManager || "",
        accessories: {
          tgt: "$" + Math.round(Number(r.accessoriesTarget) || 0).toLocaleString(),
          act: "$" + Math.round(Number(r.accessoriesAchieved) || 0).toLocaleString(),
          pct: Math.round(accPct),
        },
        voice: {
          tgt: Math.round(Number(r.voiceTarget) || 0).toLocaleString(),
          act: Math.round(Number(r.voiceAchieved) || 0).toLocaleString(),
          pct: Math.round(voicePct),
        },
        hsi: {
          tgt: Math.round(Number(r.hsiTarget) || 0).toLocaleString(),
          act: Math.round(Number(r.hsiAchieved) || 0).toLocaleString(),
          pct: Math.round(hsiPct),
        },
        bts: {
          tgt: Math.round(Number(r.btsTarget) || 0).toLocaleString(),
          act: Math.round(Number(r.btsAchieved) || 0).toLocaleString(),
          pct: Math.round(btsPct),
        },
        upgrades: {
          tgt: Math.round(Number(r.upgradesTarget) || 0).toLocaleString(),
          act: Math.round(Number(r.upgradesAchieved) || 0).toLocaleString(),
          pct: Math.round(upgradesPct),
        },
        mim: {
          tgt: Math.round(Number(r.mimTarget) || 0).toLocaleString(),
          act: Math.round(Number(r.mimAchieved) || 0).toLocaleString(),
          pct: Math.round(mimPct),
        },
        retention: {
          tgt: Math.round(Number(r.retentionTarget) || 0).toLocaleString(),
          act: Math.round(Number(r.retentionAchieved) || 0).toLocaleString(),
          pct: Math.round(retentionPct),
        },
        total: { tgt: "%", act: "", pct: totalScore },
      };
    });

    if (sortField && sortOrder !== "normal") {
      rows.sort((a, b) => {
        const valA = a[sortField].pct;
        const valB = b[sortField].pct;
        return sortOrder === "asc" ? valA - valB : valB - valA;
      });
    }

    return rows;
  }, [storeRecords, marketName, sortField, sortOrder]);

  // Grand Total Calculation across all store records
  const grandTotals = useMemo(() => {
    if (!storeRecords || storeRecords.length === 0) return null;

    const calcCat = (
      tgtKey: keyof RankerAggregatedRecord,
      actKey: keyof RankerAggregatedRecord,
    ) => {
      const tgt = storeRecords.reduce((sum, r) => sum + (Number(r[tgtKey]) || 0), 0);
      const act = storeRecords.reduce((sum, r) => sum + (Number(r[actKey]) || 0), 0);
      const pct = tgt > 0 ? Math.round((act / tgt) * 100) : 0;
      return { tgt: Math.round(tgt), act: Math.round(act), pct };
    };

    const accessories = calcCat("accessoriesTarget", "accessoriesAchieved");
    const voice = calcCat("voiceTarget", "voiceAchieved");
    const hsi = calcCat("hsiTarget", "hsiAchieved");
    const bts = calcCat("btsTarget", "btsAchieved");
    const upgrades = calcCat("upgradesTarget", "upgradesAchieved");
    const mim = calcCat("mimTarget", "mimAchieved");
    const retention = calcCat("retentionTarget", "retentionAchieved");

    // Grand total column percentage: sum of the 7 category percentages divided by 7
    const overallTotalPct = Math.round(
      (accessories.pct + voice.pct + hsi.pct + bts.pct + upgrades.pct + mim.pct + retention.pct) /
        7,
    );

    return {
      accessories,
      voice,
      hsi,
      bts,
      upgrades,
      mim,
      retention,
      overallTotalPct,
    };
  }, [storeRecords]);

  const kpiBgColors: Record<SortField, string> = {
    accessories: "bg-blue-100/50 dark:bg-blue-950/30 border-x border-blue-200/40",
    voice: "bg-indigo-100/50 dark:bg-indigo-950/30 border-x border-indigo-200/40",
    hsi: "bg-emerald-100/50 dark:bg-emerald-950/30 border-x border-emerald-200/40",
    bts: "bg-rose-100/50 dark:bg-rose-950/30 border-x border-rose-200/40",
    upgrades: "bg-amber-100/50 dark:bg-amber-950/30 border-x border-amber-200/40",
    mim: "bg-purple-100/50 dark:bg-purple-950/30 border-x border-purple-200/40",
    retention: "bg-cyan-100/50 dark:bg-cyan-950/30 border-x border-cyan-200/40",
    total: "bg-zinc-200/70 dark:bg-zinc-800/50 font-bold border-x border-zinc-300/50",
  };

  const renderMetricsCell = (row: StoreDetailRow, field: SortField) => {
    const metrics = row[field];
    const bgColor = kpiBgColors[field];

    if (field === "total") {
      return (
        <div
          className={`w-full h-full flex items-center justify-center text-xs font-extrabold py-2 ${bgColor} ${getPctColorClass(metrics.pct)}`}
        >
          {metrics.pct}%
        </div>
      );
    }

    return (
      <div className={`grid grid-cols-3 w-full h-full items-center text-xs py-2 ${bgColor}`}>
        <div className="text-center font-medium text-zinc-600 dark:text-zinc-400">
          {metrics.tgt}
        </div>
        <div className="text-center font-semibold text-zinc-800 dark:text-zinc-200">
          {metrics.act}
        </div>
        <div className={`text-center ${getPctColorClass(metrics.pct)}`}>{metrics.pct}%</div>
      </div>
    );
  };

  return (
    <ConfettiBackground>
      <div className="w-full border-0 shadow-none bg-transparent pt-2 [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[120px\]]:bg-white dark:[&_button.w-\[120px\]]:bg-zinc-950 [&_thead]:bg-zinc-50/90 dark:[&_thead]:bg-zinc-900/80 [&_thead]:border-b [&_thead]:border-border [&_th]:h-11 [&_th]:p-0 [&_td]:p-0 [&_tbody_tr]:bg-background/80 [&_tbody_tr]:backdrop-blur-[1.5px] [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-200 dark:[&_tbody_tr]:border-zinc-800/50 [&_tbody_tr]:hover:bg-muted/40 transition-all duration-200">
        {/* Header Bar */}
        <div className="px-6 py-3 flex flex-col gap-1 border-b border-zinc-100/80 dark:border-zinc-900 bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/ranker/standings")}
              className="h-8 w-8 rounded-md border-zinc-200 shadow-xs hover:bg-zinc-50 shrink-0"
              title="Back to Standings"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                {marketName}
              </h1>
              {storeRecords.length > 0 && storeRecords[0]?.dM_Name && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  DM: {storeRecords[0].dM_Name}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-medium pl-11">
            Store level performance breakdown &amp; monthly achievement
          </p>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              .detail-table button:has(.lucide-plus), 
              .detail-table button:has(svg.lucide-plus),
              .detail-table .absolute.right-4.top-4,
              .detail-table h2 + button,
              .detail-table h2, 
              .detail-table p,
              .detail-table header { display: none !important; }

              .detail-table th {
                font-size: 11px !important;
                font-weight: 800 !important;
                letter-spacing: 0.05em;
                text-align: center !important;
              }
            `,
          }}
        />

        {/* Unauthorized Manager Banner */}
        {isUnauthorizedManager ? (
          <div className="mx-6 my-8 p-8 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 text-center flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-red-900 dark:text-red-200">
              Access Restricted to Your Own Market
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 max-w-md">
              As a market manager, you are only authorized to view store achievement records for
              your own assigned market.
            </p>
            <Button
              onClick={() => navigate("/ranker/standings")}
              className="mt-2 text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Return to Standings
            </Button>
          </div>
        ) : (
          <div className="detail-table px-2">
            <CrudPage<StoreDetailRow>
              title=""
              subtitle=""
              rows={processedData}
              rowKey={(r) => r.id.toString()}
              isLoading={loading}
              isSaving={false}
              onDelete={async () => {}}
              renderForm={() => null}
              createLabel=""
              hideEdit={true}
              hideDelete={true}
              pageSize={size}
              searchPlaceholder="Search store name or T-ID..."
              subHeaderRow={
                <TableRow className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-border select-none hover:bg-slate-100/90">
                  <TableCell className="h-7 py-1 pl-4 text-xs font-semibold text-muted-foreground"></TableCell>
                  <TableCell className="h-7 py-1 text-xs font-semibold text-muted-foreground"></TableCell>
                  <TableCell className="h-7 py-1 text-xs font-semibold text-muted-foreground"></TableCell>
                  {/* ACCESSORIES */}
                  <TableCell className="p-0">
                    <div className="grid grid-cols-3 w-full text-center text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-wider py-1 bg-blue-100/50 dark:bg-blue-950/30 border-x border-blue-200/40">
                      <div>Tgt</div>
                      <div>Act</div>
                      <div>%</div>
                    </div>
                  </TableCell>
                  {/* VOICE */}
                  <TableCell className="p-0">
                    <div className="grid grid-cols-3 w-full text-center text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-wider py-1 bg-indigo-100/50 dark:bg-indigo-950/30 border-x border-indigo-200/40">
                      <div>Tgt</div>
                      <div>Act</div>
                      <div>%</div>
                    </div>
                  </TableCell>
                  {/* HSI */}
                  <TableCell className="p-0">
                    <div className="grid grid-cols-3 w-full text-center text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-wider py-1 bg-emerald-100/50 dark:bg-emerald-950/30 border-x border-emerald-200/40">
                      <div>Tgt</div>
                      <div>Act</div>
                      <div>%</div>
                    </div>
                  </TableCell>
                  {/* BTS */}
                  <TableCell className="p-0">
                    <div className="grid grid-cols-3 w-full text-center text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-wider py-1 bg-rose-100/50 dark:bg-rose-950/30 border-x border-rose-200/40">
                      <div>Tgt</div>
                      <div>Act</div>
                      <div>%</div>
                    </div>
                  </TableCell>
                  {/* UPGRADES */}
                  <TableCell className="p-0">
                    <div className="grid grid-cols-3 w-full text-center text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-wider py-1 bg-amber-100/50 dark:bg-amber-950/30 border-x border-amber-200/40">
                      <div>Tgt</div>
                      <div>Act</div>
                      <div>%</div>
                    </div>
                  </TableCell>
                  {/* MIM */}
                  <TableCell className="p-0">
                    <div className="grid grid-cols-3 w-full text-center text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-wider py-1 bg-purple-100/50 dark:bg-purple-950/30 border-x border-purple-200/40">
                      <div>Tgt</div>
                      <div>Act</div>
                      <div>%</div>
                    </div>
                  </TableCell>
                  {/* RETENTION */}
                  <TableCell className="p-0">
                    <div className="grid grid-cols-3 w-full text-center text-[10px] uppercase font-bold text-zinc-600 dark:text-zinc-400 tracking-wider py-1 bg-cyan-100/50 dark:bg-cyan-950/30 border-x border-cyan-200/40">
                      <div>Tgt</div>
                      <div>Act</div>
                      <div>%</div>
                    </div>
                  </TableCell>
                  {/* TOTAL */}
                  <TableCell className="p-0">
                    <div className="w-full text-center text-[10px] uppercase font-bold text-zinc-700 dark:text-zinc-300 tracking-wider py-1 bg-zinc-200/70 dark:bg-zinc-800/50 border-x border-zinc-300/50 flex items-center justify-center">
                      %
                    </div>
                  </TableCell>
                </TableRow>
              }
              footerRow={
                grandTotals ? (
                  <TableRow className="bg-zinc-100/95 dark:bg-zinc-800/95 font-bold border-t-2 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100/95 text-xs shadow-xs">
                    <TableCell className="py-2.5 pl-4 text-left font-extrabold text-zinc-900 dark:text-zinc-100">
                      TOTAL
                    </TableCell>
                    <TableCell className="py-2.5 text-left text-muted-foreground font-semibold uppercase">
                      {marketName}
                    </TableCell>
                    <TableCell className="py-2.5 text-left font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                      GRAND TOTAL
                    </TableCell>
                    {/* ACCESSORIES */}
                    <TableCell className="p-0">
                      <div className="grid grid-cols-3 w-full h-full items-center text-xs py-2 bg-blue-100/60 dark:bg-blue-950/40 border-x border-blue-200/40">
                        <div className="text-center font-bold text-zinc-700 dark:text-zinc-300">
                          ${grandTotals.accessories.tgt.toLocaleString()}
                        </div>
                        <div className="text-center font-extrabold text-zinc-900 dark:text-zinc-100">
                          ${grandTotals.accessories.act.toLocaleString()}
                        </div>
                        <div
                          className={`text-center font-extrabold ${getPctColorClass(grandTotals.accessories.pct)}`}
                        >
                          {grandTotals.accessories.pct}%
                        </div>
                      </div>
                    </TableCell>
                    {/* VOICE */}
                    <TableCell className="p-0">
                      <div className="grid grid-cols-3 w-full h-full items-center text-xs py-2 bg-indigo-100/60 dark:bg-indigo-950/40 border-x border-indigo-200/40">
                        <div className="text-center font-bold text-zinc-700 dark:text-zinc-300">
                          {grandTotals.voice.tgt.toLocaleString()}
                        </div>
                        <div className="text-center font-extrabold text-zinc-900 dark:text-zinc-100">
                          {grandTotals.voice.act.toLocaleString()}
                        </div>
                        <div
                          className={`text-center font-extrabold ${getPctColorClass(grandTotals.voice.pct)}`}
                        >
                          {grandTotals.voice.pct}%
                        </div>
                      </div>
                    </TableCell>
                    {/* HSI */}
                    <TableCell className="p-0">
                      <div className="grid grid-cols-3 w-full h-full items-center text-xs py-2 bg-emerald-100/60 dark:bg-emerald-950/40 border-x border-emerald-200/40">
                        <div className="text-center font-bold text-zinc-700 dark:text-zinc-300">
                          {grandTotals.hsi.tgt.toLocaleString()}
                        </div>
                        <div className="text-center font-extrabold text-zinc-900 dark:text-zinc-100">
                          {grandTotals.hsi.act.toLocaleString()}
                        </div>
                        <div
                          className={`text-center font-extrabold ${getPctColorClass(grandTotals.hsi.pct)}`}
                        >
                          {grandTotals.hsi.pct}%
                        </div>
                      </div>
                    </TableCell>
                    {/* BTS */}
                    <TableCell className="p-0">
                      <div className="grid grid-cols-3 w-full h-full items-center text-xs py-2 bg-rose-100/60 dark:bg-rose-950/40 border-x border-rose-200/40">
                        <div className="text-center font-bold text-zinc-700 dark:text-zinc-300">
                          {grandTotals.bts.tgt.toLocaleString()}
                        </div>
                        <div className="text-center font-extrabold text-zinc-900 dark:text-zinc-100">
                          {grandTotals.bts.act.toLocaleString()}
                        </div>
                        <div
                          className={`text-center font-extrabold ${getPctColorClass(grandTotals.bts.pct)}`}
                        >
                          {grandTotals.bts.pct}%
                        </div>
                      </div>
                    </TableCell>
                    {/* UPGRADES */}
                    <TableCell className="p-0">
                      <div className="grid grid-cols-3 w-full h-full items-center text-xs py-2 bg-amber-100/60 dark:bg-amber-950/40 border-x border-amber-200/40">
                        <div className="text-center font-bold text-zinc-700 dark:text-zinc-300">
                          {grandTotals.upgrades.tgt.toLocaleString()}
                        </div>
                        <div className="text-center font-extrabold text-zinc-900 dark:text-zinc-100">
                          {grandTotals.upgrades.act.toLocaleString()}
                        </div>
                        <div
                          className={`text-center font-extrabold ${getPctColorClass(grandTotals.upgrades.pct)}`}
                        >
                          {grandTotals.upgrades.pct}%
                        </div>
                      </div>
                    </TableCell>
                    {/* MIM */}
                    <TableCell className="p-0">
                      <div className="grid grid-cols-3 w-full h-full items-center text-xs py-2 bg-purple-100/60 dark:bg-purple-950/40 border-x border-purple-200/40">
                        <div className="text-center font-bold text-zinc-700 dark:text-zinc-300">
                          {grandTotals.mim.tgt.toLocaleString()}
                        </div>
                        <div className="text-center font-extrabold text-zinc-900 dark:text-zinc-100">
                          {grandTotals.mim.act.toLocaleString()}
                        </div>
                        <div
                          className={`text-center font-extrabold ${getPctColorClass(grandTotals.mim.pct)}`}
                        >
                          {grandTotals.mim.pct}%
                        </div>
                      </div>
                    </TableCell>
                    {/* RETENTION */}
                    <TableCell className="p-0">
                      <div className="grid grid-cols-3 w-full h-full items-center text-xs py-2 bg-cyan-100/60 dark:bg-cyan-950/40 border-x border-cyan-200/40">
                        <div className="text-center font-bold text-zinc-700 dark:text-zinc-300">
                          {grandTotals.retention.tgt.toLocaleString()}
                        </div>
                        <div className="text-center font-extrabold text-zinc-900 dark:text-zinc-100">
                          {grandTotals.retention.act.toLocaleString()}
                        </div>
                        <div
                          className={`text-center font-extrabold ${getPctColorClass(grandTotals.retention.pct)}`}
                        >
                          {grandTotals.retention.pct}%
                        </div>
                      </div>
                    </TableCell>
                    {/* TOTAL */}
                    <TableCell className="p-0">
                      <div
                        className={`w-full h-full flex items-center justify-center text-xs font-extrabold py-2 bg-zinc-200/90 dark:bg-zinc-800/80 border-x border-zinc-300/50 ${getPctColorClass(grandTotals.overallTotalPct)}`}
                      >
                        {grandTotals.overallTotalPct}%
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null
              }
              extraToolbar={
                <div className="flex flex-wrap items-center gap-3 pb-2 pt-1 w-full md:w-auto relative z-20">
                  {/* YEAR DROPDOWN */}
                  <div className="relative flex flex-col pt-2.5">
                    <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
                      Year
                    </span>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[110px] h-9 text-xs font-medium">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* MONTH DROPDOWN */}
                  <div className="relative flex flex-col pt-2.5">
                    <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
                      Month
                    </span>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[125px] h-9 text-xs font-medium">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMonths.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {MONTH_NAMES[m] || `Month ${m}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* DAY DROPDOWN */}
                  <div className="relative flex flex-col pt-2.5">
                    <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
                      Day
                    </span>
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                      <SelectTrigger className="w-[95px] h-9 text-xs font-medium">
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDays.map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* RESET TO LATEST */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const agg = await rankerService.getAggregatedAchieved();
                        const { maxYear, maxMonth, maxDay } = getLatestDate(agg);
                        if (maxYear > 0) setSelectedYear(String(maxYear));
                        if (maxMonth > 0) setSelectedMonth(String(maxMonth));
                        if (maxDay > 0) setSelectedDay(String(maxDay));
                        setSortField(null);
                        setSortOrder("normal");
                        toast.success("Reset to latest date");
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="h-9 px-3 text-xs font-semibold border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all active:scale-95"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset to Latest
                  </Button>

                  {/* REFRESH BUTTON */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || isRefreshing}
                    onClick={() => fetchMonthlyAchieved(true)}
                    className="h-9 px-3 text-xs font-medium border-muted-foreground/30 hover:bg-accent transition"
                    title="Refresh from API"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              }
              columns={[
                {
                  key: "tId",
                  header: "T-ID",
                  searchValue: (r) => r.tId,
                  accessor: (r) => (
                    <div className="py-2.5 pl-4 text-left font-bold text-amber-600 dark:text-amber-500 text-xs">
                      {r.tId}
                    </div>
                  ),
                },
                {
                  key: "market",
                  header: "MARKET",
                  searchValue: (r) => r.market,
                  accessor: (r) => (
                    <div className="py-2.5 text-left font-medium text-zinc-500 text-xs uppercase">
                      {r.market}
                    </div>
                  ),
                },
                {
                  key: "store",
                  header: "STORE",
                  searchValue: (r) => r.store,
                  accessor: (r) => (
                    <div className="py-2.5 text-left font-bold text-zinc-800 dark:text-zinc-200 text-xs uppercase">
                      {r.store}
                    </div>
                  ),
                },
                {
                  key: "accessories",
                  header: renderSortableHeader("ACCESSORIES", "accessories"),
                  accessor: (r) => renderMetricsCell(r, "accessories"),
                },
                {
                  key: "voice",
                  header: renderSortableHeader("VOICE", "voice"),
                  accessor: (r) => renderMetricsCell(r, "voice"),
                },
                {
                  key: "hsi",
                  header: renderSortableHeader("HSI", "hsi"),
                  accessor: (r) => renderMetricsCell(r, "hsi"),
                },
                {
                  key: "bts",
                  header: renderSortableHeader("BTS", "bts"),
                  accessor: (r) => renderMetricsCell(r, "bts"),
                },
                {
                  key: "upgrades",
                  header: renderSortableHeader("UPGRADES", "upgrades"),
                  accessor: (r) => renderMetricsCell(r, "upgrades"),
                },
                {
                  key: "mim",
                  header: renderSortableHeader("MIM", "mim"),
                  accessor: (r) => renderMetricsCell(r, "mim"),
                },
                {
                  key: "retention",
                  header: renderSortableHeader("RETENTION", "retention"),
                  accessor: (r) => renderMetricsCell(r, "retention"),
                },
                {
                  key: "total",
                  header: renderSortableHeader("TOTAL", "total"),
                  accessor: (r) => renderMetricsCell(r, "total"),
                },
              ]}
            />
          </div>
        )}
      </div>

      <RankerUserAccessModal isOpen={auth.isRankerUser} />
    </ConfettiBackground>
  );
}
