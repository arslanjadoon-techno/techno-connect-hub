// import { useMemo, useState } from "react";
// import { Card } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { DataTable, type Column } from "@/components/data-table";
// import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

// type SortDir = "asc" | "desc" | null;

// interface Row {
//   ntid: string;
//   market: string;
//   employeeName: string;
//   date: string;
//   commission: number;
//   totalBox?: number;
//   boxCommission: number;
//   accSales?: number;
//   accCommission: number;
//   activationRetention: number;
//   vasCommission: number;
//   hsiCommission: number;
//   contest: number;
//   hsi?: number;
//   writeUpsChargebacks?: number;
//   finalCommission?: number;
//   mrc?: Record<string, number>;
//   webComm?: Record<string, number>;
// }

// const SAMPLE: Row[] = [
//   {
//     ntid: "NT1001", market: "Dallas", employeeName: "Ali Khan", date: "2026-06-01",
//     commission: 1500, totalBox: 25, boxCommission: 350, accSales: 12, accCommission: 200,
//     activationRetention: 100, vasCommission: 80, hsiCommission: 60, contest: 50,
//     hsi: 5, writeUpsChargebacks: -20, finalCommission: 1480,
//     mrc: { "5": 1, "10": 2, "15": 0, "20": 3, "24": 0, "25": 1, "26": 0, "30": 2, "35": 1, "40": 0, "45": 1, "48": 0, "50": 2, "55": 1, "60": 0, "65": 1, "75": 0 },
//     webComm: { "lt40": 0, "40": 1, "45": 0, "48": 1, "50": 2, "55": 0, "60": 1, "65": 0, "75": 1 },
//   },
//   {
//     ntid: "NT1002", market: "Houston", employeeName: "Sara Ahmed", date: "2026-06-02",
//     commission: 1820, totalBox: 30, boxCommission: 420, accSales: 18, accCommission: 320,
//     activationRetention: 140, vasCommission: 110, hsiCommission: 95, contest: 70,
//     hsi: 7, writeUpsChargebacks: -10, finalCommission: 1810,
//     mrc: { "5": 0, "10": 1, "15": 1, "20": 2, "24": 1, "25": 0, "26": 1, "30": 3, "35": 0, "40": 1, "45": 0, "48": 1, "50": 1, "55": 0, "60": 2, "65": 0, "75": 1 },
//     webComm: { "lt40": 1, "40": 0, "45": 1, "48": 0, "50": 1, "55": 1, "60": 0, "65": 1, "75": 0 },
//   },
//   {
//     ntid: "NT1003", market: "Austin", employeeName: "Bilal Hussain", date: "2026-06-03",
//     commission: 1240, totalBox: 18, boxCommission: 260, accSales: 8, accCommission: 150,
//     activationRetention: 80, vasCommission: 60, hsiCommission: 45, contest: 30,
//     hsi: 3, writeUpsChargebacks: 0, finalCommission: 1240,
//     mrc: {}, webComm: {},
//   },
// ];

// const MRC_KEYS = ["5","10","15","20","24","25","26","30","35","40","45","48","50","55","60","65","75"];
// const WEB_KEYS: Array<{ k: string; label: string }> = [
//   { k: "lt40", label: "<40" },
//   { k: "40", label: "40" }, { k: "45", label: "45" }, { k: "48", label: "48" }, { k: "50", label: "50" },
//   { k: "55", label: "55" }, { k: "60", label: "60" }, { k: "65", label: "65" }, { k: "75", label: "75" },
// ];

// function useSortable(rows: Row[]) {
//   const [sortKey, setSortKey] = useState<"employeeName" | "commission" | null>(null);
//   const [dir, setDir] = useState<SortDir>(null);

//   const cycle = (k: "employeeName" | "commission") => {
//     if (sortKey !== k) { setSortKey(k); setDir("asc"); return; }
//     if (dir === "asc") { setDir("desc"); return; }
//     if (dir === "desc") { setSortKey(null); setDir(null); return; }
//     setDir("asc");
//   };

