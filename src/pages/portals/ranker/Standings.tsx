import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CrudPage } from "@/components/crud-page";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Lock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ConfettiBackground } from "@/components/confetti-background";
import { rankerService, calculateKpiScore, getLatestDate } from "@/services/portals/ranker";
import type { RankerAggregatedRecord } from "@/services/portals/ranker/types";
import { useRankerAuth, isCurrentManager } from "@/services/portals/ranker/ranker-auth";
import { RankerUserAccessModal } from "@/components/ranker/RankerUserAccessModal";

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

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function StandingsPage() {
  const navigate = useNavigate();
  const auth = useRankerAuth();

  // API State
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [rawRecords, setRawRecords] = useState<RankerAggregatedRecord[]>([]);

  // Filters States (Specific date values without 'all')
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");

  // Sorting State
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("normal");

  // Fetch API data
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);

      const records = await rankerService.getAggregatedAchieved({
        forceRefresh,
      });
      setRawRecords(records);

      // Default filters to latest date
      if (records.length > 0 && (!selectedYear || forceRefresh)) {
        const { maxYear, maxMonth, maxDay } = getLatestDate(records);
        if (maxYear > 0) setSelectedYear(String(maxYear));
        if (maxMonth > 0) setSelectedMonth(String(maxMonth));
        if (maxDay > 0) setSelectedDay(String(maxDay));
      }
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

  // Filter options derived dynamically from unique API values cascading by date
  const years = useMemo(() => {
    return [...new Set(rawRecords.map((m) => m.year))].filter(Boolean).sort((a, b) => b - a);
  }, [rawRecords]);

  const months = useMemo(() => {
    const list = selectedYear
      ? rawRecords.filter((m) => String(m.year) === selectedYear)
      : rawRecords;
    return [...new Set(list.map((m) => m.month))].filter(Boolean).sort((a, b) => a - b);
  }, [rawRecords, selectedYear]);

  const days = useMemo(() => {
    const list = rawRecords.filter((m) => {
      const matchY = !selectedYear || String(m.year) === selectedYear;
      const matchM = !selectedMonth || String(m.month) === selectedMonth;
      return matchY && matchM;
    });
    return [...new Set(list.map((m) => m.day))].filter(Boolean).sort((a, b) => a - b);
  }, [rawRecords, selectedYear, selectedMonth]);

  // Auto-sync month when year changes or if current month is not in available months
  useEffect(() => {
    if (months.length > 0) {
      if (!selectedMonth || !months.map(String).includes(selectedMonth)) {
        setSelectedMonth(String(months[months.length - 1]));
      }
    }
  }, [months, selectedMonth]);

  // Auto-sync day when month changes or if current day is not in available days
  useEffect(() => {
    if (days.length > 0) {
      if (!selectedDay || !days.map(String).includes(selectedDay)) {
        setSelectedDay(String(days[days.length - 1]));
      }
    }
  }, [days, selectedDay]);

  // KPI badge matching previous project:
  // >= 100: green, >= 70: yellow, < 70: red
  const renderKPIBadge = (value: number) => {
    const val = Number.isFinite(value) ? value : 0;
    let bgClass = "";
    let textClass = "";
    let borderClass = "";

    if (val >= 100) {
      bgClass = "bg-green-100 dark:bg-green-900/30";
      textClass = "text-green-700 dark:text-green-400 font-bold";
      borderClass = "border border-green-200 dark:border-green-800";
    } else if (val >= 70) {
      bgClass = "bg-yellow-100 dark:bg-yellow-900/30";
      textClass = "text-yellow-700 dark:text-yellow-400 font-bold";
      borderClass = "border border-yellow-200 dark:border-yellow-800";
    } else {
      bgClass = "bg-red-100 dark:bg-red-900/30";
      textClass = "text-red-700 dark:text-red-400 font-bold";
      borderClass = "border border-red-200 dark:border-red-800";
    }

    return (
      <div className="py-2 flex justify-center">
        <span
          className={`inline-flex items-center justify-center w-16 py-1 rounded-md text-xs font-bold shadow-xs ${bgClass} ${textClass} ${borderClass}`}
        >
          {Math.round(val)}%
        </span>
      </div>
    );
  };

  // Retention badge matching previous project:
  // >= 65: green, >= 62: yellow, < 62: red
  const renderRetentionBadge = (value: number) => {
    const val = Number.isFinite(value) ? value : 0;
    let bgClass = "";
    let textClass = "";
    let borderClass = "";

    if (val >= 65) {
      bgClass = "bg-green-100 dark:bg-green-900/30";
      textClass = "text-green-700 dark:text-green-400 font-bold";
      borderClass = "border border-green-200 dark:border-green-800";
    } else if (val >= 62) {
      bgClass = "bg-yellow-100 dark:bg-yellow-900/30";
      textClass = "text-yellow-700 dark:text-yellow-400 font-bold";
      borderClass = "border border-yellow-200 dark:border-yellow-800";
    } else {
      bgClass = "bg-red-100 dark:bg-red-900/30";
      textClass = "text-red-700 dark:text-red-400 font-bold";
      borderClass = "border border-red-200 dark:border-red-800";
    }

    return (
      <div className="py-2 flex justify-center">
        <span
          className={`inline-flex items-center justify-center w-16 py-1 rounded-md text-xs font-bold shadow-xs ${bgClass} ${textClass} ${borderClass}`}
        >
          {Math.round(val)}%
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

    if (selectedYear) {
      list = list.filter((r) => String(r.year) === selectedYear);
    }
    if (selectedMonth) {
      list = list.filter((r) => String(r.month) === selectedMonth);
    }
    if (selectedDay) {
      list = list.filter((r) => String(r.day) === selectedDay);
    }

    const rows: StandingRow[] = list.map((r, idx) => {
      const totalScore = parseFloat(
        (
          (parseFloat(String(r.accessoriesAchievedPCt)) || 0) * 0.25 +
          (parseFloat(String(r.voiceAchievedPCt)) || 0) * 0.2 +
          (parseFloat(String(r.hsiAchievedPCt)) || 0) * 0.15 +
          (parseFloat(String(r.mimAchievedPCt)) || 0) * 0.1 +
          (parseFloat(String(r.upgradesAchievedPCt)) || 0) * 0.1 +
          (parseFloat(String(r.btsAchievedPCt)) || 0) * 0.1 +
          (parseFloat(String(r.retentionAchievedPCt)) || 0) * 0.1
        ).toFixed(2),
      );
      const name = r.dM_Name || "No Name";
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

    if (sortField && sortOrder !== "normal") {
      rows.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortOrder === "asc" ? valA - valB : valB - valA;
      });
    }

    return rows;
  }, [rawRecords, selectedYear, selectedMonth, selectedDay, sortField, sortOrder]);

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
            pageSize={50}
            searchPlaceholder="Search manager or market..."
            rowClassName={(row) => {
              if (auth.isRankerManager) {
                const isMe = isCurrentManager(row.name, auth.fullName);
                if (isMe) {
                  return "!bg-amber-100/80 dark:!bg-amber-950/40 !border-l-4 !border-l-amber-500 hover:!bg-amber-200/70 dark:hover:!bg-amber-900/60 font-semibold shadow-xs";
                }
                return "opacity-75 cursor-not-allowed hover:!bg-muted/30";
              }
              return undefined;
            }}
            onRowClick={(row) => {
              if (auth.isRankerAdmin) {
                navigate(
                  `/ranker/standings/detail?market=${encodeURIComponent(row.market)}&year=${selectedYear}&month=${selectedMonth}&day=${selectedDay}`,
                );
                return;
              }
              if (auth.isRankerManager) {
                const isMe = isCurrentManager(row.name, auth.fullName);
                if (isMe) {
                  navigate(
                    `/ranker/standings/detail?market=${encodeURIComponent(row.market)}&year=${selectedYear}&month=${selectedMonth}&day=${selectedDay}`,
                  );
                } else {
                  toast.warning(
                    "Access Restricted: You cannot view other managers' records. You can only view your own market details.",
                  );
                }
                return;
              }
              // Role user
              toast.error(
                "Access Restricted: Please contact your administrator to access Ranker portal.",
              );
            }}
            extraToolbar={
              <div className="flex flex-wrap items-center gap-3 pb-0.5 w-full md:w-auto relative z-20">
                {/* YEAR DROPDOWN */}
                <div className="relative flex flex-col pt-2.5">
                  <span className="absolute -top-1 left-2 bg-background px-1 text-[10px] font-bold text-muted-foreground/80 z-10 uppercase tracking-wider">
                    Year
                  </span>
                  <Select
                    value={selectedYear}
                    onValueChange={(val) => {
                      setSelectedYear(val);
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
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
                    }}
                  >
                    <SelectTrigger className="w-[125px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
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
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-9 focus:ring-0 border-muted-foreground/30 font-medium text-xs">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {String(d).padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* RESET TO LATEST BUTTON */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (rawRecords.length === 0) return;
                    const { maxYear, maxMonth, maxDay } = getLatestDate(rawRecords);
                    if (maxYear > 0) setSelectedYear(String(maxYear));
                    if (maxMonth > 0) setSelectedMonth(String(maxMonth));
                    if (maxDay > 0) setSelectedDay(String(maxDay));
                    setSortField(null);
                    setSortOrder("normal");
                    toast.success("Reset to latest date");
                  }}
                  className="h-9 px-3 text-xs font-semibold border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all active:scale-95"
                  title="Reset to Latest Date"
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
                  onClick={() => fetchData(true)}
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
                key: "rank",
                header: "Rank",
                accessor: (r) => (
                  <div className="py-2 pl-4 text-left font-bold text-zinc-500">#{r.rank}</div>
                ),
              },
              {
                key: "name",
                header: "Name",
                searchValue: (r) => r.name,
                accessor: (r) => {
                  const isMe = auth.isRankerManager && isCurrentManager(r.name, auth.fullName);
                  const isLocked = auth.isRankerManager && !isMe;

                  return (
                    <div
                      className="py-2 flex items-center gap-2.5 text-left font-semibold text-zinc-800 dark:text-zinc-200"
                      title={isLocked ? "You cannot view other managers' records" : undefined}
                    >
                      <Avatar className="h-7 w-7 rounded-full border border-border shrink-0 bg-muted/60">
                        {r.photo ? (
                          <AvatarImage
                            src={r.photo}
                            alt={r.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                          {getInitials(r.name) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{r.name}</span>
                        {isMe && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-amber-500 text-white shadow-xs shrink-0">
                            You
                          </span>
                        )}
                        {isLocked && (
                          <span
                            title="You cannot view other managers' records"
                            className="inline-flex items-center text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: "market",
                header: "Market",
                searchValue: (r) => r.market,
                accessor: (r) => (
                  <div className="py-2 text-left text-muted-foreground font-medium">{r.market}</div>
                ),
              },
              {
                key: "accessories",
                header: renderSortableHeader("ACCESSORIES", "accessories"),
                accessor: (r) => renderKPIBadge(r.accessories),
              },
              {
                key: "voice",
                header: renderSortableHeader("VOICE", "voice"),
                accessor: (r) => renderKPIBadge(r.voice),
              },
              {
                key: "hsi",
                header: renderSortableHeader("HSI", "hsi"),
                accessor: (r) => renderKPIBadge(r.hsi),
              },
              {
                key: "bts",
                header: renderSortableHeader("BTS", "bts"),
                accessor: (r) => renderKPIBadge(r.bts),
              },
              {
                key: "upgrades",
                header: renderSortableHeader("UPGRADES", "upgrades"),
                accessor: (r) => renderKPIBadge(r.upgrades),
              },
              {
                key: "mim",
                header: renderSortableHeader("MIM", "mim"),
                accessor: (r) => renderKPIBadge(r.mim),
              },
              {
                key: "retention",
                header: renderSortableHeader("RETENTION", "retention"),
                accessor: (r) => renderRetentionBadge(r.retention),
              },
              {
                key: "total",
                header: renderSortableHeader("TOTAL", "total"),
                accessor: (r) => renderKPIBadge(r.total),
                searchValue: (r) => `${Math.round(r.total)}%`,
              },
            ]}
          />
        </div>
      </div>
      <RankerUserAccessModal isOpen={auth.isRankerUser} />
    </ConfettiBackground>
  );
}
