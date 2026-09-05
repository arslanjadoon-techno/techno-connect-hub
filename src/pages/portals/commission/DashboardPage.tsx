import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Users,
  Wallet,
  Loader2,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { commissionService, type CommissionDashboardData } from "@/services/commission";
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
import { toast } from "sonner";

const MONTH_OPTIONS = [
  { value: "1", label: "January (01)" },
  { value: "2", label: "February (02)" },
  { value: "3", label: "March (03)" },
  { value: "4", label: "April (04)" },
  { value: "5", label: "May (05)" },
  { value: "6", label: "June (06)" },
  { value: "7", label: "July (07)" },
  { value: "8", label: "August (08)" },
  { value: "9", label: "September (09)" },
  { value: "10", label: "October (10)" },
  { value: "11", label: "November (11)" },
  { value: "12", label: "December (12)" },
];

const YEAR_OPTIONS = ["2026", "2025", "2024", "2023"];

const PIE_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
];

function formatMarketName(name?: string | null): string {
  if (!name || name === "null" || name.toLowerCase() === "null") {
    return "Other / Unassigned";
  }
  return name;
}

function formatCurrencyCompact(val: number): string {
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(2)}M`;
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(0)}k`;
  }
  return `$${val.toLocaleString()}`;
}

function formatNumberCompact(val: number): string {
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1)}M`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(0)}k`;
  }
  return val.toLocaleString();
}

