import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { Card } from "@/components/ui/card";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable, type Column } from "@/components/data-table";
import { FilterReset } from "@/components/filter-reset";
import { exportToExcel } from "@/lib/excel-export";
import {
  summaryReportService,
  type ReconSummaryDataset,
  type ReconSummaryStoreRow,
} from "@/services/portals/recon";
import { ReconDateRangePicker } from "./components/ReconDateRangePicker";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Landmark,
  DollarSign,
  CreditCard,
  Scale,
  Download,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORY_COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b"];

const EXPORT_COLUMNS = [
  "responsible",
  "salesDate",
  "market",
  "storeName",
  "address",
  "salesCash",
  "loomisPickup",
  "cashVariance",
  "salesCard",
  "cardPointerSettledAmount",
  "cardVariance",
];

const EXPORT_HEADER_MAP: Record<string, string> = {
  responsible: "Responsible",
  salesDate: "Sales Date",
  market: "Market",
  storeName: "Store Name",
  address: "Address",
  salesCash: "Cash Sales RTPOS",
  loomisPickup: "Loomis",
  cashVariance: "Difference",
  salesCard: "Card Sales RTPOS",
  cardPointerSettledAmount: "Card Point",
  cardVariance: "Difference",
};

const formatCurrency = (value: number): string => {
  const abs = Math.abs(value);
  const formatted = `$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return value < 0 ? `-${formatted}` : formatted;
};

const formatCompactCurrency = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

function parseLocalDate(rawDate: string): Date | null {
  const datePart = rawDate.trim().split(" ")[0];
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function deriveMarketFromLocation(location: string): string {
  const lower = location.toLowerCase();
  if (lower.includes(", az")) return "Arizona";
  if (lower.includes(", ca")) return "Los Angeles";
  return location || "Other";
}

function getShortStoreName(storeName: string): string {
  const hashIdx = storeName.indexOf("#");
  if (hashIdx > 0) {
    const prefix = storeName.slice(0, hashIdx).trim().split(" ")[0] || storeName;
    return `${prefix} ${storeName.slice(hashIdx)}`;
  }
  return storeName.length > 16 ? `${storeName.slice(0, 15)}…` : storeName;
}

export default function SummaryReportPage() {
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<ReconSummaryDataset>({
    loomisRows: [],
    salesRows: [],
    cardPointerRows: [],
    storeDirectory: {},
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [storeFilter, setStoreFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("all");
  const [chartView, setChartView] = useState<"store" | "market">("store");
  const [selectedStore, setSelectedStore] = useState<ReconSummaryStoreRow | null>(null);

  const loadDataset = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const data = await summaryReportService.getSummaryDataset();
      setDataset(data);
      if (showToast) {
        toast.success("Summary report refreshed.");
      }
    } catch (error) {
      console.error("Failed to load summary report:", error);
      toast.error("Failed to load reconciliation summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDataset(false);
  }, [loadDataset]);

  const dateBounds = useMemo(() => {
    if (!dateRange?.from) return null;
    const fromTime = new Date(
      dateRange.from.getFullYear(),
      dateRange.from.getMonth(),
      dateRange.from.getDate(),
    ).getTime();
    const toSource = dateRange.to ?? dateRange.from;
    const toTime = new Date(
      toSource.getFullYear(),
      toSource.getMonth(),
      toSource.getDate(),
      23,
      59,
      59,
      999,
    ).getTime();
    return { fromTime, toTime };
  }, [dateRange]);

  const inDateRange = useCallback(
    (rawDate: string) => {
      if (!dateBounds) return true;
      const parsed = parseLocalDate(rawDate);
      if (!parsed) return false;
      const time = parsed.getTime();
      return time >= dateBounds.fromTime && time <= dateBounds.toTime;
    },
    [dateBounds],
  );

  // Build market lookup per store from Sales rows and Loomis location
  const storeMarketLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of dataset.salesRows) {
      if (row.customer && row.market) map.set(row.customer, row.market);
    }
    for (const row of dataset.loomisRows) {
      if (row.storeName && !map.has(row.storeName)) {
        map.set(row.storeName, deriveMarketFromLocation(row.location));
      }
    }
    return map;
  }, [dataset]);

  const storeOptions = useMemo(() => {
    const names = new Set<string>();
    dataset.loomisRows.forEach((r) => names.add(r.storeName));
    dataset.salesRows.forEach((r) => names.add(r.customer));
    dataset.cardPointerRows.forEach((r) => names.add(r.storeName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [dataset]);

  const marketOptions = useMemo(() => {
    const markets = new Set<string>();
    storeMarketLookup.forEach((m) => markets.add(m));
    return Array.from(markets).sort((a, b) => a.localeCompare(b));
  }, [storeMarketLookup]);

  const filteredLoomis = useMemo(
    () =>
      dataset.loomisRows.filter((row) => {
        const market =
          storeMarketLookup.get(row.storeName) ?? deriveMarketFromLocation(row.location);
        if (storeFilter !== "all" && row.storeName !== storeFilter) return false;
        if (marketFilter !== "all" && market !== marketFilter) return false;
        return inDateRange(row.reconDate);
      }),
    [dataset.loomisRows, storeFilter, marketFilter, storeMarketLookup, inDateRange],
  );

  const filteredSales = useMemo(
    () =>
      dataset.salesRows.filter((row) => {
        if (storeFilter !== "all" && row.customer !== storeFilter) return false;
        if (marketFilter !== "all" && row.market !== marketFilter) return false;
        return inDateRange(row.invDate);
      }),
    [dataset.salesRows, storeFilter, marketFilter, inDateRange],
  );

  const filteredCardPointer = useMemo(
    () =>
      dataset.cardPointerRows.filter((row) => {
        const market = storeMarketLookup.get(row.storeName) ?? "Other";
        if (storeFilter !== "all" && row.storeName !== storeFilter) return false;
        if (marketFilter !== "all" && market !== marketFilter) return false;
        return inDateRange(row.date);
      }),
    [dataset.cardPointerRows, storeFilter, marketFilter, storeMarketLookup, inDateRange],
  );

  const storeRows = useMemo<ReconSummaryStoreRow[]>(() => {
    const map = new Map<string, ReconSummaryStoreRow>();

    const ensureStore = (
      storeName: string,
      marketHint?: string,
      companyHint?: string,
      addressHint?: string,
    ): ReconSummaryStoreRow => {
      const existing = map.get(storeName);
      const directoryInfo = dataset.storeDirectory[storeName];
      if (existing) {
        if (marketHint && existing.market === "Other") existing.market = marketHint;
        if (companyHint && !existing.company) existing.company = companyHint;
        if (addressHint && !existing.address) existing.address = addressHint;
        return existing;
      }
      const created: ReconSummaryStoreRow = {
        responsible: directoryInfo?.responsible || "Unassigned",
        salesDate: "",
        market: marketHint || storeMarketLookup.get(storeName) || "Other",
        storeName,
        address: directoryInfo?.address || addressHint || "-",
        company: companyHint || "",
        salesCash: 0,
        salesCard: 0,
        totalRevenue: 0,
        tangibleRev: 0,
        serialRev: 0,
        serviceRev: 0,
        paymentRev: 0,
        loomisDrops: 0,
        loomisPickup: 0,
        loomisVerifiedCount: 0,
        loomisRecordCount: 0,
        cardPointerSettledAmount: 0,
        cardPointerAllAmount: 0,
        cardPointerTxnCount: 0,
        cardPointerIssueCount: 0,
        cashVariance: 0,
        cardVariance: 0,
        netVariance: 0,
        latestDate: "",
      };
      map.set(storeName, created);
      return created;
    };

    for (const s of filteredSales) {
      const entry = ensureStore(s.customer, s.market, s.company);
      entry.salesCash += s.cashSale;
      entry.salesCard += s.cardSale;
      entry.totalRevenue += s.totalRevenue;
      entry.tangibleRev += s.tangibleRev;
      entry.serialRev += s.serialRev;
      entry.serviceRev += s.serviceRev;
      entry.paymentRev += s.paymentRev;
      if (s.invDate > entry.salesDate) entry.salesDate = s.invDate;
      if (s.invDate > entry.latestDate) entry.latestDate = s.invDate;
    }

    for (const l of filteredLoomis) {
      const entry = ensureStore(
        l.storeName,
        deriveMarketFromLocation(l.location),
        l.customer,
        l.location,
      );
      entry.loomisDrops += l.validatedDrops;
      entry.loomisPickup += l.loomisPickup;
      entry.loomisRecordCount += 1;
      if (l.pickupVerified) entry.loomisVerifiedCount += 1;
      if (l.reconDate > entry.latestDate) entry.latestDate = l.reconDate;
    }

    for (const c of filteredCardPointer) {
      const entry = ensureStore(c.storeName);
      entry.cardPointerTxnCount += 1;
      entry.cardPointerAllAmount += c.amount;
      if (c.status === "Approved" || c.status === "Settled") {
        entry.cardPointerSettledAmount += c.amount;
      } else {
        entry.cardPointerIssueCount += 1;
      }
      const dateOnly = c.date.split(" ")[0] || "";
      if (dateOnly > entry.latestDate) entry.latestDate = dateOnly;
    }

    const q = search.trim().toLowerCase();
    return Array.from(map.values())
      .map((entry) => {
        const cashVariance = entry.salesCash - entry.loomisPickup;
        const cardVariance = entry.salesCard - entry.cardPointerSettledAmount;
        return {
          ...entry,
          salesDate: entry.salesDate || entry.latestDate || "-",
          cashVariance,
          cardVariance,
          netVariance: cashVariance + cardVariance,
        };
      })
      .filter((entry) => {
        if (!q) return true;
        return (
          entry.responsible.toLowerCase().includes(q) ||
          entry.salesDate.toLowerCase().includes(q) ||
          entry.market.toLowerCase().includes(q) ||
          entry.storeName.toLowerCase().includes(q) ||
          entry.address.toLowerCase().includes(q) ||
          entry.company.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [
    filteredSales,
    filteredLoomis,
    filteredCardPointer,
    dataset.storeDirectory,
    storeMarketLookup,
    search,
  ]);

  const summaryTotals = useMemo(() => {
    const totalRevenue = storeRows.reduce((sum, r) => sum + r.totalRevenue, 0);
    const salesCash = storeRows.reduce((sum, r) => sum + r.salesCash, 0);
    const salesCard = storeRows.reduce((sum, r) => sum + r.salesCard, 0);
    const loomisDrops = storeRows.reduce((sum, r) => sum + r.loomisDrops, 0);
    const loomisPickup = storeRows.reduce((sum, r) => sum + r.loomisPickup, 0);
    const loomisVerified = storeRows.reduce((sum, r) => sum + r.loomisVerifiedCount, 0);
    const loomisRecords = storeRows.reduce((sum, r) => sum + r.loomisRecordCount, 0);
    const cardSettled = storeRows.reduce((sum, r) => sum + r.cardPointerSettledAmount, 0);
    const cardTxns = storeRows.reduce((sum, r) => sum + r.cardPointerTxnCount, 0);
    const cardIssues = storeRows.reduce((sum, r) => sum + r.cardPointerIssueCount, 0);
    const tangibleRev = storeRows.reduce((sum, r) => sum + r.tangibleRev, 0);
    const serialRev = storeRows.reduce((sum, r) => sum + r.serialRev, 0);
    const serviceRev = storeRows.reduce((sum, r) => sum + r.serviceRev, 0);
    const paymentRev = storeRows.reduce((sum, r) => sum + r.paymentRev, 0);

    return {
      totalRevenue,
      salesCash,
      salesCard,
      loomisDrops,
      loomisPickup,
      loomisVerified,
      loomisRecords,
      cardSettled,
      cardTxns,
      cardIssues,
      cashVariance: salesCash - loomisPickup,
      cardVariance: salesCard - cardSettled,
      netVariance: salesCash - loomisPickup + (salesCard - cardSettled),
      tangibleRev,
      serialRev,
      serviceRev,
      paymentRev,
    };
  }, [storeRows]);

  const comparisonChartData = useMemo(() => {
    if (chartView === "market") {
      const byMarket = new Map<
        string,
        { label: string; revenue: number; loomis: number; cardPointer: number }
      >();
      for (const row of storeRows) {
        const current = byMarket.get(row.market) ?? {
          label: row.market,
          revenue: 0,
          loomis: 0,
          cardPointer: 0,
        };
        current.revenue += row.totalRevenue;
        current.loomis += row.loomisPickup;
        current.cardPointer += row.cardPointerSettledAmount;
        byMarket.set(row.market, current);
      }
      return Array.from(byMarket.values());
    }

    return storeRows.slice(0, 8).map((row) => ({
      label: getShortStoreName(row.storeName),
      fullName: row.storeName,
      revenue: row.totalRevenue,
      loomis: row.loomisPickup,
      cardPointer: row.cardPointerSettledAmount,
    }));
  }, [storeRows, chartView]);

  const categoryMixData = useMemo(() => {
    const total =
      summaryTotals.tangibleRev +
      summaryTotals.serialRev +
      summaryTotals.serviceRev +
      summaryTotals.paymentRev;
    const raw = [
      { name: "Serial", value: summaryTotals.serialRev },
      { name: "Payment", value: summaryTotals.paymentRev },
      { name: "Tangible", value: summaryTotals.tangibleRev },
      { name: "Service", value: summaryTotals.serviceRev },
    ];
    return raw.map((item, index) => ({
      ...item,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      pct: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [summaryTotals]);

  const hasActiveFilters =
    search !== "" || Boolean(dateRange?.from) || storeFilter !== "all" || marketFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setDateRange(undefined);
    setStoreFilter("all");
    setMarketFilter("all");
  };

  const columns: Column<ReconSummaryStoreRow>[] = [
    {
      key: "responsible",
      header: "Responsible",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-medium text-foreground">{r.responsible}</span>,
    },
    {
      key: "salesDate",
      header: "Sales Date",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-mono text-xs tabular-nums">{r.salesDate}</span>,
    },
    {
      key: "market",
      header: "Market",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="text-muted-foreground">{r.market}</span>,
    },
    {
      key: "storeName",
      header: "Store Name",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-medium">{r.storeName}</span>,
    },
    {
      key: "address",
      header: "Address",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="text-muted-foreground">{r.address}</span>,
    },
    {
      key: "salesCash",
      header: "Cash Sales RTPOS",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.salesCash)}</span>,
    },
    {
      key: "loomisPickup",
      header: "Loomis",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.loomisPickup)}</span>,
    },
    {
      key: "cashVariance",
      header: "Difference",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span
          className={`tabular-nums font-medium ${
            Math.abs(r.cashVariance) < 0.01
              ? "text-emerald-700 dark:text-emerald-400"
              : r.cashVariance > 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-rose-700 dark:text-rose-400"
          }`}
        >
          {formatCurrency(r.cashVariance)}
        </span>
      ),
    },
    {
      key: "salesCard",
      header: "Card Sales RTPOS",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.salesCard)}</span>,
    },
    {
      key: "cardPointerSettledAmount",
      header: "Card Point",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="tabular-nums">{formatCurrency(r.cardPointerSettledAmount)}</span>
      ),
    },
    {
      key: "cardVariance",
      header: "Difference",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span
          className={`tabular-nums font-medium ${
            Math.abs(r.cardVariance) < 0.01
              ? "text-emerald-700 dark:text-emerald-400"
              : r.cardVariance > 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-rose-700 dark:text-rose-400"
          }`}
        >
          {formatCurrency(r.cardVariance)}
        </span>
      ),
    },
  ];

  const handleExport = () => {
    exportToExcel(
      storeRows as unknown as Record<string, unknown>[],
      EXPORT_COLUMNS,
      EXPORT_HEADER_MAP,
      {
        sheetName: "Recon Summary",
        fileName: "Recon_Summary_Report",
      },
    );
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm">Loading reconciliation summary...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-fade-in pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">Summary Report</h1>
            <p className="text-sm text-muted-foreground">
              Consolidated reconciliation across Loomis pickups, store sales, and CardPointer
              settlements
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={storeRows.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => void loadDataset(true)}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search responsible, market, store, or address..."
          className="h-9 min-w-[220px] flex-[2]"
        />
        <ReconDateRangePicker value={dateRange} onChange={setDateRange} />
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="h-9 w-56">
            <SelectValue placeholder="Store Name" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            {storeOptions.map((store) => (
              <SelectItem key={store} value={store}>
                {store}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={marketFilter} onValueChange={setMarketFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Market" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All markets</SelectItem>
            {marketOptions.map((market) => (
              <SelectItem key={market} value={market}>
                {market}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FilterReset onReset={resetFilters} active={hasActiveFilters} />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-blue-200/80 bg-blue-50/80 p-5 dark:border-blue-900/50 dark:bg-blue-950/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="text-xs font-medium text-blue-950/75 dark:text-blue-200/80">
                Total Sales Revenue
              </div>
              <div className="font-display text-2xl font-bold tracking-tight tabular-nums text-foreground">
                {formatCurrency(summaryTotals.totalRevenue)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <span>Cash {formatCurrency(summaryTotals.salesCash)}</span>
                <span aria-hidden="true">·</span>
                <span>Card {formatCurrency(summaryTotals.salesCard)}</span>
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-emerald-200/80 bg-emerald-50/80 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="text-xs font-medium text-emerald-950/75 dark:text-emerald-200/80">
                Loomis Safe Pickups
              </div>
              <div className="font-display text-2xl font-bold tracking-tight tabular-nums text-foreground">
                {formatCurrency(summaryTotals.loomisPickup)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <span>Drops {formatCurrency(summaryTotals.loomisDrops)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {summaryTotals.loomisVerified}/{summaryTotals.loomisRecords} verified
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-violet-200/80 bg-violet-50/80 p-5 dark:border-violet-900/50 dark:bg-violet-950/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="text-xs font-medium text-violet-950/75 dark:text-violet-200/80">
                CardPointer Settled & Approved
              </div>
              <div className="font-display text-2xl font-bold tracking-tight tabular-nums text-foreground">
                {formatCurrency(summaryTotals.cardSettled)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <span>{summaryTotals.cardTxns} transactions</span>
                <span aria-hidden="true">·</span>
                <span>{summaryTotals.cardIssues} pending/declined</span>
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border-amber-200/80 bg-amber-50/80 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="text-xs font-medium text-amber-950/75 dark:text-amber-200/80">
                Cash Recon Variance
              </div>
              <div className="font-display text-2xl font-bold tracking-tight tabular-nums text-foreground">
                {formatCurrency(summaryTotals.cashVariance)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                <span>Sales Cash vs Loomis Pickup</span>
                <span aria-hidden="true">·</span>
                <span>{storeRows.length} stores</span>
              </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <Scale className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="p-5 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                Revenue vs Loomis Pickup & CardPointer
              </h2>
              <p className="text-xs text-muted-foreground">
                Cross-source comparison across active reconciliation records
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setChartView("store")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  chartView === "store"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                By Store
              </button>
              <button
                type="button"
                onClick={() => setChartView("market")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  chartView === "market"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                By Market
              </button>
            </div>
          </div>

          {comparisonChartData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No chart data available for the selected filters.
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={comparisonChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompactCurrency(Number(v))}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    axisLine={false}
                    tickLine={false}
                    width={58}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(Number(value)),
                      name,
                    ]}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--card)",
                      color: "var(--foreground)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Total Revenue"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="loomis" name="Loomis Pickup" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="cardPointer"
                    name="CardPointer Settled"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="flex flex-col justify-between p-5 lg:col-span-5">
          <div>
            <div className="mb-3">
              <h2 className="font-display text-base font-semibold text-foreground">
                Sales Mix & Portal Links
              </h2>
              <p className="text-xs text-muted-foreground">
                Revenue distribution by category and direct drill-down
              </p>
            </div>

            {summaryTotals.totalRevenue === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
                No sales category data available.
              </div>
            ) : (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryMixData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={74}
                        paddingAngle={2}
                      >
                        {categoryMixData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(Number(value))}
                        contentStyle={{
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--card)",
                          color: "var(--foreground)",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5">
                  {categoryMixData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-foreground">{item.name}</span>
                      </div>
                      <div className="text-right tabular-nums text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatCompactCurrency(item.value)}
                        </span>{" "}
                        <span>({item.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Detailed Recon Reports
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-between px-2.5 text-xs"
                onClick={() => navigate("/recon/loomis-report")}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Loomis</span>
                </span>
                <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-between px-2.5 text-xs"
                onClick={() => navigate("/recon/sales-report")}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Sales</span>
                </span>
                <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-between px-2.5 text-xs"
                onClick={() => navigate("/recon/card-pointer")}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">CardPointer</span>
                </span>
                <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Store Reconciliation Summary
            </h2>
            <p className="text-xs text-muted-foreground">
              Click any store row to inspect its combined Loomis, Sales, and CardPointer breakdown
            </p>
          </div>
        </div>
        <DataTable<ReconSummaryStoreRow>
          rows={storeRows}
          columns={columns}
          hideSearch
          stickyHeader
          pageSize={15}
          rowKey={(row) => row.storeName}
          onRowClick={(row) => setSelectedStore(row)}
          emptyMessage="No reconciliation summary records match the selected filters."
        />
      </Card>

      <Sheet open={Boolean(selectedStore)} onOpenChange={(open) => !open && setSelectedStore(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedStore && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="font-display text-lg">{selectedStore.storeName}</SheetTitle>
                <SheetDescription>
                  {selectedStore.market} · {selectedStore.responsible}
                </SheetDescription>
                <p className="text-xs text-muted-foreground">{selectedStore.address}</p>
              </SheetHeader>

              <div className="space-y-4">
                <div className="space-y-2 border-b border-border pb-4">
                  <div className="text-xs font-semibold text-muted-foreground">Sales Summary</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(selectedStore.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cash Sale</span>
                    <span className="tabular-nums">{formatCurrency(selectedStore.salesCash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Card Sale</span>
                    <span className="tabular-nums">{formatCurrency(selectedStore.salesCard)}</span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-border pb-4">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Loomis Safe Reconciliation
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Validated Drops</span>
                    <span className="tabular-nums">
                      {formatCurrency(selectedStore.loomisDrops)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Loomis Pickup</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(selectedStore.loomisPickup)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cash Variance</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(selectedStore.cashVariance)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-b border-border pb-4">
                  <div className="text-xs font-semibold text-muted-foreground">
                    CardPointer Gateway
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Settled / Approved Amount</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(selectedStore.cardPointerSettledAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Transactions</span>
                    <span className="tabular-nums">{selectedStore.cardPointerTxnCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Card Variance</span>
                    <span className="tabular-nums">
                      {formatCurrency(selectedStore.cardVariance)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/recon/loomis-report")}
                  >
                    Loomis
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/recon/sales-report")}
                  >
                    Sales
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/recon/card-pointer")}
                  >
                    CardPointer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
