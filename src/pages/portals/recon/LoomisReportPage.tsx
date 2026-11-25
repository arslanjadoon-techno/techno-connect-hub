import { useCallback, useEffect, useMemo, useState } from "react";
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
import { loomisService, type LoomisReportRow } from "@/services/portals/recon";
import { FileSpreadsheet, Download, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EXPORT_COLUMNS = [
  "storeName",
  "bankName",
  "customer",
  "location",
  "safe",
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
  "pickupOn",
  "pickupVerified",
  "pickupVerifiedOn",
  "mdTotal",
  "manualRemovals",
  "manualTransfers",
  "tubeVend",
  "tubeLoad",
  "dispense",
  "cashDispense",
  "coinDispense",
  "reconDate",
];

const EXPORT_HEADER_MAP: Record<string, string> = {
  storeName: "Store Name",
  bankName: "Bank Name",
  customer: "Customer",
  location: "Location",
  safe: "Safe",
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
  pickupOn: "Pickup On",
  pickupVerified: "Pickup Verified",
  pickupVerifiedOn: "Pickup Verified On",
  mdTotal: "MD Total",
  manualRemovals: "Manual Removals",
  manualTransfers: "Manual Transfers",
  tubeVend: "Tube Vend",
  tubeLoad: "Tube Load",
  dispense: "Dispense",
  cashDispense: "Cash Dispense",
  coinDispense: "Coin Dispense",
  reconDate: "Recon Date",
};

const formatCurrency = (value: number): string =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const VERIFIED_BADGE_CLASSES = {
  verified:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  pending: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
};

export default function LoomisReportPage() {
  const [rows, setRows] = useState<LoomisReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

  const loadReports = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const data = await loomisService.getLoomisReports();
      setRows(data);
      if (showToast) {
        toast.success("Loomis report refreshed.");
      }
    } catch (error) {
      console.error("Failed to load Loomis report:", error);
      toast.error("Failed to load Loomis report data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports(false);
  }, [loadReports]);

  const bankOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.bankName).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (bankFilter !== "all" && row.bankName !== bankFilter) return false;
      if (verifiedFilter === "verified" && !row.pickupVerified) return false;
      if (verifiedFilter === "pending" && row.pickupVerified) return false;
      if (!q) return true;
      return (
        row.storeName.toLowerCase().includes(q) ||
        row.bankName.toLowerCase().includes(q) ||
        row.customer.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        row.safe.toLowerCase().includes(q) ||
        row.serial.toLowerCase().includes(q) ||
        row.businessDate.toLowerCase().includes(q) ||
        row.transmittedOn.toLowerCase().includes(q) ||
        row.reconDate.toLowerCase().includes(q)
      );
    });
  }, [rows, search, bankFilter, verifiedFilter]);

  const hasActiveFilters = search !== "" || bankFilter !== "all" || verifiedFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setBankFilter("all");
    setVerifiedFilter("all");
  };

  const columns: Column<LoomisReportRow>[] = [
    {
      key: "storeName",
      header: "Store Name",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-medium">{r.storeName}</span>,
    },
    {
      key: "bankName",
      header: "Bank Name",
      className: "whitespace-nowrap",
      accessor: (r) => r.bankName,
    },
    {
      key: "customer",
      header: "Customer",
      className: "whitespace-nowrap",
      accessor: (r) => r.customer,
    },
    {
      key: "location",
      header: "Location",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="text-muted-foreground">{r.location}</span>,
    },
    {
      key: "safe",
      header: "Safe",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-mono text-xs">{r.safe}</span>,
    },
    {
      key: "serial",
      header: "Serial",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-mono text-xs">{r.serial}</span>,
    },
    {
      key: "businessDate",
      header: "Business Date",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.businessDate}</span>,
    },
    {
      key: "transmittedOn",
      header: "Transmitted On",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.transmittedOn}</span>,
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
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.validatedDrops)}</span>,
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
    {
      key: "pickupOn",
      header: "Pickup On",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.pickupOn || "—"}</span>,
    },
    {
      key: "pickupVerified",
      header: "Pickup Verified",
      className: "whitespace-nowrap",
      accessor: (r) => (
        <Badge
          variant="outline"
          className={
            r.pickupVerified ? VERIFIED_BADGE_CLASSES.verified : VERIFIED_BADGE_CLASSES.pending
          }
        >
          {r.pickupVerified ? "Verified" : "Pending"}
        </Badge>
      ),
    },
    {
      key: "pickupVerifiedOn",
      header: "Pickup Verified On",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.pickupVerifiedOn || "—"}</span>,
    },
    {
      key: "mdTotal",
      header: "MD Total",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="font-medium tabular-nums">{formatCurrency(r.mdTotal)}</span>
      ),
    },
    {
      key: "manualRemovals",
      header: "Manual Removals",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.manualRemovals)}</span>,
    },
    {
      key: "manualTransfers",
      header: "Manual Transfers",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.manualTransfers)}</span>,
    },
    {
      key: "tubeVend",
      header: "Tube Vend",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.tubeVend)}</span>,
    },
    {
      key: "tubeLoad",
      header: "Tube Load",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.tubeLoad)}</span>,
    },
    {
      key: "dispense",
      header: "Dispense",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="font-medium tabular-nums">{formatCurrency(r.dispense)}</span>
      ),
    },
    {
      key: "cashDispense",
      header: "Cash Dispense",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.cashDispense)}</span>,
    },
    {
      key: "coinDispense",
      header: "Coin Dispense",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.coinDispense)}</span>,
    },
    {
      key: "reconDate",
      header: "Recon Date",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.reconDate}</span>,
    },
  ];

  const handleExport = () => {
    const exportRows = filteredRows.map((row) => ({
      ...row,
      pickupOn: row.pickupOn ?? "",
      pickupVerified: row.pickupVerified ? "Yes" : "No",
      pickupVerifiedOn: row.pickupVerifiedOn ?? "",
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
              Safe transmission, pickup verification, and dispense reconciliation records
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
          placeholder="Search store, bank, customer, location, safe, serial..."
          className="h-9 min-w-[220px] flex-[2]"
        />
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
        <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Pickup Verified" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pickups</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && <FilterReset onReset={resetFilters} />}
      </Card>

      <Card className="p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading Loomis report...</p>
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
