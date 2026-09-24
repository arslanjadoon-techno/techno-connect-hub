import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Store, Download, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { leasingService, type LeaseRecord } from "@/services/portals/leasing";
import { exportToExcel } from "@/lib/excel-export";

const LEASE_STATUS_OPTIONS = [
  { label: "All status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Expiring soon", value: "expiring" },
  { label: "Inactive", value: "inactive" },
  { label: "Door Closure", value: "doorclosure" },
];

const STATUS_TONE: Record<string, string> = {
  Active:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  "Expiring Soon":
    "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  Expired: "border-destructive/30 bg-destructive/10 text-destructive",
  InActive: "border-border bg-muted text-muted-foreground",
  "Door Closure":
    "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  Unknown: "border-border bg-muted text-muted-foreground",
};

const EXPORT_COLUMNS = [
  "techId",
  "storeName",
  "marketName",
  "securityDeposit",
  "bankInformation",
  "entityName",
  "guarantor",
  "lease_Term",
  "start_Date",
  "expiry_Due",
  "hvac",
  "exclusivity",
  "termination",
  "relocation",
  "isDeleted",
  "optionPeriod",
  "optionPeriodDuration",
  "ownerAccountNumber",
  "ownerRoutingNumber",
  "ownerAccountTitle",
  "ownerPaymentMode",
  "ownerBankName",
  "ownerCheckAddress",
  "landLordName",
  "landLordPointOfContact",
  "landLordContactNumber",
  "landLordEmail",
  "landLordAddress",
  "landLordIndividualOrCompany",
  "tier",
  "assignmentDate",
  "marketManager",
  "leaseSignedBy",
  "noticePeriodBeforeTermination",
  "optionNoticeDate",
  "subLease",
  "takeOverDate",
  "commencementDateRent",
  "guarantyType",
  "rightToTermination",
  "leaseStatus",
  "propertyMgtName",
  "propertyMgtPointOfContact",
  "propertyMgtEmail",
  "propertyMgtPhoneNumber",
  "propertyMgtAddress",
];

