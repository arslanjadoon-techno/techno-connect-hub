// import { useMemo, useState, useEffect } from "react";
// import { Card } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { DataTable, type Column } from "@/components/data-table";
// import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

// type SortDir = "asc" | "desc" | null;

// // New API Response Data Types
// interface Row {
//   ntid: string;
//   day: number;
//   month: number;
//   year: number;
//   market: string;
//   employee_Name: string;
//   commission: number;
//   total_Box: number;
//   box_Commission: number;
//   acc_Sales: number;
//   activation_Retention_Commission: number;
//   vaS_Commission: number;
//   hsI_Commission: number;
//   contest: number;
//   hsi: number;
//   write_Ups_Chargebacks: number;
//   final_Commission_After_Deduction: number;
//   eligible?: any;
//   // MRC object structure mapped dynamically from flat keys
//   _5_MRC: number; _10_MRC: number; _15_MRC: number; _20_MRC: number;
//   _24_MRC: number; _25_MRC: number; _26_MRC: number; _30_MRC: number;
//   _35_MRC: number; _40_MRC: number; _45_MRC: number; _48_MRC: number;
//   _50_MRC: number; _55_MRC: number; _60_MRC: number; _65_MRC: number;
//   _75_MRC: number;
//   // Web Commission mapping
//   _40L1WEB_Comm: number;
//   l40: number; e40: number; e45: number; e48: number;
//   e50: number; e55: number; e60: number; e65: number; e75: number;
// }

// const MRC_KEYS = ["5", "10", "15", "20", "24", "25", "26", "30", "35", "40", "45", "48", "50", "55", "60", "65", "75"];
// const WEB_KEYS: Array<{ k: string; label: string }> = [
//   { k: "l40", label: "<40" },
//   { k: "e40", label: "40" }, { k: "e45", label: "45" }, { k: "e48", label: "48" }, { k: "e50", label: "50" },
//   { k: "e55", label: "55" }, { k: "e60", label: "60" }, { k: "e65", label: "65" }, { k: "e75", label: "75" },
// ];

// function useSortable(rows: Row[]) {
//   const [sortKey, setSortKey] = useState<"employee_Name" | "commission" | null>(null);
//   const [dir, setDir] = useState<SortDir>(null);

//   const cycle = (k: "employee_Name" | "commission") => {
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

//   const indicator = (k: "employee_Name" | "commission") => {
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

//   const [rows, setRows] = useState<Row[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [market, setMarket] = useState<string>("all");

//   const [userRole, setUserRole] = useState<string>("user");

//   useEffect(() => {
//     const fetchCommissionData = async () => {
//       try {
//         setLoading(true);

//         const userString = localStorage.getItem("user");
//         if (!userString) return;

//         const user = JSON.parse(userString);

//         const commissionPortal = user?.portalAccess?.find((p: any) => p.portalName === "commission");
//         const role = commissionPortal ? commissionPortal.roleName : "user";

//         setUserRole(role);

//         const otpValue = "123456";

//         let url = "";

//         if (role === "user") {
//           // const ntidValue = user?.email ? user.email.split("@")[0].toUpperCase() : "not-found";
//           const ntidValue = "SPC44739";
//           url = `https://idwhjd4bj2.execute-api.us-west-2.amazonaws.com/Prod/GetEmployeeCommission?NTID=${encodeURIComponent(ntidValue)}&OTP=${otpValue}`;
//         }
//         else if (role === "admin") {
//           url = `https://idwhjd4bj2.execute-api.us-west-2.amazonaws.com/Prod/GetAllEmployeeCommissionMarketWise?OTP=${otpValue}`;
//         }
//         else {
//           let baseParams = `https://idwhjd4bj2.execute-api.us-west-2.amazonaws.com/Prod/GetAllEmployeeCommissionMarketWise?OTP=${otpValue}`;

//           if (role === "stateManager") {
//             const stateName = user?.states?.[0]?.name || "not-found";
//             url = `${baseParams}&state=${encodeURIComponent(stateName)}`;
//           } else if (role === "marketManager") {
//             const marketName = user?.markets?.[0]?.name || "not-found";
//             url = `${baseParams}&market=${encodeURIComponent(marketName)}`;
//           } else if (role === "districtManager") {
//             const districtName = user?.districts?.[0]?.name || "not-found";
//             url = `${baseParams}&district=${encodeURIComponent(districtName)}`;
//           }
//         }

