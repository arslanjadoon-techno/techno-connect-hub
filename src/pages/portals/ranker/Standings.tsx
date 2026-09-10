import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CrudPage } from "@/components/crud-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, XCircle, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { ConfettiBackground } from "@/components/confetti-background";
import { rankerService, calculateKpiScore } from "@/services/ranker";
import type { RankerAggregatedRecord } from "@/services/ranker/types";

// 1. Interfaces
interface StandingRow {
  id: string;
  rank: number;
  name: string;
  market: string;
  accessories: number;
  voice: number;
  hsi: number;
  bts: number;
  upgrades: number;
  mim: number;
  retention: number;
  total: number;
  photo?: string | null;
}

type SortField =
  | "accessories"
  | "voice"
  | "hsi"
  | "bts"
  | "upgrades"
  | "mim"
  | "retention"
  | "total";
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

export default function StandingsPage() {
  const navigate = useNavigate();

  // API State
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [rawRecords, setRawRecords] = useState<RankerAggregatedRecord[]>([]);

  // Filters States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");

  // Sorting State
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("normal");

  // Pagination states
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(15);

  // Fetch API data
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);

      const records = await rankerService.getAggregatedAchieved({ forceRefresh });
      setRawRecords(records);
    } catch (err) {
      console.error("Failed to load Standings from API:", err);
      toast.error("Failed to load Standings data from API");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter options derived dynamically from unique API values
  const filterOptions = useMemo(() => {
    return rankerService.getFilterOptions(rawRecords);
  }, [rawRecords]);

  // Helper function for percentage conditional colors
  const renderPercentageBadge = (value: number, isTotal = false) => {
    const val = Number.isFinite(value) ? value : 0;
    let bgClass = "";
    let textClass = "";
    let borderClass = "";

    if (val < 60) {
      bgClass = "bg-red-50 dark:bg-red-950/30";
      textClass = "text-red-600 dark:text-red-400 font-semibold";
      borderClass = isTotal
        ? "border-2 border-red-500"
        : "border border-red-200/60 dark:border-red-900/40";
    } else if (val >= 60 && val <= 100) {
      bgClass = "bg-amber-50 dark:bg-amber-950/20";
      textClass = "text-amber-700 dark:text-amber-500 font-semibold";
      borderClass = isTotal
        ? "border-2 border-amber-500"
        : "border border-amber-200/60 dark:border-amber-900/40";
    } else {
      bgClass = "bg-emerald-50 dark:bg-emerald-950/30";
      textClass = "text-emerald-700 dark:text-emerald-400 font-semibold";
      borderClass = isTotal
        ? "border-2 border-emerald-500"
        : "border border-emerald-200/60 dark:border-emerald-900/40";
    }

    return (
      <div className="py-2">
        <span
          className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs tabular-nums transition-colors shadow-xs ${bgClass} ${textClass} ${borderClass}`}
        >
          {val}%
        </span>
      </div>
    );
  };

  // Sort Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === "normal") setSortOrder("desc");
      else if (sortOrder === "desc") setSortOrder("asc");
      else {
        setSortOrder("normal");
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Sort Header Renderer
  const renderSortableHeader = (label: string, field: SortField) => {
    const isActive = sortField === field && sortOrder !== "normal";
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => handleSort(field)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSort(field);
          }
        }}
        className="flex items-center gap-1.5 cursor-pointer select-none group py-1 hover:text-primary transition-colors uppercase font-bold text-xs tracking-wider"
      >
        <span>{label}</span>
        {isActive ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary stroke-[2.5]" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary stroke-[2.5]" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>
    );
  };

  // Filter & Sort Logic
  const processedData = useMemo(() => {
    let list = rawRecords;

    if (selectedYear !== "all") {
      list = list.filter((r) => String(r.year) === selectedYear);
    }
    if (selectedMonth !== "all") {
      list = list.filter((r) => String(r.month) === selectedMonth);
    }
    if (selectedDay !== "all") {
      list = list.filter((r) => String(r.day) === selectedDay);
    }

    let rows: StandingRow[] = list.map((r, idx) => {
      const totalScore = calculateKpiScore(r);
      const name = r.marketManager || r.dM_Name || "N/A";
      const market = r.market || "N/A";

      return {
        id: `${r.year}-${r.month}-${r.day}-${market}-${name}-${idx}`,
        rank: 0,
        name,
        market,
        accessories: Math.round(Number(r.accessoriesAchievedPCt) || 0),
        voice: Math.round(Number(r.voiceAchievedPCt) || 0),
        hsi: Math.round(Number(r.hsiAchievedPCt) || 0),
        bts: Math.round(Number(r.btsAchievedPCt) || 0),
        upgrades: Math.round(Number(r.upgradesAchievedPCt) || 0),
        mim: Math.round(Number(r.mimAchievedPCt) || 0),
        retention: Math.round(Number(r.retentionAchievedPCt) || 0),
        total: totalScore,
        photo: r.mM_PIC_URL,
      };
    });

    // Default sort by total score descending to compute rank
    rows.sort((a, b) => b.total - a.total);
    rows.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.market.toLowerCase().includes(q),
      );
    }

    if (sortField && sortOrder !== "normal") {
      rows.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortOrder === "asc" ? valA - valB : valB - valA;
      });
    }

    return rows;
  }, [rawRecords, selectedYear, selectedMonth, selectedDay, searchQuery, sortField, sortOrder]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    if (
      selectedYear === "all" &&
      selectedMonth === "all" &&
      selectedDay === "all" &&
      searchQuery === "" &&
      sortField === null
    )
      return;
    setSearchQuery("");
    setSelectedYear("all");
    setSelectedMonth("all");
    setSelectedDay("all");
    setSortField(null);
    setSortOrder("normal");
    setPage(0);
    toast.success("Filters cleared successfully");
  };

  return (
    <ConfettiBackground>
      <div className="w-full border-0 shadow-none bg-transparent [&_input]:bg-white dark:[&_input]:bg-zinc-950 [&_button.w-\[120px\]]:bg-white dark:[&_button.w-\[120px\]]:bg-zinc-950 [&_thead]:bg-zinc-50/90 dark:[&_thead]:bg-zinc-900/80 [&_thead]:border-b [&_thead]:border-border [&_th]:h-14 [&_tbody_tr]:bg-background/80 [&_tbody_tr]:backdrop-blur-[1.5px] [&_tbody_tr]:border-b [&_tbody_tr]:border-zinc-100 dark:[&_tbody_tr]:border-zinc-800/50 [&_tbody_tr]:hover:bg-muted/50 [&_tbody_tr]:cursor-pointer transition-all duration-200">
        <style
          dangerouslySetInnerHTML={{
            __html: `
                    .standings-table th { position: relative; cursor: pointer; user-select: none; }
                    .standings-table th:hover { color: var(--primary) !important; }
                    
                    /* CrudPage hidden targets overrides */
                    .standings-table button:has(.lucide-plus), 
                    .standings-table button:has(svg.lucide-plus),
                    .standings-table .absolute.right-4.top-4,
                    .standings-table h2 + button,
                    .standings-table header button { display: none !important; }
                    
                    .standings-table div.flex.items-center.gap-2:has(input[placeholder*="Search"]) { display: none !important; }
                    
                    .standings-table th:last-child, 
                    .standings-table td:last-child { display: none !important; }
                    `,
          }}
        />

        <div className="standings-table">
          <CrudPage<StandingRow>
            title="Standings"
            subtitle="Evaluation of market managers and their performance data"
            rows={processedData}
            rowKey={(r) => r.id}
            isLoading={loading}
            isSaving={false}
            onDelete={async () => {}}
            renderForm={() => null}
            createLabel=""
            hideEdit={true}
            hideDelete={true}
            rowCount={processedData.length}
            page={page}
            pageSize={size}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => setSize(newSize)}
            onRowClick={(row) => {
              navigate(`/ranker/standings/detail?market=${encodeURIComponent(row.market)}`);
            }}
            extraToolbar={
              <div className="flex flex-wrap items-center gap-3 pb-0.5 w-full md:w-auto relative z-20">
                {/* SEARCH INPUT */}
                <div className="relative flex items-center min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search manager or market..."
                    className="h-9 pl-8 pr-3 text-xs focus:ring-1 border-muted-foreground/30"
                  />
                </div>

                {/* YEAR DROPDOWN */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
                    Year
                  </span>
                  <Select
                    value={selectedYear}
                    onValueChange={(val) => {
                      setSelectedYear(val);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {filterOptions.years.map((y) => (
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
                  <Select
                    value={selectedMonth}
                    onValueChange={(val) => {
                      setSelectedMonth(val);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[125px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {filterOptions.months.map((m) => (
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
                  <Select
                    value={selectedDay}
                    onValueChange={(val) => {
                      setSelectedDay(val);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Days</SelectItem>
                      {filterOptions.days.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {String(d).padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* REFRESH BUTTON */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || isRefreshing}
                  onClick={() => fetchData(true)}
                  className="h-9 px-3 text-xs font-medium border-muted-foreground/30 hover:bg-accent transition"
                  title="Refresh from API"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
                  Refresh
                </Button>

                {/* RESET BUTTON */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    selectedYear === "all" &&
                    selectedMonth === "all" &&
                    selectedDay === "all" &&
                    searchQuery === "" &&
                    sortField === null
                  }
                  onClick={handleResetFilters}
                  className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-dashed border-muted-foreground/30 disabled:opacity-40 transition-all active:scale-95 group"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:rotate-90 duration-300" />
                  Reset Filters
                </Button>
              </div>
            }
            columns={[
              {
                key: "rank",
                header: "Rank",
                accessor: (r) => (
                  <div className="py-2 pl-4 text-left font-bold text-zinc-500">#{r.rank}</div>
                ),
              },
              {
                key: "name",
                header: "Name",
                accessor: (r) => (
                  <div className="py-2 flex items-center gap-2.5 text-left font-semibold text-zinc-800 dark:text-zinc-200">
                    {r.photo ? (
                      <img
                        src={r.photo}
                        alt={r.name}
                        className="h-7 w-7 rounded-full object-cover border border-border"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null}
                    <span>{r.name}</span>
                  </div>
                ),
              },
              {
                key: "market",
                header: "Market",
                accessor: (r) => (
                  <div className="py-2 text-left text-muted-foreground font-medium">{r.market}</div>
                ),
              },
              {
                key: "accessories",
                header: renderSortableHeader("ACCESSORIES", "accessories"),
                accessor: (r) => renderPercentageBadge(r.accessories),
              },
              {
                key: "voice",
                header: renderSortableHeader("VOICE", "voice"),
                accessor: (r) => renderPercentageBadge(r.voice),
              },
              {
                key: "hsi",
                header: renderSortableHeader("HSI", "hsi"),
                accessor: (r) => renderPercentageBadge(r.hsi),
              },
              {
                key: "bts",
                header: renderSortableHeader("BTS", "bts"),
                accessor: (r) => renderPercentageBadge(r.bts),
              },
              {
                key: "upgrades",
                header: renderSortableHeader("UPGRADES", "upgrades"),
                accessor: (r) => renderPercentageBadge(r.upgrades),
              },
              {
                key: "mim",
                header: renderSortableHeader("MIM", "mim"),
                accessor: (r) => renderPercentageBadge(r.mim),
              },
              {
                key: "retention",
                header: renderSortableHeader("RETENTION", "retention"),
                accessor: (r) => renderPercentageBadge(r.retention),
              },
              {
                key: "total",
                header: renderSortableHeader("TOTAL", "total"),
                accessor: (r) => renderPercentageBadge(r.total, true),
              },
            ]}
          />
        </div>
      </div>
    </ConfettiBackground>
  );
}
