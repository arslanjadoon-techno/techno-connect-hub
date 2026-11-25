import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/data-table";
import { FilterReset } from "@/components/filter-reset";
import { exportToExcel } from "@/lib/excel-export";
import { useAuth } from "@/lib/auth";
import { cardPointerService, type CardPointerRow } from "@/services/portals/recon";
import { ReconDateRangePicker } from "./components/ReconDateRangePicker";
import { AlertCircle, CreditCard, Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const EXPORT_COLUMNS = [
  "date",
  "market",
  "storeCode",
  "storeName",
  "transactionNo",
  "method",
  "name",
  "brand",
  "last4",
  "amount",
  "authCode",
  "status",
];

const EXPORT_HEADER_MAP: Record<string, string> = {
  date: "Date",
  market: "Market",
  storeCode: "Store Code",
  storeName: "Store Name",
  transactionNo: "Transaction No",
  method: "Method",
  name: "Name",
  brand: "Brand",
  last4: "Last 4",
  amount: "Amount",
  authCode: "Auth Code",
  status: "Status",
};

const formatCurrency = (value: number): string =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatApiSlashDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

function getDefaultDateRange(): DateRange {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  return { from, to };
}

function normalizeMarketOption(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusBadgeClass(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "PROCESSED" || normalized === "SETTLED") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400";
  }
  if (normalized === "APPROVED") {
    return "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400";
  }
  if (normalized === "PENDING") {
    return "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400";
  }
  if (normalized === "DECLINED" || normalized === "FAILED" || normalized === "ERROR") {
    return "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400";
  }
  return "border-border bg-muted text-muted-foreground";
}

