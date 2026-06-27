import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/data-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type SortDir = "asc" | "desc" | null;

interface Row {
  ntid: string;
  market: string;
  employeeName: string;
  date: string;
  commission: number;
  totalBox?: number;
  boxCommission: number;
  accSales?: number;
  accCommission: number;
  activationRetention: number;
  vasCommission: number;
  hsiCommission: number;
  contest: number;
  hsi?: number;
  writeUpsChargebacks?: number;
  finalCommission?: number;
  mrc?: Record<string, number>;
  webComm?: Record<string, number>;
}

const SAMPLE: Row[] = [
  {
    ntid: "NT1001", market: "Dallas", employeeName: "Ali Khan", date: "2026-06-01",
    commission: 1500, totalBox: 25, boxCommission: 350, accSales: 12, accCommission: 200,
    activationRetention: 100, vasCommission: 80, hsiCommission: 60, contest: 50,
    hsi: 5, writeUpsChargebacks: -20, finalCommission: 1480,
    mrc: { "5": 1, "10": 2, "15": 0, "20": 3, "24": 0, "25": 1, "26": 0, "30": 2, "35": 1, "40": 0, "45": 1, "48": 0, "50": 2, "55": 1, "60": 0, "65": 1, "75": 0 },
    webComm: { "lt40": 0, "40": 1, "45": 0, "48": 1, "50": 2, "55": 0, "60": 1, "65": 0, "75": 1 },
  },
  {
    ntid: "NT1002", market: "Houston", employeeName: "Sara Ahmed", date: "2026-06-02",
    commission: 1820, totalBox: 30, boxCommission: 420, accSales: 18, accCommission: 320,
    activationRetention: 140, vasCommission: 110, hsiCommission: 95, contest: 70,
    hsi: 7, writeUpsChargebacks: -10, finalCommission: 1810,
    mrc: { "5": 0, "10": 1, "15": 1, "20": 2, "24": 1, "25": 0, "26": 1, "30": 3, "35": 0, "40": 1, "45": 0, "48": 1, "50": 1, "55": 0, "60": 2, "65": 0, "75": 1 },
    webComm: { "lt40": 1, "40": 0, "45": 1, "48": 0, "50": 1, "55": 1, "60": 0, "65": 1, "75": 0 },
  },
  {
    ntid: "NT1003", market: "Austin", employeeName: "Bilal Hussain", date: "2026-06-03",
    commission: 1240, totalBox: 18, boxCommission: 260, accSales: 8, accCommission: 150,
    activationRetention: 80, vasCommission: 60, hsiCommission: 45, contest: 30,
    hsi: 3, writeUpsChargebacks: 0, finalCommission: 1240,
    mrc: {}, webComm: {},
  },
];

const MRC_KEYS = ["5","10","15","20","24","25","26","30","35","40","45","48","50","55","60","65","75"];
const WEB_KEYS: Array<{ k: string; label: string }> = [
  { k: "lt40", label: "<40" },
  { k: "40", label: "40" }, { k: "45", label: "45" }, { k: "48", label: "48" }, { k: "50", label: "50" },
  { k: "55", label: "55" }, { k: "60", label: "60" }, { k: "65", label: "65" }, { k: "75", label: "75" },
];

