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
  Search,
} from "lucide-react";
import { FilterReset } from "@/components/filter-reset";
import {
  commissionService,
  type CommissionRow,
  type CommissionMarket,
} from "@/services/commission";

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

export default function CommissionPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [marketsList, setMarketsList] = useState<CommissionMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState<boolean>(false);

  // Filter states: date & market
  const DEFAULT_DATE = "2026-08-31";
  const [selectedDate, setSelectedDate] = useState<string>(DEFAULT_DATE);
  const [selectedMarket, setSelectedMarket] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Server pagination states
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

  // Selected employee for detail modal breakdown
  const [selectedEmployee, setSelectedEmployee] = useState<Row | null>(null);

  // Load markets from Leave/Markets API
  useEffect(() => {
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
  }, []);

  // Fetch paginated commission data
  const fetchCommissionData = useCallback(async () => {
    if (!selectedDate) return;
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
  }, [selectedDate, selectedMarket, page, pageSize]);

  useEffect(() => {
    fetchCommissionData();
  }, [fetchCommissionData]);

  // Handle filter changes (resets page to 1)
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setPage(1);
  };

  const handleMarketChange = (newMarket: string) => {
    setSelectedMarket(newMarket);
    setPage(1);
  };

  // Quick client search across loaded page records
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) => {
      const ntidMatch = r.ntid?.toLowerCase().includes(q);
      const nameMatch = r.employee_Name?.toLowerCase().includes(q);
      const marketMatch = r.market?.toLowerCase().includes(q);
      return ntidMatch || nameMatch || marketMatch;
    });
  }, [rows, searchTerm]);

  const summary = useSortable(filteredRows);
  const detail = useSortable(filteredRows);

  const formatCurrency = (val: number | null | undefined): string => {
    return `$${(val ?? 0).toFixed(2)}`;
  };

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
    selectedDate !== DEFAULT_DATE || selectedMarket !== "all" || searchTerm.trim() !== "";

  const resetFilters = () => {
    setSelectedDate(DEFAULT_DATE);
    setSelectedMarket("all");
    setSearchTerm("");
    setPage(1);
  };

  const FilterBar = (
    <div className="flex flex-wrap items-end gap-3 w-full sm:w-auto">
      {/* Date Filter */}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground mb-1">Date</span>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-[170px] h-9"
        />
      </div>

      {/* Markets Dropdown Filter */}
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

      {/* Quick search input */}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground mb-1">Search</span>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search name, NTID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[190px] h-9 pl-8"
          />
        </div>
      </div>

      <FilterReset active={filtersActive} onReset={resetFilters} />
    </div>
  );

  return (
    <Tabs defaultValue="summary" className="w-full space-y-5 animate-fade-in">
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

      {/* Employee Detail Modal */}
      <Dialog
        open={Boolean(selectedEmployee)}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Commission Details</DialogTitle>
            <DialogDescription>
              Detailed breakdown of commissions, deductions, and mix.
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

function UserCommissionDashboard({
  row,
  formatCurrency,
}: {
  row?: Row;
  formatCurrency: (v: number | null | undefined) => string;
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

  const kpis = [
    { label: "Total Commission", value: formatCurrency(row.commission), icon: DollarSign },
    {
      label: "Final After Deduction",
      value: formatCurrency(row.final_Commission_After_Deduction ?? row.commission),
      icon: TrendingUp,
    },
    { label: "Total Boxes", value: String(row.total_Box ?? 0), icon: Boxes },
    { label: "Box Commission", value: formatCurrency(row.box_Commission), icon: Wallet },
  ];

  const breakdown = [
    { label: "Acc Sales", value: String(row.acc_Sales ?? 0) },
    { label: "Activation / Retention", value: formatCurrency(row.activation_Retention_Commission) },
    { label: "VAS Commission", value: formatCurrency(row.vaS_Commission) },
    { label: "HSI", value: String(row.hsi ?? 0) },
    { label: "HSI Commission", value: formatCurrency(row.hsI_Commission) },
    { label: "Contest", value: formatCurrency(row.contest) },
    { label: "Write-ups / Chargebacks", value: formatCurrency(row.write_Ups_Chargebacks) },
  ];

  const mrc = MRC_KEYS.map((k) => ({
    label: `${k} MRC`,
    value: Number((row as Record<string, unknown>)[`_${k}_MRC`] ?? 0),
  })).filter((x) => x.value > 0);

  const web = WEB_KEYS.map((w) => ({
    label: w.label,
    value: Number((row as Record<string, unknown>)[w.k] ?? 0),
  })).filter((x) => x.value > 0);

  return (
    <div className="space-y-5">
      {/* Identity header */}
      <Card className="relative overflow-hidden p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            {(row.employee_Name ?? "U").trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-display text-xl font-semibold">{row.employee_Name ?? "—"}</div>
            <div className="text-sm text-muted-foreground">
              {row.ntid} • {row.market} • {row.year}-{String(row.month).padStart(2, "0")}-
              {String(row.day).padStart(2, "0")}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="relative overflow-hidden p-5 transition hover:shadow-lg">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </div>
                <div className="mt-2 font-display text-2xl font-semibold">{k.value}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 text-primary backdrop-blur">
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold">Commission breakdown</h2>
          <div className="mt-4 divide-y">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-medium">{b.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold">MRC & Web mix</h2>
          <p className="text-xs text-muted-foreground">Only non-zero buckets are shown.</p>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                MRC
              </div>
              <div className="flex flex-wrap gap-2">
                {mrc.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No MRC activity</span>
                ) : (
                  mrc.map((m) => (
                    <span
                      key={m.label}
                      className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {m.label}: {m.value}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Web
              </div>
              <div className="flex flex-wrap gap-2">
                {web.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No web activity</span>
                ) : (
                  web.map((w) => (
                    <span
                      key={w.label}
                      className="rounded-full border bg-muted px-3 py-1 text-xs font-medium"
                    >
                      {w.label}: {w.value}
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
