import { useCallback, useEffect, useMemo, useState } from "react";
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
import { salesReportService, type SalesReportRow } from "@/services/portals/recon";
import { BarChart3, Download, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EXPORT_COLUMNS = [
  "market",
  "customer",
  "company",
  "invDate",
  "tangibleQty",
  "tangibleRev",
  "tangibleCost",
  "tangibleProfit",
  "serialQty",
  "serialRev",
  "serialCost",
  "serialProfit",
  "serviceQty",
  "serviceRev",
  "serviceCost",
  "serviceProfit",
  "paymentQty",
  "paymentRev",
  "paymentCost",
  "paymentProfit",
  "pettyCash",
  "totalTax",
  "totalPpTax",
  "cashPaid",
  "creditPaid",
  "debitPaid",
  "financePaid",
  "otherPaid",
  "totalRevenue",
  "cashSale",
  "cardSale",
];

const EXPORT_HEADER_MAP: Record<string, string> = {
  market: "Market",
  customer: "Customer",
  company: "Company",
  invDate: "Inv Date",
  tangibleQty: "Tangible Qty",
  tangibleRev: "Tangible Rev",
  tangibleCost: "Tangible Cost",
  tangibleProfit: "Tangible Profit",
  serialQty: "Serial Qty",
  serialRev: "Serial Rev",
  serialCost: "Serial Cost",
  serialProfit: "Serial Profit",
  serviceQty: "Service Qty",
  serviceRev: "Service Rev",
  serviceCost: "Service Cost",
  serviceProfit: "Service Profit",
  paymentQty: "Payment Qty",
  paymentRev: "Payment Rev",
  paymentCost: "Payment Cost",
  paymentProfit: "Payment Profit",
  pettyCash: "Petty Cash",
  totalTax: "Total Tax",
  totalPpTax: "Total PP Tax",
  cashPaid: "Cash Paid",
  creditPaid: "Credit Paid",
  debitPaid: "Debit Paid",
  financePaid: "Finance Paid",
  otherPaid: "Other Paid",
  totalRevenue: "Total Revenue",
  cashSale: "Cash Sale",
  cardSale: "Card Sale",
};

const formatCurrency = (value: number): string =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatQuantity = (value: number): string => value.toLocaleString("en-US");

export default function SalesReportPage() {
  const [rows, setRows] = useState<SalesReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  const loadReports = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const data = await salesReportService.getSalesReports();
      setRows(data);
      if (showToast) {
        toast.success("Sales report refreshed.");
      }
    } catch (error) {
      console.error("Failed to load sales report:", error);
      toast.error("Failed to load sales report data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports(false);
  }, [loadReports]);

  const marketOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.market).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rows]);

  const companyOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.company).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (marketFilter !== "all" && row.market !== marketFilter) return false;
      if (companyFilter !== "all" && row.company !== companyFilter) return false;
      if (!q) return true;
      return (
        row.market.toLowerCase().includes(q) ||
        row.customer.toLowerCase().includes(q) ||
        row.company.toLowerCase().includes(q) ||
        row.invDate.toLowerCase().includes(q)
      );
    });
  }, [rows, search, marketFilter, companyFilter]);

  const hasActiveFilters = search !== "" || marketFilter !== "all" || companyFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setMarketFilter("all");
    setCompanyFilter("all");
  };

  const columns: Column<SalesReportRow>[] = [
    {
      key: "market",
      header: "Market",
      className: "whitespace-nowrap",
      accessor: (r) => r.market,
    },
    {
      key: "customer",
      header: "Customer",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="font-medium">{r.customer}</span>,
    },
    {
      key: "company",
      header: "Company",
      className: "whitespace-nowrap",
      accessor: (r) => r.company,
    },
    {
      key: "invDate",
      header: "Inv Date",
      className: "whitespace-nowrap",
      accessor: (r) => <span className="tabular-nums">{r.invDate}</span>,
    },
    {
      key: "tangibleQty",
      header: "Tangible Qty",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatQuantity(r.tangibleQty)}</span>,
    },
    {
      key: "tangibleRev",
      header: "Tangible Rev",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.tangibleRev)}</span>,
    },
    {
      key: "tangibleCost",
      header: "Tangible Cost",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.tangibleCost)}</span>,
    },
    {
      key: "tangibleProfit",
      header: "Tangible Profit",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="font-medium tabular-nums">{formatCurrency(r.tangibleProfit)}</span>
      ),
    },
    {
      key: "serialQty",
      header: "Serial Qty",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatQuantity(r.serialQty)}</span>,
    },
    {
      key: "serialRev",
      header: "Serial Rev",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.serialRev)}</span>,
    },
    {
      key: "serialCost",
      header: "Serial Cost",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.serialCost)}</span>,
    },
    {
      key: "serialProfit",
      header: "Serial Profit",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="font-medium tabular-nums">{formatCurrency(r.serialProfit)}</span>
      ),
    },
    {
      key: "serviceQty",
      header: "Service Qty",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatQuantity(r.serviceQty)}</span>,
    },
    {
      key: "serviceRev",
      header: "Service Rev",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.serviceRev)}</span>,
    },
    {
      key: "serviceCost",
      header: "Service Cost",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.serviceCost)}</span>,
    },
    {
      key: "serviceProfit",
      header: "Service Profit",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="font-medium tabular-nums">{formatCurrency(r.serviceProfit)}</span>
      ),
    },
    {
      key: "paymentQty",
      header: "Payment Qty",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatQuantity(r.paymentQty)}</span>,
    },
    {
      key: "paymentRev",
      header: "Payment Rev",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.paymentRev)}</span>,
    },
    {
      key: "paymentCost",
      header: "Payment Cost",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.paymentCost)}</span>,
    },
    {
      key: "paymentProfit",
      header: "Payment Profit",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="font-medium tabular-nums">{formatCurrency(r.paymentProfit)}</span>
      ),
    },
    {
      key: "pettyCash",
      header: "Petty Cash",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.pettyCash)}</span>,
    },
    {
      key: "totalTax",
      header: "Total Tax",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.totalTax)}</span>,
    },
    {
      key: "totalPpTax",
      header: "Total PP Tax",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.totalPpTax)}</span>,
    },
    {
      key: "cashPaid",
      header: "Cash Paid",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.cashPaid)}</span>,
    },
    {
      key: "creditPaid",
      header: "Credit Paid",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.creditPaid)}</span>,
    },
    {
      key: "debitPaid",
      header: "Debit Paid",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.debitPaid)}</span>,
    },
    {
      key: "financePaid",
      header: "Finance Paid",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.financePaid)}</span>,
    },
    {
      key: "otherPaid",
      header: "Other Paid",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.otherPaid)}</span>,
    },
    {
      key: "totalRevenue",
      header: "Total Revenue",
      className: "whitespace-nowrap text-right",
      accessor: (r) => (
        <span className="font-medium tabular-nums">{formatCurrency(r.totalRevenue)}</span>
      ),
    },
    {
      key: "cashSale",
      header: "Cash Sale",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.cashSale)}</span>,
    },
    {
      key: "cardSale",
      header: "Card Sale",
      className: "whitespace-nowrap text-right",
      accessor: (r) => <span className="tabular-nums">{formatCurrency(r.cardSale)}</span>,
    },
  ];

  const handleExport = () => {
    exportToExcel(
      filteredRows as unknown as Record<string, unknown>[],
      EXPORT_COLUMNS,
      EXPORT_HEADER_MAP,
      {
        sheetName: "Sales Report",
        fileName: "Sales_Report",
      },
    );
  };

  return (
    <div className="w-full space-y-4 animate-fade-in pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">Sales Report</h1>
            <p className="text-sm text-muted-foreground">
              Store sales breakdown across tangible, serial, service, payment, and tender totals
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
          placeholder="Search market, customer, company, invoice date..."
          className="h-9 min-w-[220px] flex-[2]"
        />
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
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="h-9 w-56">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companyOptions.map((company) => (
              <SelectItem key={company} value={company}>
                {company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && <FilterReset onReset={resetFilters} />}
      </Card>

      <Card className="p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading sales report...</p>
          </div>
        ) : (
          <DataTable<SalesReportRow>
            rows={filteredRows}
            columns={columns}
            hideSearch
            stickyHeader
            pageSize={15}
            rowKey={(row) => String(row.id)}
            emptyMessage="No sales report records match the selected filters."
          />
        )}
      </Card>
    </div>
  );
}
