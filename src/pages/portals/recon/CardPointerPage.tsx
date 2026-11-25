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
import {
  cardPointerService,
  type CardPointerRow,
  type CardPointerStatus,
} from "@/services/portals/recon";
import { ReconDateRangePicker } from "./components/ReconDateRangePicker";
import { CreditCard, Download, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EXPORT_COLUMNS = [
  "date",
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

const STATUS_BADGE_CLASSES: Record<CardPointerStatus, string> = {
  Approved: "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400",
  Settled:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  Pending: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  Declined: "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
  Voided: "border-border bg-muted text-muted-foreground",
};

const formatCurrency = (value: number): string =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function parseRowLocalDate(rawDate: string): Date | null {
  const datePart = rawDate.trim().split(" ")[0];
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export default function CardPointerPage() {
  const [rows, setRows] = useState<CardPointerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [storeFilter, setStoreFilter] = useState("all");

  const loadTransactions = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const data = await cardPointerService.getCardPointerTransactions();
      setRows(data);
      if (showToast) {
        toast.success("CardPointer report refreshed.");
      }
    } catch (error) {
      console.error("Failed to load CardPointer transactions:", error);
      toast.error("Failed to load CardPointer data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTransactions(false);
  }, [loadTransactions]);

  const storeOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.storeName).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTime = dateRange?.from
      ? new Date(
          dateRange.from.getFullYear(),
          dateRange.from.getMonth(),
          dateRange.from.getDate(),
        ).getTime()
      : null;
    const toSource = dateRange?.to ?? dateRange?.from;
    const toTime = toSource
      ? new Date(
          toSource.getFullYear(),
          toSource.getMonth(),
          toSource.getDate(),
          23,
          59,
          59,
          999,
        ).getTime()
      : null;

    return rows.filter((row) => {
      if (storeFilter !== "all" && row.storeName !== storeFilter) return false;

      if (fromTime !== null && toTime !== null) {
        const parsedDate = parseRowLocalDate(row.date);
        if (!parsedDate) return false;
        const rowTime = parsedDate.getTime();
        if (rowTime < fromTime || rowTime > toTime) return false;
      }

      if (!q) return true;
      return (
        row.date.toLowerCase().includes(q) ||
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
  }, [rows, search, dateRange, storeFilter]);

  const hasActiveFilters = search !== "" || Boolean(dateRange?.from) || storeFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setDateRange(undefined);
    setStoreFilter("all");
  };

  const columns: Column<CardPointerRow>[] = [
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.date}</span>,
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
      accessor: (r) => <span className="font-mono text-xs">{r.transactionNo}</span>,
    },
    {
      key: "method",
      header: "Method",
      className: "whitespace-nowrap",
      accessor: (r) => r.method,
    },
    {
      key: "name",
      header: "Name",
      className: "whitespace-nowrap",
      accessor: (r) => r.name,
    },
    {
      key: "brand",
      header: "Brand",
      className: "whitespace-nowrap",
      accessor: (r) => r.brand,
    },
    {
      key: "last4",
      header: "Last 4",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-mono text-xs">•••• {r.last4}</span>,
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
      accessor: (r) => <span className="font-mono text-xs">{r.authCode}</span>,
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap",
      accessor: (r) => (
        <Badge variant="outline" className={STATUS_BADGE_CLASSES[r.status]}>
          {r.status}
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
          placeholder="Search transaction no, name, brand, last 4, auth code..."
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
        <FilterReset onReset={resetFilters} active={hasActiveFilters} />
      </Card>

      <Card className="p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading CardPointer transactions...</p>
          </div>
        ) : (
          <DataTable<CardPointerRow>
            rows={filteredRows}
            columns={columns}
            hideSearch
            stickyHeader
            pageSize={15}
            rowKey={(row) => String(row.id)}
            emptyMessage="No CardPointer transactions match the selected filters."
          />
        )}
      </Card>
    </div>
  );
}