//   const sorted = useMemo(() => {
//     if (!sortKey || !dir) return rows;
//     const copy = [...rows];
//     copy.sort((a, b) => {
//       const av: any = a[sortKey]; const bv: any = b[sortKey];
//       if (av < bv) return dir === "asc" ? -1 : 1;
//       if (av > bv) return dir === "asc" ? 1 : -1;
//       return 0;
//     });
//     return copy;
//   }, [rows, sortKey, dir]);

//   const indicator = (k: "employeeName" | "commission") => {
//     if (sortKey !== k) return <ArrowUpDown className="inline h-3 w-3 opacity-50" />;
//     if (dir === "asc") return <ArrowUp className="inline h-3 w-3" />;
//     if (dir === "desc") return <ArrowDown className="inline h-3 w-3" />;
//     return <ArrowUpDown className="inline h-3 w-3 opacity-50" />;
//   };

//   return { sorted, cycle, indicator };
// }

// function SortableHeader({ label, onClick, indicator }: { label: string; onClick: () => void; indicator: React.ReactNode }) {
//   return (
//     <button onClick={onClick} className="inline-flex items-center gap-1 font-semibold hover:text-primary">
//       {label} {indicator}
//     </button>
//   );
// }

// export default function CommissionPage() {
//   const [market, setMarket] = useState<string>("all");
//   const markets = useMemo(() => Array.from(new Set(SAMPLE.map(r => r.market))), []);
//   const filtered = useMemo(() => market === "all" ? SAMPLE : SAMPLE.filter(r => r.market === market), [market]);

//   const summary = useSortable(filtered);
//   const detail = useSortable(filtered);

//   const summaryCols: Column<Row>[] = [
//     { key: "ntid", header: "NTID", accessor: r => r.ntid, searchValue: r => r.ntid },
//     { key: "market", header: "MARKET", accessor: r => r.market },
//     { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => summary.cycle("employeeName")} indicator={summary.indicator("employeeName")} /> as any, accessor: r => r.employeeName, searchValue: r => r.employeeName },
//     { key: "date", header: "DATE", accessor: r => r.date },
//     { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => summary.cycle("commission")} indicator={summary.indicator("commission")} /> as any, accessor: r => `$${r.commission}` },
//     { key: "box", header: "BOX COMM.", accessor: r => `$${r.boxCommission}` },
//     { key: "acc", header: "ACC COMM.", accessor: r => `$${r.accCommission}` },
//     { key: "act", header: "ACT. RETENTION", accessor: r => `$${r.activationRetention}` },
//     { key: "vas", header: "VAS COMM.", accessor: r => `$${r.vasCommission}` },
//     { key: "hsi", header: "HSI COMM.", accessor: r => `$${r.hsiCommission}` },
//     { key: "contest", header: "CONTEST", accessor: r => `$${r.contest}` },
//   ];

//   const detailCols: Column<Row>[] = [
//     { key: "ntid", header: "NTID", accessor: r => r.ntid, searchValue: r => r.ntid },
//     { key: "market", header: "MARKET", accessor: r => r.market },
//     { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => detail.cycle("employeeName")} indicator={detail.indicator("employeeName")} /> as any, accessor: r => r.employeeName, searchValue: r => r.employeeName },
//     { key: "date", header: "DATE", accessor: r => r.date },
//     { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => detail.cycle("commission")} indicator={detail.indicator("commission")} /> as any, accessor: r => `$${r.commission}` },
//     { key: "totBox", header: "TOTAL BOX", accessor: r => r.totalBox ?? 0 },
//     { key: "boxC", header: "BOX COMM.", accessor: r => `$${r.boxCommission}` },
//     { key: "accS", header: "ACC SALES", accessor: r => r.accSales ?? 0 },
//     { key: "accC", header: "ACC COMM.", accessor: r => `$${r.accCommission}` },
//     { key: "act", header: "ACT. RETENTION (BRIDGE)", accessor: r => `$${r.activationRetention}` },
//     { key: "vas", header: "VAS COMM.", accessor: r => `$${r.vasCommission}` },
//     ...MRC_KEYS.map(k => ({
//       key: `mrc${k}`, header: `${k} MRC`,
//       accessor: (r: Row) => r.mrc?.[k] ?? 0,
//     })),
//     ...WEB_KEYS.map(w => ({
//       key: `web${w.k}`, header: `${w.label}${w.k === "lt40" ? " L1WEB Comm." : ""}`,
//       accessor: (r: Row) => r.webComm?.[w.k] ?? 0,
//     })),
//     { key: "hsi", header: "HSI", accessor: r => r.hsi ?? 0 },
//     { key: "hsiC", header: "HSI COMM.", accessor: r => `$${r.hsiCommission}` },
//     { key: "wuc", header: "WRITE-UPS CHARGEBACKS", accessor: r => `$${r.writeUpsChargebacks ?? 0}` },
//     { key: "contest", header: "CONTEST", accessor: r => `$${r.contest}` },
//     { key: "final", header: "FINAL COMM. AFTER DEDUCTION", accessor: r => `$${r.finalCommission ?? r.commission}` },
//   ];