function useSortable(rows: Row[]) {
  const [sortKey, setSortKey] = useState<"employeeName" | "commission" | null>(null);
  const [dir, setDir] = useState<SortDir>(null);

  const cycle = (k: "employeeName" | "commission") => {
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

  const indicator = (k: "employeeName" | "commission") => {
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
  const [market, setMarket] = useState<string>("all");
  const markets = useMemo(() => Array.from(new Set(SAMPLE.map(r => r.market))), []);
  const filtered = useMemo(() => market === "all" ? SAMPLE : SAMPLE.filter(r => r.market === market), [market]);

  const summary = useSortable(filtered);
  const detail = useSortable(filtered);

  const summaryCols: Column<Row>[] = [
    { key: "ntid", header: "NTID", accessor: r => r.ntid, searchValue: r => r.ntid },
    { key: "market", header: "MARKET", accessor: r => r.market },
    { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => summary.cycle("employeeName")} indicator={summary.indicator("employeeName")} /> as any, accessor: r => r.employeeName, searchValue: r => r.employeeName },
    { key: "date", header: "DATE", accessor: r => r.date },
    { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => summary.cycle("commission")} indicator={summary.indicator("commission")} /> as any, accessor: r => `$${r.commission}` },
    { key: "box", header: "BOX COMM.", accessor: r => `$${r.boxCommission}` },
    { key: "acc", header: "ACC COMM.", accessor: r => `$${r.accCommission}` },
    { key: "act", header: "ACT. RETENTION", accessor: r => `$${r.activationRetention}` },
    { key: "vas", header: "VAS COMM.", accessor: r => `$${r.vasCommission}` },
    { key: "hsi", header: "HSI COMM.", accessor: r => `$${r.hsiCommission}` },
    { key: "contest", header: "CONTEST", accessor: r => `$${r.contest}` },
  ];

  const detailCols: Column<Row>[] = [
    { key: "ntid", header: "NTID", accessor: r => r.ntid, searchValue: r => r.ntid },
    { key: "market", header: "MARKET", accessor: r => r.market },
    { key: "name", header: <SortableHeader label="EMPLOYEE NAME" onClick={() => detail.cycle("employeeName")} indicator={detail.indicator("employeeName")} /> as any, accessor: r => r.employeeName, searchValue: r => r.employeeName },
    { key: "date", header: "DATE", accessor: r => r.date },
    { key: "comm", header: <SortableHeader label="COMMISSION" onClick={() => detail.cycle("commission")} indicator={detail.indicator("commission")} /> as any, accessor: r => `$${r.commission}` },
    { key: "totBox", header: "TOTAL BOX", accessor: r => r.totalBox ?? 0 },
    { key: "boxC", header: "BOX COMM.", accessor: r => `$${r.boxCommission}` },
    { key: "accS", header: "ACC SALES", accessor: r => r.accSales ?? 0 },
    { key: "accC", header: "ACC COMM.", accessor: r => `$${r.accCommission}` },
    { key: "act", header: "ACT. RETENTION (BRIDGE)", accessor: r => `$${r.activationRetention}` },
    { key: "vas", header: "VAS COMM.", accessor: r => `$${r.vasCommission}` },
    ...MRC_KEYS.map(k => ({
      key: `mrc${k}`, header: `${k} MRC`,
      accessor: (r: Row) => r.mrc?.[k] ?? 0,
    })),
    ...WEB_KEYS.map(w => ({
      key: `web${w.k}`, header: `${w.label}${w.k === "lt40" ? " L1WEB Comm." : ""}`,
      accessor: (r: Row) => r.webComm?.[w.k] ?? 0,
    })),
    { key: "hsi", header: "HSI", accessor: r => r.hsi ?? 0 },
    { key: "hsiC", header: "HSI COMM.", accessor: r => `$${r.hsiCommission}` },
    { key: "wuc", header: "WRITE-UPS CHARGEBACKS", accessor: r => `$${r.writeUpsChargebacks ?? 0}` },
    { key: "contest", header: "CONTEST", accessor: r => `$${r.contest}` },
    { key: "final", header: "FINAL COMM. AFTER DEDUCTION", accessor: r => `$${r.finalCommission ?? r.commission}` },
  ];

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
              rowKey={(r) => `${r.ntid}-${r.date}`}
              searchPlaceholder="Search commission records..."
            />
          </Card>
        </TabsContent>
        <TabsContent value="detailed" className="mt-4">
          <Card className="p-4">
            <DataTable<Row>
              rows={detail.sorted}
              columns={detailCols}
              rowKey={(r) => `${r.ntid}-${r.date}`}
              searchPlaceholder="Search commission records..."
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