function getDaysLeft(d?: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getComputedStatus(days: number | null): string {
  if (days === null) return "Unknown";
  if (days < 0) return "Expired";
  if (days <= 45) return "Expiring Soon";
  return "Active";
}

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

interface Row extends LeaseRecord {
  daysLeft: number | null;
  effectiveStatus: string;
}

export default function ManageLeasingPage() {
  const navigate = useNavigate();
  const [allLeases, setAllLeases] = useState<LeaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("all");
  const [tier, setTier] = useState("all");
  const [status, setStatus] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      setAllLeases(await leasingService.getAllLeasing());
    } catch (error) {
      console.error("Error fetching leasing data:", error);
      toast.error("Failed to load leasing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const rows = useMemo<Row[]>(
    () =>
      allLeases.map((item) => {
        const daysLeft = getDaysLeft(item.expiry_Due || item.createdAt);
        const effectiveStatus = item.leaseStatus || getComputedStatus(daysLeft);
        return { ...item, daysLeft, effectiveStatus };
      }),
    [allLeases],
  );

  const marketOptions = useMemo(
    () => [...new Set(allLeases.map((l) => l.marketName).filter(Boolean) as string[])].sort(),
    [allLeases],
  );
  const tierOptions = useMemo(
    () => [...new Set(allLeases.map((l) => l.tier).filter(Boolean) as string[])].sort(),
    [allLeases],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((item) => {
      if (
        q &&
        !(
          item.storeName?.toLowerCase().includes(q) ||
          item.techId?.toLowerCase().includes(q) ||
          item.landLordContactNumber?.includes(search) ||
          item.landLordEmail?.toLowerCase().includes(q) ||
          item.landLordName?.toLowerCase().includes(q) ||
          item.landLordAddress?.toLowerCase().includes(q) ||
          item.ownerAccountTitle?.toLowerCase().includes(q)
        )
      )
        return false;
      if (market !== "all" && item.marketName !== market) return false;
      if (tier !== "all" && item.tier !== tier) return false;
      if (status === "active" && item.effectiveStatus !== "Active") return false;
      if (status === "expired" && item.effectiveStatus !== "Expired") return false;
      if (status === "expiring" && item.effectiveStatus !== "Expiring Soon") return false;
      if (status === "inactive" && item.effectiveStatus !== "InActive") return false;
      if (status === "doorclosure" && item.effectiveStatus !== "Door Closure") return false;
      return true;
    });
  }, [rows, search, market, tier, status]);

  const columns: Column<Row>[] = [
    {
      key: "store",
      header: "Store",
      accessor: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-medium capitalize">{r.storeName?.toLowerCase() || "—"}</div>
            <div className="text-xs text-muted-foreground">{r.techId || "—"}</div>
          </div>
        </div>
      ),
      searchValue: (r) => r.storeName ?? "",
    },
    { key: "techId", header: "Tech ID", accessor: (r) => r.techId || "—" },
    {
      key: "market",
      header: "Market",
      accessor: (r) => <span className="capitalize">{r.marketName?.toLowerCase() || "—"}</span>,
    },
    {
      key: "tier",
      header: "Tier",
      accessor: (r) =>
        r.tier ? (
          <Badge
            variant="outline"
            className="border-indigo-300 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400"
          >
            {r.tier}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "entity",
      header: "Entity name",
      accessor: (r) => (
        <span className="capitalize text-muted-foreground">
          {r.entityName?.toLowerCase() || "—"}
        </span>
      ),
    },
    {
      key: "leaseType",
      header: "Lease type",
      accessor: (r) => (
        <span className="text-muted-foreground">{r.lease_Term || "Main Lease"}</span>
      ),
    },
    {
      key: "start",
      header: "Start date",
      accessor: (r) => <span className="text-muted-foreground">{fmtDate(r.start_Date)}</span>,
    },
    {
      key: "expiry",
      header: "Expiry date",
      accessor: (r) => <span className="text-muted-foreground">{fmtDate(r.expiry_Due)}</span>,
    },
    {
      key: "days",
      header: "Days left",
      accessor: (r) => (
        <Badge
          variant="outline"
          className={
            STATUS_TONE[
              r.daysLeft === null
                ? "Unknown"
                : r.daysLeft < 0
                  ? "Expired"
                  : r.daysLeft <= 30
                    ? "Expiring Soon"
                    : "Active"
            ]
          }
        >
          {r.daysLeft === null ? "—" : `${r.daysLeft}d`}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (r) => (
        <Badge variant="outline" className={STATUS_TONE[r.effectiveStatus] ?? STATUS_TONE.Unknown}>
          {r.effectiveStatus}
        </Badge>
      ),
    },
  ];

  const handleExport = () => {
    const exportData = filtered.map((item) => ({
      ...item,
      daysLeft: item.daysLeft ?? "",
      leaseStatus: item.effectiveStatus,
    }));
    exportToExcel(
      exportData as unknown as Record<string, unknown>[],
      EXPORT_COLUMNS,
      {},
      {
        sheetName: "Leasing Information",
        fileName: "Leasing_Information_Sheet",
      },
    );
  };

  const handleRefresh = () => {
    setSearch("");
    setMarket("all");
    setTier("all");
    setStatus("all");
    fetchData();
  };

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">Manage Leases</h1>
            <p className="text-sm text-muted-foreground">
              View, filter and manage all store lease records
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="h-9 min-w-[220px] flex-[2]"
        />
        <Select value={market} onValueChange={setMarket}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Market" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All markets</SelectItem>
            {marketOptions.map((m) => (
              <SelectItem key={m} value={m}>
                {m.toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            {tierOptions.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Lease status" />
          </SelectTrigger>
          <SelectContent>
            {LEASE_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading leases...</p>
          </div>
        ) : (
          <DataTable<Row>
            rows={filtered}
            columns={columns}
            rowKey={(r) => r.techId}
            onRowClick={(r) => {
              navigate(`/leasing/leasing-detail/${r.techId}`);
              window.scrollTo(0, 0);
            }}
          />
        )}
      </Card>
    </div>
  );
}