//   return (
//     <div className="space-y-5 animate-fade-in">
//       <div>
//         <h1 className="font-display text-2xl font-semibold">Commission</h1>
//         <p className="text-sm text-muted-foreground">View commission breakdowns per market and employee.</p>
//       </div>

//       <div className="flex items-end gap-3">
//         <div className="flex flex-col">
//           <span className="text-xs font-medium text-muted-foreground mb-1">Market</span>
//           <Select value={market} onValueChange={setMarket}>
//             <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Filter by market" /></SelectTrigger>
//             <SelectContent>
//               <SelectItem value="all">All Markets</SelectItem>
//               {markets.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>

//       <Tabs defaultValue="summary" className="w-full">
//         <TabsList>
//           <TabsTrigger value="summary">Summary</TabsTrigger>
//           <TabsTrigger value="detailed">Detailed Overview</TabsTrigger>
//         </TabsList>
//         <TabsContent value="summary" className="mt-4">
//           <Card className="p-4">
//             <DataTable<Row>
//               rows={summary.sorted}
//               columns={summaryCols}
//               rowKey={(r) => `${r.ntid}-${r.date}`}
//               searchPlaceholder="Search commission records..."
//             />
//           </Card>
//         </TabsContent>
//         <TabsContent value="detailed" className="mt-4">
//           <Card className="p-4">
//             <DataTable<Row>
//               rows={detail.sorted}
//               columns={detailCols}
//               rowKey={(r) => `${r.ntid}-${r.date}`}
//               searchPlaceholder="Search commission records..."
//             />
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }








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

const MRC_KEYS = ["5","10","15","20","24","25","26","30","35","40","45","48","50","55","60","65","75"];
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

  useEffect(() => {
    const fetchCommissionData = async () => {
      try {
        setLoading(true);
        // Local storage se user map extract kiya
        const userString = localStorage.getItem("user");
        if (!userString) return;
        
        const user = JSON.parse(userString);
        
        // Portal list se 'commission' portal ka role nikala
        const commissionPortal = user?.portalAccess?.find((p: any) => p.portalName === "commission");
        const role = commissionPortal ? commissionPortal.roleName : "user";

        let url = "https://idwhjd4bj2.execute-api.us-west-2.amazonaws.com/Prod/GetAllEmployeeCommissionMarketWise?OTP=";

        if (role === "stateManager") {
          const stateName = user?.states?.[0]?.name || "abcdef";
          url += `?state=${encodeURIComponent(stateName)}`;
        } else if (role === "marketManager") {
          const marketName = user?.markets?.[0]?.name || "arizona";
          url += `?market=${encodeURIComponent(marketName)}`;
        } else if (role === "districtManager") {
          const districtName = user?.districts?.[0]?.name || "abcdef";
          url += `?district=${encodeURIComponent(districtName)}`;
        } else if (role === "user") {
          // NTID lookup based on email mapping prefix or default unique context identifier
          const ntidValue = user?.email ? user.email.split("@")[0].toUpperCase() : "abcdef";
          url += `?NTID=${encodeURIComponent(ntidValue)}`;
        }

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