export default function CommissionDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CommissionDashboardData | null>(null);

  // Filter params (defaults to August 2026, 8 trend months matching backend API)
  const [selectedMonth, setSelectedMonth] = useState<string>("8");
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const monthNum = parseInt(selectedMonth, 10) || 8;
      const yearNum = parseInt(selectedYear, 10) || 2026;

      const result = await commissionService.getDashboard({
        month: monthNum,
        year: yearNum,
        trendMonths: monthNum,
      });

      setData(result);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to load commission dashboard metrics";
      console.error("Commission dashboard fetch error:", err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Transform Commission Trend for AreaChart
  const trendData = useMemo(() => {
    if (!data?.charts?.commissionTrend) return [];
    const labels = data.charts.commissionTrend.labels || [];
    const series = data.charts.commissionTrend.series?.[0]?.data || [];

    return labels.map((label, idx) => ({
      month: label,
      commission: series[idx] ?? 0,
    }));
  }, [data]);

  // Transform Top 5 Markets for PieChart & List
  const topMarketsData = useMemo(() => {
    if (!data?.charts?.top5Markets?.data) return [];
    return data.charts.top5Markets.data.map((item) => ({
      name: formatMarketName(item.market),
      rawName: item.market,
      percentage: item.percentage,
      amount: item.amount,
      value: item.amount,
    }));
  }, [data]);

  // Transform Monthly Sales Boxes for BarChart
  const monthlyBoxesData = useMemo(() => {
    if (!data?.charts?.monthlySalesBoxes) return [];
    const labels = data.charts.monthlySalesBoxes.labels || [];
    const series = data.charts.monthlySalesBoxes.series?.[0]?.data || [];

    return labels.map((label, idx) => ({
      month: label,
      boxes: series[idx] ?? 0,
    }));
  }, [data]);

  // Summary KPIs configuration
  const summaryCards = data?.summaryCards;

  const KPIS = [
    {
      id: "active-users-kpi",
      label: "Active Users",
      value: loading
        ? "—"
        : summaryCards?.activeUsers !== undefined
          ? summaryCards.activeUsers.toLocaleString()
          : "0",
      subtext: "Employees active in current cycle",
      icon: Users,
      accent: "from-sky-500/20 to-sky-500/5",
      iconFg: "text-sky-600 dark:text-sky-400",
      badgeText: "Real-time",
      badgeVariant: "outline" as const,
    },
    {
      id: "total-commission-mtd-kpi",
      label: "Total Commission (MTD)",
      value: loading
        ? "$ —"
        : summaryCards?.totalCommissionMtd?.formatted ||
          `$${(summaryCards?.totalCommissionMtd?.amount || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      subtext: `Month-to-date ${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label.split(" ")[0] || "August"} payout`,
      icon: DollarSign,
      accent: "from-emerald-500/20 to-emerald-500/5",
      iconFg: "text-emerald-600 dark:text-emerald-400",
      badgeText: summaryCards?.totalCommissionMtd?.currency || "USD",
      badgeVariant: "secondary" as const,
    },
    {
      id: "total-boxes-kpi",
      label: "Total Boxes",
      value: loading
        ? "—"
        : summaryCards?.totalBoxes !== undefined
          ? summaryCards.totalBoxes.toLocaleString()
          : "0",
      subtext: "Units sold across all markets",
      icon: Wallet,
      accent: "from-amber-500/20 to-amber-500/5",
      iconFg: "text-amber-600 dark:text-amber-400",
      badgeText: "Volume",
      badgeVariant: "outline" as const,
    },
    {
      id: "boxes-commission-kpi",
      label: "Boxes Commission",
      value: loading
        ? "$ —"
        : summaryCards?.boxesCommission?.formatted ||
          `$${(summaryCards?.boxesCommission?.amount || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      subtext: "Commission earned on box sales",
      icon: TrendingUp,
      accent: "from-violet-500/20 to-violet-500/5",
      iconFg: "text-violet-600 dark:text-violet-400",
      badgeText: summaryCards?.boxesCommission?.currency || "USD",
      badgeVariant: "secondary" as const,
    },
  ];

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    color: "var(--foreground)",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  } as const;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Commission Dashboard
            </h1>
            <Badge
              variant="outline"
              className="hidden sm:inline-flex bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1 py-0.5"
            >
              <CheckCircle2 className="h-3 w-3" />
              Live API
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Executive performance analytics, payout trends, and market share distributions.
          </p>
        </div>

        {/* Filter Controls: Month, Year, Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Month Selector */}
          <div className="w-[145px]">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selector */}
          <div className="w-[100px]">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchDashboard();
              toast.info("Refreshing commission metrics...");
            }}
            disabled={loading}
            className="h-9 px-3 text-xs gap-1.5"
            title="Reload metrics from GetDashboard API"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <Card className="border-destructive/40 bg-destructive/10 text-destructive p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              <div className="text-xs">
                <span className="font-semibold">Failed to load dashboard metrics: </span>
                <span>{error}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboard}
              className="h-7 text-xs border-destructive/30 hover:bg-destructive/20"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* 🌟 Row 1: 4 Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <Card
            key={k.id}
            id={k.id}
            className="relative overflow-hidden p-5 transition-all duration-200 hover:shadow-md border-border/80"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${k.accent}`} />
            <div className="relative flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </span>
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {k.value}
                </div>
                <p className="text-[11px] text-muted-foreground">{k.subtext}</p>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 shadow-xs border border-border/40 backdrop-blur-xs ${k.iconFg}`}
              >
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 🌟 Row 2: Commission Trend Area Chart + Top 5 Markets Pie Chart */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Commission Trend Area Chart (2 Cols on lg) */}
        <Card className="p-5 lg:col-span-2 border-border/80 shadow-xs">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-base sm:text-lg font-bold text-foreground">
                  Commission Trend
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 text-muted-foreground">
                  {data?.charts?.commissionTrend?.description || "Total commission over time"}
                </CardDescription>
              </div>
              {trendData.length > 0 && (
                <Badge variant="outline" className="text-[11px] font-medium">
                  {trendData.length} Months Tracked
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="h-[290px] w-full pt-2">
              {loading ? (
                <ChartSkeleton />
              ) : trendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No trend data available for this cycle.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatCurrencyCompact}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: unknown) => [
                        `$${Number(v).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`,
                        "Commission",
                      ]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="commission"
                      name="Commission"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#commGrad)"
                      dot={{ r: 3, fill: "var(--primary)" }}
                      activeDot={{ r: 5, fill: "var(--primary)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Markets Distribution */}
        <Card className="p-5 border-border/80 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="p-0 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-base sm:text-lg font-bold text-foreground">
                    Top 5 Markets
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5 text-muted-foreground">
                    {data?.charts?.top5Markets?.description || "Commission share by market"}
                  </CardDescription>
                </div>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="h-[180px] w-full">
                {loading ? (
                  <ChartSkeleton />
                ) : topMarketsData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No market share data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topMarketsData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={46}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {topMarketsData.map((_, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                            stroke="var(--card)"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(
                          v: unknown,
                          _name: unknown,
                          item: { payload?: { percentage?: number } },
                        ) => [
                          `$${Number(v).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} (${item?.payload?.percentage || 0}%)`,
                          "Share",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Markets Breakdown List */}
              <div className="mt-2 space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {topMarketsData.map((item, idx) => (
                  <div
                    key={item.rawName + idx}
                    className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/40 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="font-medium text-foreground truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground text-[11px]">
                        $
                        {Number(item.amount).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4.5 font-semibold"
                      >
                        {item.percentage}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </div>
        </Card>
      </div>

      {/* 🌟 Row 3: Monthly Sales (Boxes) Bar Chart */}
      <Card className="p-5 border-border/80 shadow-xs">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-base sm:text-lg font-bold text-foreground">
                Monthly Sales (Boxes)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 text-muted-foreground">
                {data?.charts?.monthlySalesBoxes?.description || "Total boxes sold per month"}
              </CardDescription>
            </div>
            {monthlyBoxesData.length > 0 && (
              <Badge variant="outline" className="text-[11px] font-medium">
                Volume Analysis
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="h-[280px] w-full pt-2">
            {loading ? (
              <ChartSkeleton />
            ) : monthlyBoxesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No monthly sales box data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyBoxesData}
                  margin={{ left: 10, right: 10, top: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatNumberCompact}
                  />
                  <Tooltip
                    cursor={{ fill: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
                    contentStyle={tooltipStyle}
                    formatter={(v: unknown) => [
                      `${Number(v).toLocaleString()} boxes`,
                      "Boxes Sold",
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar
                    dataKey="boxes"
                    name="Boxes Sold"
                    fill="var(--primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg bg-muted/30">
      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading live chart data...</span>
      </div>
    </div>
  );
}
