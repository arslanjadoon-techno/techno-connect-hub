import { useMemo, useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  Boxes,
  Wallet,
  Loader2,
  Calendar,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { FilterReset } from "@/components/filter-reset";
import {
  commissionService,
  type CommissionRow,
  type CommissionMarket,
} from "@/services/portals/commission";

type SortDir = "asc" | "desc" | null;
type Row = CommissionRow;

const MRC_KEYS = [
  "5",
  "10",
  "15",
  "20",
  "24",
  "25",
  "26",
  "30",
  "35",
  "40",
  "45",
  "48",
  "50",
  "55",
  "60",
  "65",
  "75",
];

const WEB_KEYS: Array<{ k: string; label: string }> = [
  { k: "l40", label: "<40" },
  { k: "e40", label: "40" },
  { k: "e45", label: "45" },
  { k: "e48", label: "48" },
  { k: "e50", label: "50" },
  { k: "e55", label: "55" },
  { k: "e60", label: "60" },
  { k: "e65", label: "65" },
  { k: "e75", label: "75" },
];

function useSortable(rows: Row[]) {
  const [sortKey, setSortKey] = useState<"employee_Name" | "commission" | null>(null);
  const [dir, setDir] = useState<SortDir>(null);

  const cycle = (k: "employee_Name" | "commission") => {
    if (sortKey !== k) {
      setSortKey(k);
      setDir("asc");
      return;
    }
    if (dir === "asc") {
      setDir("desc");
      return;
    }
    if (dir === "desc") {
      setSortKey(null);
      setDir(null);
      return;
    }
    setDir("asc");
  };

  const sorted = useMemo(() => {
    if (!sortKey || !dir) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av: any = a[sortKey] ?? 0;
      const bv: any = b[sortKey] ?? 0;
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, dir]);

  const indicator = (k: "employee_Name" | "commission") => {
    if (sortKey !== k) return <ArrowUpDown className="inline h-3 w-3 opacity-50" />;
    if (dir === "asc") return <ArrowUp className="inline h-3 w-3" />;
    if (dir === "desc") return <ArrowDown className="inline h-3 w-3" />;
    return <ArrowUpDown className="inline h-3 w-3 opacity-50" />;
  };

  return { sorted, cycle, indicator };
}

function SortableHeader({
  label,
  onClick,
  indicator,
}: {
  label: string;
  onClick: () => void;
  indicator: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 font-semibold hover:text-primary"
    >
      {label} {indicator}
    </button>
  );
}

const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CommissionPage() {
  // Check user role & extract NTID accurately from stored session (supports email, ntid, or username)
  const userAuthInfo = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("user") : null;
      if (raw) {
        const u = JSON.parse(raw);
        const accessList = Array.isArray(u?.portalAccess) ? u.portalAccess : [];
        const commissionAccess = accessList.find(
          (p: any) => p?.portalName?.toLowerCase() === "commission",
        );
        const rawRole = (
          commissionAccess?.roleName ||
          u?.role?.name ||
          u?.roleName ||
          u?.role ||
          "user"
        )
          .trim()
          .toLowerCase()
          .replace(/[\s_-]/g, "");

        const isManagerOrAdmin =
          rawRole.includes("admin") ||
          rawRole.includes("manager") ||
          rawRole.includes("supervisor") ||
          rawRole.includes("director");

        // Accurately extract NTID: Check u.ntid, or if u.email contains it (e.g., "IVQ44285" or "IVQ44285@domain.com"), or u.username
        let ntid = (u?.ntid || u?.empCode || "").trim();
        if (!ntid && u?.email) {
          const emailVal = String(u.email).trim();
          ntid = emailVal.includes("@") ? emailVal.split("@")[0].trim() : emailVal;
        }
        if (!ntid && u?.username) {
          const usernameVal = String(u.username).trim();
          ntid = usernameVal.includes("@") ? usernameVal.split("@")[0].trim() : usernameVal;
        }

        const fullName = (u?.fullName || `${u?.firstName || ""} ${u?.lastName || ""}`).trim();
        return { isManagerOrAdmin, roleName: rawRole, ntid, fullName, rawUser: u };
      }
    } catch (e) {
      console.error("Error reading user auth in CommissionPage:", e);
    }
    return {
      isManagerOrAdmin: false,
      roleName: "user",
      ntid: "",
      fullName: "",
      rawUser: null,
    };
  }, []);

  const isManagerOrAdmin = userAuthInfo.isManagerOrAdmin;

  // Manager/Admin state
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [marketsList, setMarketsList] = useState<CommissionMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState<boolean>(false);

  // Single User State
  const [userRows, setUserRows] = useState<Row[]>([]);
  const [userLoading, setUserLoading] = useState<boolean>(true);

  // Filter states: date & market (defaults to today's date)
  const DEFAULT_DATE = useMemo(() => getTodayDate(), []);
  const [selectedDate, setSelectedDate] = useState<string>(DEFAULT_DATE);
  const [selectedMarket, setSelectedMarket] = useState<string>("all");

  // Server pagination states (for manager/admin table)
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [paginationInfo, setPaginationInfo] = useState<{
    totalRecords: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  }>({
    totalRecords: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  // Selected employee for detail modal breakdown (in Manager/Admin view)
  const [selectedEmployee, setSelectedEmployee] = useState<Row | null>(null);

  // Load markets for Manager/Admin view
  useEffect(() => {
    if (!isManagerOrAdmin) return;
    let active = true;
    const fetchMarkets = async () => {
      try {
        setMarketsLoading(true);
        const data = await commissionService.getMarkets();
        if (active) {
          setMarketsList(data);
        }
      } catch (error) {
        console.error("Error fetching markets:", error);
      } finally {
        if (active) setMarketsLoading(false);
      }
    };
    fetchMarkets();
    return () => {
      active = false;
    };
  }, [isManagerOrAdmin]);

  // Fetch paginated commission data for Manager/Admin
  const fetchManagerCommissionData = useCallback(async () => {
    if (!selectedDate || !isManagerOrAdmin) return;
    try {
      setLoading(true);
      const res = await commissionService.getAllEmployeeCommissionMarketWiseWithPagination({
        fromDate: selectedDate,
        toDate: selectedDate,
        page,
        pageSize,
        market: selectedMarket !== "all" ? selectedMarket : undefined,
      });

      setRows(res.data);
      setPaginationInfo({
        totalRecords: res.totalRecords,
        totalPages: res.totalPages,
        hasPreviousPage: res.hasPreviousPage,
        hasNextPage: res.hasNextPage,
      });
    } catch (error) {
      console.error("Error fetching paginated commission data:", error);
      setRows([]);
      setPaginationInfo({
        totalRecords: 0,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedMarket, page, pageSize, isManagerOrAdmin]);

  // Fetch single employee commission data for standard User by their NTID (without OTP)
  const fetchUserCommissionData = useCallback(async () => {
    if (isManagerOrAdmin) return;
    const ntidToFetch = userAuthInfo.ntid;
    if (!ntidToFetch) {
      setUserRows([]);
      setUserLoading(false);
      return;
    }
    try {
      setUserLoading(true);
      const data = await commissionService.getEmployeeCommission({
        ntid: ntidToFetch,
      });
      setUserRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching user commission:", error);
      setUserRows([]);
    } finally {
      setUserLoading(false);
    }
  }, [isManagerOrAdmin, userAuthInfo.ntid]);

  useEffect(() => {
    if (isManagerOrAdmin) {
      fetchManagerCommissionData();
    } else {
      fetchUserCommissionData();
    }
  }, [isManagerOrAdmin, fetchManagerCommissionData, fetchUserCommissionData]);

  // Handle filter changes (resets page to 1)
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setPage(1);
  };

  const handleMarketChange = (newMarket: string) => {
    setSelectedMarket(newMarket);
    setPage(1);
  };

  const summary = useSortable(rows);
  const detail = useSortable(rows);

  const formatCurrency = (val: number | null | undefined): string => {
    return `$${(val ?? 0).toFixed(2)}`;
  };

  // Find record for the selected date for single User Dashboard
  const currentSelectedUserRow = useMemo(() => {
    if (!userRows.length || !selectedDate) return null;
    const [selYear, selMonth, selDay] = selectedDate.split("-").map(Number);
    const match = userRows.find(
      (r) => r.year === selYear && r.month === selMonth && r.day === selDay,
    );
    return match || null;
  }, [userRows, selectedDate]);

  // Aggregated MTD Stats for single User
  const userMtdStats = useMemo(() => {
    if (!userRows.length) {
      return { totalCommission: 0, totalBoxes: 0, totalBoxCommission: 0, activeDays: 0 };
    }
    const totalCommission = userRows.reduce((acc, r) => acc + (r.commission ?? 0), 0);
    const totalBoxes = userRows.reduce((acc, r) => acc + (r.total_Box ?? 0), 0);
    const totalBoxCommission = userRows.reduce((acc, r) => acc + (r.box_Commission ?? 0), 0);
    return {
      totalCommission,
      totalBoxes,
      totalBoxCommission,
      activeDays: userRows.length,
    };
  }, [userRows]);

  const summaryCols: Column<Row>[] = [
    { key: "ntid", header: "NTID", accessor: (r) => r.ntid ?? "-", searchValue: (r) => r.ntid },
    { key: "market", header: "MARKET", accessor: (r) => r.market ?? "-" },
    {
      key: "name",
      header: (
        <SortableHeader
          label="EMPLOYEE NAME"
          onClick={() => summary.cycle("employee_Name")}
          indicator={summary.indicator("employee_Name")}
        />
      ),
      accessor: (r) => r.employee_Name ?? "-",
      searchValue: (r) => r.employee_Name,
    },
    {
      key: "date",
      header: "DATE",
      accessor: (r) =>
        `${r.year ?? 0}-${String(r.month ?? 0).padStart(2, "0")}-${String(r.day ?? 0).padStart(2, "0")}`,
    },
    {
      key: "comm",
      header: (
        <SortableHeader
          label="COMMISSION"
          onClick={() => summary.cycle("commission")}
          indicator={summary.indicator("commission")}
        />
      ),
      accessor: (r) => formatCurrency(r.commission),
    },
    { key: "box", header: "BOX COMM.", accessor: (r) => formatCurrency(r.box_Commission) },
    { key: "acc", header: "ACC COMM.", accessor: (r) => formatCurrency(r.acc_Sales) },
    {
      key: "act",
      header: "ACT. RETENTION",
      accessor: (r) => formatCurrency(r.activation_Retention_Commission),
    },
    { key: "vas", header: "VAS COMM.", accessor: (r) => formatCurrency(r.vaS_Commission) },
    { key: "hsi", header: "HSI COMM.", accessor: (r) => formatCurrency(r.hsI_Commission) },
    { key: "contest", header: "CONTEST", accessor: (r) => formatCurrency(r.contest) },
  ];

  const detailCols: Column<Row>[] = [
    { key: "ntid", header: "NTID", accessor: (r) => r.ntid ?? "-", searchValue: (r) => r.ntid },
    { key: "market", header: "MARKET", accessor: (r) => r.market ?? "-" },
    {
      key: "name",
      header: (
        <SortableHeader
          label="EMPLOYEE NAME"
          onClick={() => detail.cycle("employee_Name")}
          indicator={detail.indicator("employee_Name")}
        />
      ),
      accessor: (r) => r.employee_Name ?? "-",
      searchValue: (r) => r.employee_Name,
    },
    {
      key: "date",
      header: "DATE",
      accessor: (r) =>
        `${r.year ?? 0}-${String(r.month ?? 0).padStart(2, "0")}-${String(r.day ?? 0).padStart(2, "0")}`,
    },
    {
      key: "comm",
      header: (
        <SortableHeader
          label="COMMISSION"
          onClick={() => detail.cycle("commission")}
          indicator={detail.indicator("commission")}
        />
      ),
      accessor: (r) => formatCurrency(r.commission),
    },
    { key: "totBox", header: "TOTAL BOX", accessor: (r) => r.total_Box ?? 0 },
    { key: "boxC", header: "BOX COMM.", accessor: (r) => formatCurrency(r.box_Commission) },
    { key: "accS", header: "ACC SALES", accessor: (r) => r.acc_Sales ?? 0 },
    { key: "accC", header: "ACC COMM.", accessor: (r) => formatCurrency(r.acc_Sales) },
    {
      key: "act",
      header: "ACT. RETENTION (BRIDGE)",
      accessor: (r) => formatCurrency(r.activation_Retention_Commission),
    },
    { key: "vas", header: "VAS COMM.", accessor: (r) => formatCurrency(r.vaS_Commission) },
    ...MRC_KEYS.map((k) => ({
      key: `mrc${k}`,
      header: `${k} MRC`,
      accessor: (r: Row) => ((r as Record<string, unknown>)[`_${k}_MRC`] as number) ?? 0,
    })),
    ...WEB_KEYS.map((w) => ({
      key: `web${w.k}`,
      header: `${w.label}${w.k === "l40" ? " L1WEB Comm." : ""}`,
      accessor: (r: Row) => ((r as Record<string, unknown>)[w.k] as number) ?? 0,
    })),
    { key: "hsi", header: "HSI", accessor: (r) => r.hsi ?? 0 },
    { key: "hsiC", header: "HSI COMM.", accessor: (r) => formatCurrency(r.hsI_Commission) },
    {
      key: "wuc",
      header: "WRITE-UPS CHARGEBACKS",
      accessor: (r) => formatCurrency(r.write_Ups_Chargebacks),
    },
    { key: "contest", header: "CONTEST", accessor: (r) => formatCurrency(r.contest) },
    {
      key: "final",
      header: "FINAL COMM. AFTER DEDUCTION",
      accessor: (r) => formatCurrency(r.final_Commission_After_Deduction ?? r.commission),
    },
  ];

  const filtersActive =
    selectedDate !== DEFAULT_DATE || (isManagerOrAdmin && selectedMarket !== "all");

  const resetFilters = () => {
    setSelectedDate(DEFAULT_DATE);
    setSelectedMarket("all");
    setPage(1);
  };

  // -------------------------------------------------------------
  // VIEW 1: REGULAR USER VIEW (SINGLE EMPLOYEE DASHBOARD)
  // -------------------------------------------------------------
  if (!isManagerOrAdmin) {
    return (
      <div className="w-full space-y-6 animate-fade-in pb-8">
        {/* Top Header & Date Filter (Market Filter is hidden for single user) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight flex items-center gap-2">
              <span>My Commission</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Personal Dashboard
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Detailed performance metrics, daily earnings, and sales mix overview.
            </p>
          </div>

          {/* Date Picker Bar */}
          <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground ml-1" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-[155px] h-8 text-xs font-mono"
              />
            </div>
            {selectedDate !== DEFAULT_DATE && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
              >
                Today
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUserCommissionData()}
              disabled={userLoading}
              className="h-8 text-xs px-2.5"
            >
              {userLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {userLoading ? (
          <Card className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Loading your commission data...
            </p>
          </Card>
        ) : (
          <>
            {/* Selected Date Summary Metric Cards (Shows exact selected date values or $0.00 / 0 if no record) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4 border bg-card/60 relative overflow-hidden">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Total Commission</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(currentSelectedUserRow?.commission ?? 0)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {currentSelectedUserRow ? `For ${selectedDate}` : "No sales on this date"}
                </p>
              </Card>

              <Card className="p-4 border bg-card/60 relative overflow-hidden">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Boxes Sold</span>
                  <Boxes className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display">
                  {currentSelectedUserRow?.total_Box ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Box Comm: {formatCurrency(currentSelectedUserRow?.box_Commission ?? 0)}
                </p>
              </Card>

              <Card className="p-4 border bg-card/60 relative overflow-hidden">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Box Commission</span>
                  <Wallet className="w-4 h-4 text-violet-500" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display">
                  {formatCurrency(currentSelectedUserRow?.box_Commission ?? 0)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Base box payout</p>
              </Card>

              <Card className="p-4 border bg-card/60 relative overflow-hidden">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Final After Deduction</span>
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-bold font-display">
                  {formatCurrency(
                    currentSelectedUserRow?.final_Commission_After_Deduction ??
                      currentSelectedUserRow?.commission ??
                      0,
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Net day earnings</p>
              </Card>
            </div>

            {/* Quick Available Dates Switcher Strip */}
            {userRows.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Available Dates:
                </span>
                <div className="flex gap-1.5 flex-nowrap">
                  {userRows.map((r, idx) => {
                    const rDate = `${r.year}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
                    const isSelected = rDate === selectedDate;
                    return (
                      <button
                        key={`${rDate}-${idx}`}
                        type="button"
                        onClick={() => setSelectedDate(rDate)}
                        className={`px-3 py-1 rounded-full text-xs font-mono transition-all whitespace-nowrap border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                            : "bg-background hover:bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {rDate} ({formatCurrency(r.commission)})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Daily Detail Dashboard View */}
            {currentSelectedUserRow ? (
              <UserCommissionDashboard
                row={currentSelectedUserRow}
                formatCurrency={formatCurrency}
                selectedDate={selectedDate}
                fallbackUser={{
                  fullName: userAuthInfo.fullName,
                  ntid: userAuthInfo.ntid,
                }}
                showKpiCards={false}
              />
            ) : (
              <Card className="p-12 text-center border-dashed">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base">No record found for {selectedDate}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  You did not have any recorded sales or commission on this date.
                </p>
                {userRows.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const first = userRows[0];
                        if (first) {
                          setSelectedDate(
                            `${first.year}-${String(first.month).padStart(2, "0")}-${String(first.day).padStart(2, "0")}`,
                          );
                        }
                      }}
                    >
                      View Latest Active Day
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: MANAGER / ADMIN MULTI-EMPLOYEE TABLE VIEW
  // -------------------------------------------------------------
  const FilterBar = (
    <div className="flex flex-wrap items-end gap-3 w-full sm:w-auto">
      {/* Date Filter */}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground mb-1">Date</span>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-[170px] h-9 font-mono text-xs"
        />
      </div>

      {/* Markets Dropdown Filter (Visible for Managers & Admins) */}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground mb-1">Market</span>
        <Select value={selectedMarket} onValueChange={handleMarketChange} disabled={marketsLoading}>
          <SelectTrigger className="w-[190px] h-9">
            <SelectValue placeholder={marketsLoading ? "Loading markets..." : "All Markets"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All Markets</SelectItem>
            {marketsList.map((m) => (
              <SelectItem key={m.id} value={m.name}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <FilterReset active={filtersActive} onReset={resetFilters} />
    </div>
  );

  return (
    <Tabs defaultValue="summary" className="w-full space-y-5 animate-fade-in pb-8">
      {/* Top Line: Title & Subtitle + Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Commission</h1>
          <p className="text-sm text-muted-foreground">
            View commission breakdowns per market and employee.
          </p>
        </div>

        <TabsList className="self-start md:self-auto">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Overview</TabsTrigger>
        </TabsList>
      </div>

      {/* Second Line: filters + reset + stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-lg border">
        {FilterBar}

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium self-end lg:self-center">
          {loading ? (
            <span className="flex items-center gap-1.5 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading records...
            </span>
          ) : (
            <span>
              Total records:{" "}
              <strong className="text-foreground font-semibold">
                {paginationInfo.totalRecords}
              </strong>
            </span>
          )}
        </div>
      </div>

      <TabsContent value="summary" className="mt-2">
        <Card className="p-4">
          <DataTable<Row>
            rows={summary.sorted}
            columns={summaryCols}
            rowKey={(r, idx) => `${r.ntid}-${r.year}-${r.month}-${r.day}-${idx}`}
            rowCount={paginationInfo.totalRecords}
            page={page - 1}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            isLoading={loading}
            onRowClick={(row) => setSelectedEmployee(row)}
          />
        </Card>
      </TabsContent>

      <TabsContent value="detailed" className="mt-2">
        <Card className="p-4">
          <DataTable<Row>
            rows={detail.sorted}
            columns={detailCols}
            rowKey={(r, idx) => `${r.ntid}-${r.year}-${r.month}-${r.day}-${idx}`}
            rowCount={paginationInfo.totalRecords}
            page={page - 1}
            onPageChange={(zeroBased) => setPage(zeroBased + 1)}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            isLoading={loading}
            onRowClick={(row) => setSelectedEmployee(row)}
          />
        </Card>
      </TabsContent>

      {/* Employee Detail Modal for Admin/Manager */}
      <Dialog
        open={Boolean(selectedEmployee)}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Commission Details</DialogTitle>
            <DialogDescription>
              Detailed breakdown of commissions, deductions, and sales mix.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <UserCommissionDashboard row={selectedEmployee} formatCurrency={formatCurrency} />
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

// -------------------------------------------------------------
// REUSABLE USER COMMISSION DASHBOARD COMPONENT
// -------------------------------------------------------------
function UserCommissionDashboard({
  row,
  formatCurrency,
  fallbackUser,
  showKpiCards = true,
}: {
  row?: Row;
  formatCurrency: (v: number | null | undefined) => string;
  selectedDate?: string;
  fallbackUser?: { fullName?: string; ntid?: string };
  showKpiCards?: boolean;
}) {
  if (!row) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No commission record found for the selected date.
        </p>
      </Card>
    );
  }

  const displayName = row.employee_Name || fallbackUser?.fullName || "Employee";
  const displayNtid = row.ntid || fallbackUser?.ntid || "—";

  const kpis = [
    {
      label: "Total Commission",
      value: formatCurrency(row.commission),
      icon: DollarSign,
      highlight: true,
    },
    {
      label: "Final After Deduction",
      value: formatCurrency(row.final_Commission_After_Deduction ?? row.commission),
      icon: TrendingUp,
    },
    { label: "Total Boxes Sold", value: String(row.total_Box ?? 0), icon: Boxes },
    { label: "Box Commission", value: formatCurrency(row.box_Commission), icon: Wallet },
  ];

  const breakdown = [
    { label: "Acc Sales Units", value: String(row.acc_Sales ?? 0), isCurrency: false },
    { label: "Acc Sales Commission", value: formatCurrency(row.acc_Sales), isCurrency: true },
    {
      label: "Activation / Retention (Bridge)",
      value: formatCurrency(row.activation_Retention_Commission),
      isCurrency: true,
    },
    { label: "VAS Commission", value: formatCurrency(row.vaS_Commission), isCurrency: true },
    { label: "HSI Units", value: String(row.hsi ?? 0), isCurrency: false },
    { label: "HSI Commission", value: formatCurrency(row.hsI_Commission), isCurrency: true },
    { label: "Contest Earnings", value: formatCurrency(row.contest), isCurrency: true },
    {
      label: "Write-ups / Chargebacks",
      value: formatCurrency(row.write_Ups_Chargebacks),
      isCurrency: true,
      negative: (row.write_Ups_Chargebacks ?? 0) > 0,
    },
  ];

  const mrc = MRC_KEYS.map((k) => ({
    label: `${k} MRC`,
    value: Number((row as Record<string, unknown>)[`_${k}_MRC`] ?? 0),
  })).filter((x) => x.value > 0);

  const web = WEB_KEYS.map((w) => ({
    label: w.label,
    value: Number((row as Record<string, unknown>)[w.k] ?? 0),
  })).filter((x) => x.value > 0);

  const formattedRecordDate = `${row.year ?? 0}-${String(row.month ?? 0).padStart(2, "0")}-${String(row.day ?? 0).padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      {/* Identity Banner */}
      <Card className="relative overflow-hidden p-5 border bg-card">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-md"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              {displayName.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold">{displayName}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                  {displayNtid}
                </span>
              </div>
              <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                <span>
                  Market: <strong>{row.market ?? "—"}</strong>
                </span>
                <span>•</span>
                <span>
                  Date: <strong className="font-mono">{formattedRecordDate}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Day Net Earnings</span>
              <span className="text-2xl font-black font-display text-primary">
                {formatCurrency(row.final_Commission_After_Deduction ?? row.commission)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards Grid (Rendered only when showKpiCards is true) */}
      {showKpiCards && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <Card
              key={k.label}
              className={`relative overflow-hidden p-5 transition hover:shadow-md border ${
                k.highlight ? "border-primary/40 bg-primary/5" : ""
              }`}
            >
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold">{k.value}</div>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl backdrop-blur ${
                    k.highlight
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Two Columns: Commission Breakdown & MRC/Web Mix */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left Column: Earnings Breakdown */}
        <Card className="p-5 border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base font-semibold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span>Earnings & Deductions</span>
            </h2>
            <span className="text-xs text-muted-foreground font-mono">Day Breakdown</span>
          </div>

          <div className="divide-y divide-border/60">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{b.label}</span>
                <span
                  className={`font-semibold font-mono ${
                    b.negative ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {b.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Right Column: MRC & Web Mix */}
        <Card className="p-5 border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>MRC & Web Sales Mix</span>
            </h2>
            <span className="text-xs text-muted-foreground">Non-zero tiers</span>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Monthly Recurring Charge (MRC)</span>
                <span className="text-[11px] font-normal">
                  {mrc.reduce((acc, m) => acc + m.value, 0)} total
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mrc.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic py-1">
                    No MRC bucket sales for this date
                  </span>
                ) : (
                  mrc.map((m) => (
                    <span
                      key={m.label}
                      className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono font-medium text-primary shadow-xs"
                    >
                      {m.label}: <strong>{m.value}</strong>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Web Sales Tiers</span>
                <span className="text-[11px] font-normal">
                  {web.reduce((acc, w) => acc + w.value, 0)} total
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {web.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic py-1">
                    No Web tier sales for this date
                  </span>
                ) : (
                  web.map((w) => (
                    <span
                      key={w.label}
                      className="rounded-lg border bg-muted px-3 py-1 text-xs font-mono font-medium text-foreground"
                    >
                      {w.label}: <strong>{w.value}</strong>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