//         if (!url) return;

//         const response = await fetch(url);
//         if (response.ok) {
//           const data = await response.json();
//           setRows(Array.isArray(data) ? data : []);
//         }
//       } catch (error) {
//         console.error("Error fetching commission data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchCommissionData();
//   }, []);

//   const markets = useMemo(() => Array.from(new Set(rows.map(r => r.market))), [rows]);
//   const filtered = useMemo(() => market === "all" ? rows : rows.filter(r => r.market === market), [market, rows]);

//   const summary = useSortable(filtered);
//   const detail = useSortable(filtered);

//   const summaryCols: Column<Row>[] = [
//     { key: "ntid", header: "NTID", accessor: r => r.ntid ?? "-", searchValue: r => r.ntid },
//     { key: "market", header: "MARKET", accessor: r => r.market ?? "-" },
//     { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => summary.cycle("employee_Name")} indicator={summary.indicator("employee_Name")} /> as any, accessor: r => r.employee_Name ?? "-", searchValue: r => r.employee_Name },
//     { key: "date", header: "DATE", accessor: r => `${r.year ?? 0}-${String(r.month ?? 0).padStart(2, '0')}-${String(r.day ?? 0).padStart(2, '0')}` },
//     { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => summary.cycle("commission")} indicator={summary.indicator("commission")} /> as any, accessor: r => formatCurrency(r.commission) },
//     { key: "box", header: "BOX COMM.", accessor: r => formatCurrency(r.box_Commission) },
//     { key: "acc", header: "ACC COMM.", accessor: r => formatCurrency(r.acc_Sales) },
//     { key: "act", header: "ACT. RETENTION", accessor: r => formatCurrency(r.activation_Retention_Commission) },
//     { key: "vas", header: "VAS COMM.", accessor: r => formatCurrency(r.vaS_Commission) },
//     { key: "hsi", header: "HSI COMM.", accessor: r => formatCurrency(r.hsI_Commission) },
//     { key: "contest", header: "CONTEST", accessor: r => formatCurrency(r.contest) },
//   ];

//   const detailCols: Column<Row>[] = [
//     { key: "ntid", header: "NTID", accessor: r => r.ntid ?? "-", searchValue: r => r.ntid },
//     { key: "market", header: "MARKET", accessor: r => r.market ?? "-" },
//     { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => detail.cycle("employee_Name")} indicator={detail.indicator("employee_Name")} /> as any, accessor: r => r.employee_Name ?? "-", searchValue: r => r.employee_Name },
//     { key: "date", header: "DATE", accessor: r => `${r.year ?? 0}-${String(r.month ?? 0).padStart(2, '0')}-${String(r.day ?? 0).padStart(2, '0')}` },
//     { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => detail.cycle("commission")} indicator={detail.indicator("commission")} /> as any, accessor: r => formatCurrency(r.commission) },
//     { key: "totBox", header: "TOTAL BOX", accessor: r => r.total_Box ?? 0 },
//     { key: "boxC", header: "BOX COMM.", accessor: r => formatCurrency(r.box_Commission) },
//     { key: "accS", header: "ACC SALES", accessor: r => r.acc_Sales ?? 0 },
//     { key: "accC", header: "ACC COMM.", accessor: r => formatCurrency(r.acc_Sales) },
//     { key: "act", header: "ACT. RETENTION (BRIDGE)", accessor: r => formatCurrency(r.activation_Retention_Commission) },
//     { key: "vas", header: "VAS COMM.", accessor: r => formatCurrency(r.vaS_Commission) },
//     ...MRC_KEYS.map(k => ({
//       key: `mrc${k}`, header: `${k} MRC`,
//       accessor: (r: Row) => (r as any)[`_${k}_MRC`] ?? 0,
//     })),
//     ...WEB_KEYS.map(w => ({
//       key: `web${w.k}`, header: `${w.label}${w.k === "l40" ? " L1WEB Comm." : ""}`,
//       accessor: (r: Row) => (r as any)[w.k] ?? 0,
//     })),
//     { key: "hsi", header: "HSI", accessor: r => r.hsi ?? 0 },
//     { key: "hsiC", header: "HSI COMM.", accessor: r => formatCurrency(r.hsI_Commission) },
//     { key: "wuc", header: "WRITE-UPS CHARGEBACKS", accessor: r => formatCurrency(r.write_Ups_Chargebacks) },
//     { key: "contest", header: "CONTEST", accessor: r => formatCurrency(r.contest) },
//     { key: "final", header: "FINAL COMM. AFTER DEDUCTION", accessor: r => formatCurrency(r.final_Commission_After_Deduction ?? r.commission) },
//   ];

