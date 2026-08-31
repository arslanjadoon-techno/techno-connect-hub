import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, Wallet, Loader2 } from "lucide-react";
import { commissionService, type CommissionRow } from "@/services/commission";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = CommissionRow;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PIE_COLORS = [
  "var(--primary)",
  "color-mix(in oklab, var(--primary) 70%, white)",
  "color-mix(in oklab, var(--primary) 45%, white)",
  "color-mix(in oklab, var(--primary) 75%, black)",
  "color-mix(in oklab, var(--primary) 30%, white)",
];

function CommissionDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await commissionService.getDashboardMetrics();
        setRows(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Dashboard metrics load karne me error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    const uniqueUsers = new Set(rows.map((r) => r.ntid)).size;
    return rows.reduce(
      (acc, r) => {
        acc.totalCommission += r.commission || 0;
        acc.totalBoxes += r.total_Box || 0;
        acc.boxesCommission += r.box_Commission || 0;
        return acc;
      },
      { activeUsers: uniqueUsers, totalCommission: 0, totalBoxes: 0, boxesCommission: 0 },
    );
  }, [rows]);

  /* Commission trend — grouped by date (day-wise) */
  const trend = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      if (!r.year) return;
      const key = `${r.year}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + (r.commission || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, commission]) => ({
        date: date.slice(5),
        commission: Number(commission.toFixed(2)),
      }));
  }, [rows]);

  /* Top 5 markets by commission */
  const topMarkets = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      if (!r.market) return;
      map.set(r.market, (map.get(r.market) ?? 0) + (r.commission || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [rows]);

  /* Monthly sales (boxes) */
  const monthlyBoxes = useMemo(() => {
    const map = new Map<number, number>();
    rows.forEach((r) => {
      if (!r.month) return;
      map.set(r.month, (map.get(r.month) ?? 0) + (r.total_Box || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, boxes]) => ({ month: MONTHS[m - 1] ?? String(m), boxes }));
  }, [rows]);

  const KPIS = [
    {
      label: "Active Users",
      value: loading ? "—" : stats.activeUsers.toLocaleString(),
      icon: Users,
      accent: "from-sky-500/20 to-sky-500/5",
      iconFg: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Total Commission (MTD)",
      value: loading
        ? "$ —"
        : `$${stats.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      accent: "from-emerald-500/20 to-emerald-500/5",
      iconFg: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Boxes",
      value: loading ? "—" : stats.totalBoxes.toLocaleString(),
      icon: Wallet,
      accent: "from-amber-500/20 to-amber-500/5",
      iconFg: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Boxes Commission",
      value: loading
        ? "$ —"
        : `$${stats.boxesCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      accent: "from-violet-500/20 to-violet-500/5",
      iconFg: "text-violet-600 dark:text-violet-400",
    },
  ];

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "0.6rem",
    color: "var(--foreground)",
    fontSize: 12,
  } as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Commission Portal</h1>
          <p className="text-sm text-muted-foreground">
            Track payouts, agent performance, and commission cycles.
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Syncing Live Metrics...
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <Card key={k.label} className="relative overflow-hidden p-5 transition hover:shadow-lg">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${k.accent}`} />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </div>
                <div className="mt-2 font-display text-3xl font-semibold">{k.value}</div>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 backdrop-blur ${k.iconFg}`}
              >
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Row 2: Commission trend + Top 5 markets */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Commission Trend</h2>
          <p className="mb-4 text-xs text-muted-foreground">Total commission over time</p>
          <div className="h-[280px]">
            {loading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -12, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any) => [`$${Number(v).toLocaleString()}`, "Commission"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#commGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold">Top 5 Markets</h2>
          <p className="mb-4 text-xs text-muted-foreground">Commission share by market</p>
          <div className="h-[280px]">
            {loading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topMarkets}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {topMarkets.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="var(--card)" />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: any) => `$${Number(v).toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Row 3: Monthly sales (boxes) */}
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold">Monthly Sales (Boxes)</h2>
        <p className="mb-4 text-xs text-muted-foreground">Total boxes sold per month</p>
        <div className="h-[300px]">
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBoxes} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="boxes" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg bg-muted/40">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );
}

export default CommissionDashboard;
