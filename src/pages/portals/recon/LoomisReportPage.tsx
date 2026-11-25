import { useCallback, useEffect, useMemo, useState } from "react";
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
import { DataTable, type Column } from "@/components/data-table";
import { FilterReset } from "@/components/filter-reset";
import { exportToExcel } from "@/lib/excel-export";
import { useAuth } from "@/lib/auth";
import { loomisService, type LoomisReportRow } from "@/services/portals/recon";
import { ReconDateRangePicker } from "./components/ReconDateRangePicker";
import { AlertCircle, Download, FileSpreadsheet, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const EXPORT_COLUMNS = [
  "market",
  "storeCode",
  "storeName",
  "account",
  "bankName",
  "customer",
  "location",
  "safe",
  "safeFriendlyName",
  "serial",
  "businessDate",
  "transmittedOn",
  "validatedCpMd",
  "validatedMd",
  "validatedDrops",
  "vdBeforePickup",
  "vdAfterPickup",
  "changePurchaseTotal",
  "loomisPickup",
];

const EXPORT_HEADER_MAP: Record<string, string> = {
  market: "Market",
  storeCode: "Store Code",
  storeName: "Store Name",
  account: "Account",
  bankName: "Bank Name",
  customer: "Customer",
  location: "Location",
  safe: "Safe",
  safeFriendlyName: "Safe Name",
  serial: "Serial",
  businessDate: "Business Date",
  transmittedOn: "Transmitted On",
  validatedCpMd: "Validated CP MD",
  validatedMd: "Validated MD",
  validatedDrops: "Validated Drops",
  vdBeforePickup: "VD Before Pickup",
  vdAfterPickup: "VD After Pickup",
  changePurchaseTotal: "Change Purchase Total",
  loomisPickup: "Loomis Pickup",
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

export default function LoomisReportPage() {
  const { user } = useAuth();

  const userMarkets = useMemo(() => {
    const raw = Array.isArray(user?.markets) ? user.markets : [];
    return raw.map((m) => normalizeMarketOption(String(m?.name ?? ""))).filter(Boolean);
  }, [user]);

  const defaultMarket = userMarkets[0] ? userMarkets[0].toLowerCase() : "all";

  const [rows, setRows] = useState<LoomisReportRow[]>([]);
  const [apiMarkets, setApiMarkets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => getDefaultDateRange());
  const [marketFilter, setMarketFilter] = useState<string>(defaultMarket);
  const [bankFilter, setBankFilter] = useState("all");

  useEffect(() => {
    let active = true;
    void loomisService.getMarkets().then((markets) => {
      if (active) setApiMarkets(markets);
    });
    return () => {
      active = false;
    };
  }, []);

  const loadReports = useCallback(
    async (showToast = false) => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const fromDate = dateRange?.from ? formatApiSlashDate(dateRange.from) : undefined;
        const toSource = dateRange?.to ?? dateRange?.from;
        const toDate = toSource ? formatApiSlashDate(toSource) : undefined;
        const market = marketFilter !== "all" ? marketFilter.toLowerCase() : undefined;

        const data = await loomisService.getLoomisReports({
          fromDate,
          toDate,
          market,
        });
        setRows(data);

        if (showToast) {
          toast.success("Loomis report refreshed.");
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Failed to load Loomis report data.";
        console.error("Failed to load Loomis report:", error);
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
    void loadReports(false);
  }, [loadReports]);

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

  const bankOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.bankName).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (bankFilter !== "all" && row.bankName !== bankFilter) return false;
      if (!q) return true;
      return (
        row.market.toLowerCase().includes(q) ||
        row.storeCode.toLowerCase().includes(q) ||
        row.storeName.toLowerCase().includes(q) ||
        row.account.toLowerCase().includes(q) ||
        row.bankName.toLowerCase().includes(q) ||
        row.customer.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        row.safe.toLowerCase().includes(q) ||
        row.safeFriendlyName.toLowerCase().includes(q) ||
        row.serial.toLowerCase().includes(q) ||
        row.businessDate.toLowerCase().includes(q) ||
        (row.transmittedOn ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, bankFilter]);

  const defaultRange = useMemo(() => getDefaultDateRange(), []);
  const isCustomDateRange =
    !dateRange?.from ||
    dateRange.from.getTime() !== defaultRange.from?.getTime() ||
    (dateRange.to ?? dateRange.from).getTime() !== defaultRange.to?.getTime();

  const hasActiveFilters =
    search !== "" || bankFilter !== "all" || marketFilter !== defaultMarket || isCustomDateRange;

  const resetFilters = () => {
    setSearch("");
    setDateRange(getDefaultDateRange());
    setMarketFilter(defaultMarket);
    setBankFilter("all");
  };

  const columns: Column<LoomisReportRow>[] = [
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
      key: "account",
      header: "Account",
      className: "whitespace-nowrap",
      accessor: (r) => r.account || "—",
    },
    {
      key: "bankName",
      header: "Bank Name",
      className: "whitespace-nowrap",
      accessor: (r) => r.bankName || "—",
    },
    {
      key: "customer",
      header: "Customer",
      className: "whitespace-nowrap",
      accessor: (r) => r.customer || "—",
    },
    {
      key: "location",
      header: "Location",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="text-muted-foreground">{r.location || "—"}</span>,
    },
    {
      key: "safe",
      header: "Safe",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-mono text-xs">{r.safe || "—"}</span>,
    },
    {
      key: "safeFriendlyName",
      header: "Safe Name",
      className: "whitespace-nowrap",
      accessor: (r) => r.safeFriendlyName || "—",
    },
    {
      key: "serial",
      header: "Serial",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-mono text-xs">{r.serial || "—"}</span>,
    },
    {
      key: "businessDate",
      header: "Business Date",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.businessDate || "—"}</span>,
    },
    {
      key: "transmittedOn",
      header: "Transmitted On",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.transmittedOn ?? "—"}</span>,
    },
    {
      key: "validatedCpMd",
      header: "Validated CP MD",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.validatedCpMd)}</span>,
    },
    {
      key: "validatedMd",
      header: "Validated MD",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.validatedMd)}</span>,
    },
    {
      key: "validatedDrops",
      header: "Validated Drops",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="font-medium tabular-nums">{formatCurrency(r.validatedDrops)}</span>
      ),
    },
    {
      key: "vdBeforePickup",
      header: "VD Before Pickup",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.vdBeforePickup)}</span>,
    },
    {
      key: "vdAfterPickup",
      header: "VD After Pickup",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.vdAfterPickup)}</span>,
    },
    {
      key: "changePurchaseTotal",
      header: "Change Purchase Total",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="tabular-nums">{formatCurrency(r.changePurchaseTotal)}</span>
      ),
    },
    {
      key: "loomisPickup",
      header: "Loomis Pickup",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="font-medium tabular-nums">{formatCurrency(r.loomisPickup)}</span>
      ),
    },
  ];

  const handleExport = () => {
    const exportRows = filteredRows.map((row) => ({
      ...row,
      transmittedOn: row.transmittedOn ?? "",
    }));
    exportToExcel(
      exportRows as unknown as Record<string, unknown>[],
      EXPORT_COLUMNS,
      EXPORT_HEADER_MAP,
      {
        sheetName: "Loomis Report",
        fileName: "Loomis_Report",
      },
    );
  };

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">Loomis Report</h1>
            <p className="text-sm text-muted-foreground">
              Safe transmission, validated drops, and Loomis pickup records
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
            onClick={() => void loadReports(true)}
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
          placeholder="Search store code, store name, bank, customer, safe, serial..."
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
        <Select value={bankFilter} onValueChange={setBankFilter}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="Bank Name" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All banks</SelectItem>
            {bankOptions.map((bank) => (
              <SelectItem key={bank} value={bank}>
                {bank}
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
            <p className="text-sm">Loading Loomis report...</p>
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Unable to load Loomis records</p>
              <p className="text-xs text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadReports(false)}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try Again
            </Button>
          </div>
        ) : (
          <DataTable<LoomisReportRow>
            rows={filteredRows}
            columns={columns}
            hideSearch
            stickyHeader
            pageSize={15}
            rowKey={(row) => String(row.id)}
            emptyMessage="No Loomis records match the selected filters."
          />
        )}
      </Card>
    </div>
  );
}