export default function CardPointerPage() {
  const { user } = useAuth();

  const userMarkets = useMemo(() => {
    const raw = Array.isArray(user?.markets) ? user.markets : [];
    return raw.map((m) => normalizeMarketOption(String(m?.name ?? ""))).filter(Boolean);
  }, [user]);

  const defaultMarket = userMarkets[0] ? userMarkets[0].toLowerCase() : "all";

  const [rows, setRows] = useState<CardPointerRow[]>([]);
  const [apiMarkets, setApiMarkets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => getDefaultDateRange());
  const [marketFilter, setMarketFilter] = useState<string>(defaultMarket);
  const [storeFilter, setStoreFilter] = useState("all");

  useEffect(() => {
    let active = true;
    void cardPointerService.getMarkets().then((markets) => {
      if (active) setApiMarkets(markets);
    });
    return () => {
      active = false;
    };
  }, []);

  const loadTransactions = useCallback(
    async (showToast = false) => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const fromDate = dateRange?.from ? formatApiSlashDate(dateRange.from) : undefined;
        const toSource = dateRange?.to ?? dateRange?.from;
        const toDate = toSource ? formatApiSlashDate(toSource) : undefined;
        const market = marketFilter !== "all" ? marketFilter.toLowerCase() : undefined;

        const data = await cardPointerService.getCardPointerTransactions({
          fromDate,
          toDate,
          market,
        });
        setRows(data);

        if (showToast) {
          toast.success("CardPointer report refreshed.");
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Failed to load CardPointer data.";
        console.error("Failed to load CardPointer transactions:", error);
        setErrorMessage(message);
        setRows([]);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [dateRange, marketFilter],
  );

  useEffect(() => {
    void loadTransactions(false);
  }, [loadTransactions]);

  const marketOptions = useMemo(() => {
    const map = new Map<string, string>();
    const addOption = (raw: string) => {
      const normalized = normalizeMarketOption(raw);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (!map.has(key)) map.set(key, normalized);
    };

    userMarkets.forEach(addOption);
    apiMarkets.forEach(addOption);
    rows.forEach((r) => addOption(r.market));

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [userMarkets, apiMarkets, rows]);

  const storeOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.storeName).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (storeFilter !== "all" && row.storeName !== storeFilter) return false;

      if (!q) return true;
      return (
        row.date.toLowerCase().includes(q) ||
        row.market.toLowerCase().includes(q) ||
        row.storeCode.toLowerCase().includes(q) ||
        row.storeName.toLowerCase().includes(q) ||
        row.transactionNo.toLowerCase().includes(q) ||
        row.method.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.brand.toLowerCase().includes(q) ||
        row.last4.toLowerCase().includes(q) ||
        row.authCode.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      );
    });
  }, [rows, search, storeFilter]);

  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const isCustomDateRange =
    !dateRange?.from ||
    dateRange.from.getTime() !== defaultRange.from?.getTime() ||
    (dateRange.to ?? dateRange.from).getTime() !== defaultRange.to?.getTime();

  const hasActiveFilters =
    search !== "" || storeFilter !== "all" || marketFilter !== defaultMarket || isCustomDateRange;

  const resetFilters = () => {
    setSearch("");
    setDateRange(getDefaultDateRange());
    setMarketFilter(defaultMarket);
    setStoreFilter("all");
  };

  const columns: Column<CardPointerRow>[] = [
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.date || "—"}</span>,
    },
    {
      key: "market",
      header: "Market",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-medium">{r.market || "—"}</span>,
    },
    {
      key: "storeCode",
      header: "Store Code",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-mono text-xs">{r.storeCode || "—"}</span>,
    },
    {
      key: "storeName",
      header: "Store Name",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-medium">{r.storeName}</span>,
    },
    {
      key: "transactionNo",
      header: "Transaction No",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-mono text-xs">{r.transactionNo || "—"}</span>,
    },
    {
      key: "method",
      header: "Method",
      className: "whitespace-nowrap",
      accessor: (r) => r.method || "—",
    },
    {
      key: "name",
      header: "Name",
      className: "whitespace-nowrap",
      accessor: (r) => r.name || "—",
    },
    {
      key: "brand",
      header: "Brand",
      className: "whitespace-nowrap",
      accessor: (r) => r.brand || "—",
    },
    {
      key: "last4",
      header: "Last 4",
      className: "whitespace-nowrap",
      accessor: (r) => (
        <span className="font-mono text-xs">{r.last4 ? `•••• ${r.last4}` : "—"}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.amount)}</span>,
    },
    {
      key: "authCode",
      header: "Auth Code",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-mono text-xs">{r.authCode || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      accessor: (r) => (
        <Badge variant="outline" className={getStatusBadgeClass(r.status)}>
          {r.status || "Unknown"}
        </Badge>
      ),
    },
  ];

  const handleExport = () => {
    exportToExcel(
      filteredRows as unknown as Record<string, unknown>[],
      EXPORT_COLUMNS,
      EXPORT_HEADER_MAP,
      {
        sheetName: "CardPointer",
        fileName: "CardPointer_Report",
      },
    );
  };

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">CardPointer</h1>
            <p className="text-sm text-muted-foreground">
              Card payment gateway transactions, authorization codes, and settlement statuses
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredRows.length === 0}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadTransactions(true)}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transaction no, store code, store name, name, brand, last 4, auth code..."
          className="h-9 min-w-[220px] flex-[2]"
        />
        <ReconDateRangePicker value={dateRange} onChange={setDateRange} />
        <Select value={marketFilter} onValueChange={setMarketFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Market" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All markets</SelectItem>
            {marketOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <FilterReset onReset={resetFilters} active={hasActiveFilters} />
      </Card>

      <Card className="p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading CardPointer transactions...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Unable to load CardPointer transactions
              </p>
              <p className="text-xs text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadTransactions(false)}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try Again
            </Button>
          </div>
        ) : (
          <DataTable<CardPointerRow>
            rows={filteredRows}
            columns={columns}
            hideSearch
            stickyHeader
            pageSize={15}
            rowKey={(row) => row.id}
            emptyMessage="No CardPointer transactions match the selected filters."
          />
        )}
      </Card>
    </div>
  );
}
