import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/data-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type SortDir = "asc" | "desc" | null;

// New API Response Data Types
interface Row {
  ntid: string;
  day: number;
  month: number;
  year: number;
  market: string;
  employee_Name: string;
  commission: number;
  total_Box: number;
  box_Commission: number;
  acc_Sales: number;
  activation_Retention_Commission: number;
  vaS_Commission: number;
  hsI_Commission: number;
  contest: number;
  hsi: number;
  write_Ups_Chargebacks: number;
  final_Commission_After_Deduction: number;
  eligible?: any;
  // MRC object structure mapped dynamically from flat keys
  _5_MRC: number; _10_MRC: number; _15_MRC: number; _20_MRC: number;
  _24_MRC: number; _25_MRC: number; _26_MRC: number; _30_MRC: number;
  _35_MRC: number; _40_MRC: number; _45_MRC: number; _48_MRC: number;
  _50_MRC: number; _55_MRC: number; _60_MRC: number; _65_MRC: number;
  _75_MRC: number;
  // Web Commission mapping
  _40L1WEB_Comm: number;
  l40: number; e40: number; e45: number; e48: number;
  e50: number; e55: number; e60: number; e65: number; e75: number;
}

const MRC_KEYS = ["5", "10", "15", "20", "24", "25", "26", "30", "35", "40", "45", "48", "50", "55", "60", "65", "75"];
const WEB_KEYS: Array<{ k: string; label: string }> = [
  { k: "l40", label: "<40" },
  { k: "e40", label: "40" }, { k: "e45", label: "45" }, { k: "e48", label: "48" }, { k: "e50", label: "50" },
  { k: "e55", label: "55" }, { k: "e60", label: "60" }, { k: "e65", label: "65" }, { k: "e75", label: "75" },
];