//   const formatCurrency = (val: number | null | undefined): string => {
//     return `$${(val ?? 0).toFixed(2)}`;
//   };

//   if (loading) {
//     return <div className="p-5 text-center text-sm text-muted-foreground animate-pulse">Loading commission dataset...</div>;
//   }

//   return (
//     <div className="space-y-5 animate-fade-in">
//       <div>
//         <h1 className="font-display text-2xl font-semibold">Commission</h1>
//         <p className="text-sm text-muted-foreground">View commission breakdowns per market and employee.</p>
//       </div>

//       {/* Only visible whose role is not 'user' */}
//       {userRole !== "user" && (
//         <div className="flex items-end gap-3">
//           <div className="flex flex-col">
//             <span className="text-xs font-medium text-muted-foreground mb-1">Market</span>
//             <Select value={market} onValueChange={setMarket}>
//               <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Filter by market" /></SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Markets</SelectItem>
//                 {markets.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
//               </SelectContent>
//             </Select>
//           </div>
//         </div>
//       )}

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
//               rowKey={(r) => `${r.ntid}-${r.year}-${r.month}-${r.day}`}
//               searchPlaceholder="Search commission records..."
//             />
//           </Card>
//         </TabsContent>
//         <TabsContent value="detailed" className="mt-4">
//           <Card className="p-4">
//             <DataTable<Row>
//               rows={detail.sorted}
//               columns={detailCols}
//               rowKey={(r) => `${r.ntid}-${r.year}-${r.month}-${r.day}`}
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
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/data-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

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

  // Today date by default (YYYY-MM-DD format)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState<string>("");

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

  // Combined filtering: Date, Market and Search Term
  const filtered = useMemo(() => {
    return rows.filter(r => {
      // 1. Date filter check (YYYY-MM-DD match)
      if (selectedDate) {
        const [y, m, d] = selectedDate.split("-").map(Number);
        if (r.year !== y || r.month !== m || r.day !== d) return false;
      }

      // 2. Market filter check
      if (market !== "all" && r.market !== market) return false;

      // 3. Search term check (NTID or Employee Name)
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const ntidMatch = r.ntid?.toLowerCase().includes(query);
        const nameMatch = r.employee_Name?.toLowerCase().includes(query);
        if (!ntidMatch && !nameMatch) return false;
      }

      return true;
    });
  }, [rows, selectedDate, market, searchTerm]);

  const summary = useSortable(filtered);
  const detail = useSortable(filtered);

  const formatCurrency = (val: number | null | undefined): string => {
    return `$${(val ?? 0).toFixed(2)}`;
  };

  const summaryCols: Column<Row>[] = [
    { key: "ntid", header: "NTID", accessor: r => r.ntid ?? "-", searchValue: r => r.ntid },
    { key: "market", header: "MARKET", accessor: r => r.market ?? "-" },
    { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => summary.cycle("employee_Name")} indicator={summary.indicator("employee_Name")} /> as any, accessor: r => r.employee_Name ?? "-", searchValue: r => r.employee_Name },
    { key: "date", header: "DATE", accessor: r => `${r.year ?? 0}-${String(r.month ?? 0).padStart(2, '0')}-${String(r.day ?? 0).padStart(2, '0')}` },
    { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => summary.cycle("commission")} indicator={summary.indicator("commission")} /> as any, accessor: r => formatCurrency(r.commission) },
    { key: "box", header: "BOX COMM.", accessor: r => formatCurrency(r.box_Commission) },
    { key: "acc", header: "ACC COMM.", accessor: r => formatCurrency(r.acc_Sales) },
    { key: "act", header: "ACT. RETENTION", accessor: r => formatCurrency(r.activation_Retention_Commission) },
    { key: "vas", header: "VAS COMM.", accessor: r => formatCurrency(r.vaS_Commission) },
    { key: "hsi", header: "HSI COMM.", accessor: r => formatCurrency(r.hsI_Commission) },
    { key: "contest", header: "CONTEST", accessor: r => formatCurrency(r.contest) },
  ];

  const detailCols: Column<Row>[] = [
    { key: "ntid", header: "NTID", accessor: r => r.ntid ?? "-", searchValue: r => r.ntid },
    { key: "market", header: "MARKET", accessor: r => r.market ?? "-" },
    { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => detail.cycle("employee_Name")} indicator={detail.indicator("employee_Name")} /> as any, accessor: r => r.employee_Name ?? "-", searchValue: r => r.employee_Name },
    { key: "date", header: "DATE", accessor: r => `${r.year ?? 0}-${String(r.month ?? 0).padStart(2, '0')}-${String(r.day ?? 0).padStart(2, '0')}` },
    { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => detail.cycle("commission")} indicator={detail.indicator("commission")} /> as any, accessor: r => formatCurrency(r.commission) },
    { key: "totBox", header: "TOTAL BOX", accessor: r => r.total_Box ?? 0 },
    { key: "boxC", header: "BOX COMM.", accessor: r => formatCurrency(r.box_Commission) },
    { key: "accS", header: "ACC SALES", accessor: r => r.acc_Sales ?? 0 },
    { key: "accC", header: "ACC COMM.", accessor: r => formatCurrency(r.acc_Sales) },
    { key: "act", header: "ACT. RETENTION (BRIDGE)", accessor: r => formatCurrency(r.activation_Retention_Commission) },
    { key: "vas", header: "VAS COMM.", accessor: r => formatCurrency(r.vaS_Commission) },
    ...MRC_KEYS.map(k => ({
      key: `mrc${k}`, header: `${k} MRC`,
      accessor: (r: Row) => (r as any)[`_${k}_MRC`] ?? 0,
    })),
    ...WEB_KEYS.map(w => ({
      key: `web${w.k}`, header: `${w.label}${w.k === "l40" ? " L1WEB Comm." : ""}`,
      accessor: (r: Row) => (r as any)[w.k] ?? 0,
    })),
    { key: "hsi", header: "HSI", accessor: r => r.hsi ?? 0 },
    { key: "hsiC", header: "HSI COMM.", accessor: r => formatCurrency(r.hsI_Commission) },
    { key: "wuc", header: "WRITE-UPS CHARGEBACKS", accessor: r => formatCurrency(r.write_Ups_Chargebacks) },
    { key: "contest", header: "CONTEST", accessor: r => formatCurrency(r.contest) },
    { key: "final", header: "FINAL COMM. AFTER DEDUCTION", accessor: r => formatCurrency(r.final_Commission_After_Deduction ?? r.commission) },
  ];

  if (loading) {
    return <div className="p-5 text-center text-sm text-muted-foreground animate-pulse">Loading commission dataset...</div>;
  }

  return (
    <Tabs defaultValue="summary" className="w-full space-y-5 animate-fade-in">
      {/* Top Line: Title & Subtitle + Tabs placed right after with horizontal gap */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Commission</h1>
          <p className="text-sm text-muted-foreground">View commission breakdowns per market and employee.</p>
        </div>

        {/* Tabs shifted directly after title block */}
        <TabsList className="self-start md:self-center">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Overview</TabsTrigger>
        </TabsList>
      </div>

      {/* Second Line: Date filter, Market filter (if not user), and Search bar on the rightmost side */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground mb-1">Date</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[180px] h-9"
            />
          </div>

          {/* Market Filter (Visible only when userRole is not 'user') */}
          {userRole !== "user" && (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground mb-1">Market</span>
              <Select value={market} onValueChange={setMarket}>
                <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Filter by market" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  {markets.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Search Bar on the Rightmost side */}
        {/* <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Search</span>
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div> */}
      </div>

      <TabsContent value="summary" className="mt-2">
        <Card className="p-4">
          <DataTable<Row>
            rows={summary.sorted}
            columns={summaryCols}
            rowKey={(r) => `${r.ntid}-${r.year}-${r.month}-${r.day}`}
          />
        </Card>
      </TabsContent>
      <TabsContent value="detailed" className="mt-2">
        <Card className="p-4">
          <DataTable<Row>
            rows={detail.sorted}
            columns={detailCols}
            rowKey={(r) => `${r.ntid}-${r.year}-${r.month}-${r.day}`}
          />
        </Card>
      </TabsContent>
    </Tabs>
  );
}