function useSortable(rows: Row[]) {
  const [sortKey, setSortKey] = useState<"employee_Name" | "commission" | null>(null);
  const [dir, setDir] = useState<SortDir>(null);

  const cycle = (k: "employee_Name" | "commission") => {
    if (sortKey !== k) { setSortKey(k); setDir("asc"); return; }
    if (dir === "asc") { setDir("desc"); return; }
    if (dir === "desc") { setSortKey(null); setDir(null); return; }
    setDir("asc");
  };

  const sorted = useMemo(() => {
    if (!sortKey || !dir) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av: any = a[sortKey]; const bv: any = b[sortKey];
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

function SortableHeader({ label, onClick, indicator }: { label: string; onClick: () => void; indicator: React.ReactNode }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 font-semibold hover:text-primary">
      {label} {indicator}
    </button>
  );
}

export default function CommissionPage() {

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [market, setMarket] = useState<string>("all");

  const [userRole, setUserRole] = useState<string>("user");

  useEffect(() => {
    const fetchCommissionData = async () => {
      try {
        setLoading(true);

        const userString = localStorage.getItem("user");
        if (!userString) return;

        const user = JSON.parse(userString);

        const commissionPortal = user?.portalAccess?.find((p: any) => p.portalName === "commission");
        const role = commissionPortal ? commissionPortal.roleName : "user";

        setUserRole(role);

        const otpValue = "123456";

        let url = "";

        if (role === "user") {
          // const ntidValue = user?.email ? user.email.split("@")[0].toUpperCase() : "not-found";
          const ntidValue = "SPC44739";
          url = `https://idwhjd4bj2.execute-api.us-west-2.amazonaws.com/Prod/GetEmployeeCommission?NTID=${encodeURIComponent(ntidValue)}&OTP=${otpValue}`;
        }
        else if (role === "admin") {
          url = `https://idwhjd4bj2.execute-api.us-west-2.amazonaws.com/Prod/GetAllEmployeeCommissionMarketWise?OTP=${otpValue}`;
        }
        else {
          let baseParams = `https://idwhjd4bj2.execute-api.us-west-2.amazonaws.com/Prod/GetAllEmployeeCommissionMarketWise?OTP=${otpValue}`;

          if (role === "stateManager") {
            const stateName = user?.states?.[0]?.name || "not-found";
            url = `${baseParams}&state=${encodeURIComponent(stateName)}`;
          } else if (role === "marketManager") {
            const marketName = user?.markets?.[0]?.name || "not-found";
            url = `${baseParams}&market=${encodeURIComponent(marketName)}`;
          } else if (role === "districtManager") {
            const districtName = user?.districts?.[0]?.name || "not-found";
            url = `${baseParams}&district=${encodeURIComponent(districtName)}`;
          }
        }

        if (!url) return;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setRows(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching commission data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommissionData();
  }, []);

  const markets = useMemo(() => Array.from(new Set(rows.map(r => r.market))), [rows]);
  const filtered = useMemo(() => market === "all" ? rows : rows.filter(r => r.market === market), [market, rows]);

  const summary = useSortable(filtered);
  const detail = useSortable(filtered);

  const summaryCols: Column<Row>[] = [
    { key: "ntid", header: "NTID", accessor: r => r.ntid, searchValue: r => r.ntid },
    { key: "market", header: "MARKET", accessor: r => r.market },
    { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => summary.cycle("employee_Name")} indicator={summary.indicator("employee_Name")} /> as any, accessor: r => r.employee_Name, searchValue: r => r.employee_Name },
    { key: "date", header: "DATE", accessor: r => `${r.year}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}` },
    { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => summary.cycle("commission")} indicator={summary.indicator("commission")} /> as any, accessor: r => `$${r.commission.toFixed(2)}` },
    { key: "box", header: "BOX COMM.", accessor: r => `$${r.box_Commission.toFixed(2)}` },
    { key: "acc", header: "ACC COMM.", accessor: r => `$${r.acc_Sales.toFixed(2)}` },
    { key: "act", header: "ACT. RETENTION", accessor: r => `$${r.activation_Retention_Commission.toFixed(2)}` },
    { key: "vas", header: "VAS COMM.", accessor: r => `$${r.vaS_Commission.toFixed(2)}` },
    { key: "hsi", header: "HSI COMM.", accessor: r => `$${r.hsI_Commission.toFixed(2)}` },
    { key: "contest", header: "CONTEST", accessor: r => `$${r.contest.toFixed(2)}` },
  ];

  const detailCols: Column<Row>[] = [
    { key: "ntid", header: "NTID", accessor: r => r.ntid, searchValue: r => r.ntid },
    { key: "market", header: "MARKET", accessor: r => r.market },
    { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => detail.cycle("employee_Name")} indicator={detail.indicator("employee_Name")} /> as any, accessor: r => r.employee_Name, searchValue: r => r.employee_Name },
    { key: "date", header: "DATE", accessor: r => `${r.year}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}` },
    { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => detail.cycle("commission")} indicator={detail.indicator("commission")} /> as any, accessor: r => `$${r.commission.toFixed(2)}` },
    { key: "totBox", header: "TOTAL BOX", accessor: r => r.total_Box ?? 0 },
    { key: "boxC", header: "BOX COMM.", accessor: r => `$${r.box_Commission.toFixed(2)}` },
    { key: "accS", header: "ACC SALES", accessor: r => r.acc_Sales ?? 0 },
    { key: "accC", header: "ACC COMM.", accessor: r => `$${r.acc_Sales.toFixed(2)}` },
    { key: "act", header: "ACT. RETENTION (BRIDGE)", accessor: r => `$${r.activation_Retention_Commission.toFixed(2)}` },
    { key: "vas", header: "VAS COMM.", accessor: r => `$${r.vaS_Commission.toFixed(2)}` },
    ...MRC_KEYS.map(k => ({
      key: `mrc${k}`, header: `${k} MRC`,
      accessor: (r: Row) => (r as any)[`_${k}_MRC`] ?? 0,
    })),
    ...WEB_KEYS.map(w => ({
      key: `web${w.k}`, header: `${w.label}${w.k === "l40" ? " L1WEB Comm." : ""}`,
      accessor: (r: Row) => (r as any)[w.k] ?? 0,
    })),
    { key: "hsi", header: "HSI", accessor: r => r.hsi ?? 0 },
    { key: "hsiC", header: "HSI COMM.", accessor: r => `$${r.hsI_Commission.toFixed(2)}` },
    { key: "wuc", header: "WRITE-UPS CHARGEBACKS", accessor: r => `$${r.write_Ups_Chargebacks ?? 0}` },
    { key: "contest", header: "CONTEST", accessor: r => `$${r.contest.toFixed(2)}` },
    { key: "final", header: "FINAL COMM. AFTER DEDUCTION", accessor: r => `$${(r.final_Commission_After_Deduction ?? r.commission).toFixed(2)}` },
  ];

  if (loading) {
    return <div className="p-5 text-center text-sm text-muted-foreground animate-pulse">Loading commission dataset...</div>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold">Commission</h1>
        <p className="text-sm text-muted-foreground">View commission breakdowns per market and employee.</p>
      </div>

      {/* Only visible whose role is not 'user' */}
      {userRole !== "user" && (
        <div className="flex items-end gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground mb-1">Market</span>
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Filter by market" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                {markets.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Overview</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-4">
          <Card className="p-4">
            <DataTable<Row>
              rows={summary.sorted}
              columns={summaryCols}
              rowKey={(r) => `${r.ntid}-${r.year}-${r.month}-${r.day}`}
              searchPlaceholder="Search commission records..."
            />
          </Card>
        </TabsContent>
        <TabsContent value="detailed" className="mt-4">
          <Card className="p-4">
            <DataTable<Row>
              rows={detail.sorted}
              columns={detailCols}
              rowKey={(r) => `${r.ntid}-${r.year}-${r.month}-${r.day}`}
              searchPlaceholder="Search commission records..."
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}