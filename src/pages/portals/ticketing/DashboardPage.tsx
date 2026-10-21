import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { visibleTickets, isAdmin } from "@/lib/permissions";
import {
  ALL_DEPARTMENTS,
  PRIORITY_META,
  STATUS_META,
  type Department,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  TicketCheck,
  Store as StoreIcon,
  MapPin,
  Building2,
  Network,
  UserCog,
  Clock,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
  RotateCw,
  Archive,
  Calendar as CalendarIcon,
  X,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { DateRange } from "react-day-picker";

type CategoryFilter = "all" | "store" | "house";

const STATUS_ICON: Record<TicketStatus, typeof Clock> = {
  pending: Clock,
  assigned: AlertCircle,
  completed: CheckCircle2,
  hold: PauseCircle,
  closed: Archive,
  reopen: RotateCw,
};

/** Per-status accent palette for the dashboard cards with distinct backgrounds. */
const STATUS_CARD: Record<
  TicketStatus,
  {
    bg: string;
    border: string;
    gradient: string;
    iconBg: string;
    iconFg: string;
    ring: string;
    textColor: string;
    countColor: string;
  }
> = {
  pending: {
    bg: "bg-amber-100/90 dark:bg-amber-950/60",
    border: "border-amber-300/80 dark:border-amber-700/70",
    gradient:
      "from-amber-200/70 via-amber-100/40 to-transparent dark:from-amber-500/25 dark:via-amber-500/10",
    iconBg: "bg-amber-500/25 dark:bg-amber-500/35",
    iconFg: "text-amber-800 dark:text-amber-200",
    ring: "hover:ring-amber-500/50",
    textColor: "text-amber-900/90 dark:text-amber-200",
    countColor: "text-amber-950 dark:text-amber-50",
  },
  assigned: {
    bg: "bg-sky-100/90 dark:bg-sky-950/60",
    border: "border-sky-300/80 dark:border-sky-700/70",
    gradient:
      "from-sky-200/70 via-sky-100/40 to-transparent dark:from-sky-500/25 dark:via-sky-500/10",
    iconBg: "bg-sky-500/25 dark:bg-sky-500/35",
    iconFg: "text-sky-800 dark:text-sky-200",
    ring: "hover:ring-sky-500/50",
    textColor: "text-sky-900/90 dark:text-sky-200",
    countColor: "text-sky-950 dark:text-sky-50",
  },
  completed: {
    bg: "bg-emerald-100/90 dark:bg-emerald-950/60",
    border: "border-emerald-300/80 dark:border-emerald-700/70",
    gradient:
      "from-emerald-200/70 via-emerald-100/40 to-transparent dark:from-emerald-500/25 dark:via-emerald-500/10",
    iconBg: "bg-emerald-500/25 dark:bg-emerald-500/35",
    iconFg: "text-emerald-800 dark:text-emerald-200",
    ring: "hover:ring-emerald-500/50",
    textColor: "text-emerald-900/90 dark:text-emerald-200",
    countColor: "text-emerald-950 dark:text-emerald-50",
  },
  hold: {
    bg: "bg-orange-100/90 dark:bg-orange-950/60",
    border: "border-orange-300/80 dark:border-orange-700/70",
    gradient:
      "from-orange-200/70 via-orange-100/40 to-transparent dark:from-orange-500/25 dark:via-orange-500/10",
    iconBg: "bg-orange-500/25 dark:bg-orange-500/35",
    iconFg: "text-orange-800 dark:text-orange-200",
    ring: "hover:ring-orange-500/50",
    textColor: "text-orange-900/90 dark:text-orange-200",
    countColor: "text-orange-950 dark:text-orange-50",
  },
  closed: {
    bg: "bg-purple-100/90 dark:bg-purple-950/60",
    border: "border-purple-300/80 dark:border-purple-700/70",
    gradient:
      "from-purple-200/70 via-purple-100/40 to-transparent dark:from-purple-500/25 dark:via-purple-500/10",
    iconBg: "bg-purple-500/25 dark:bg-purple-500/35",
    iconFg: "text-purple-800 dark:text-purple-200",
    ring: "hover:ring-purple-500/50",
    textColor: "text-purple-900/90 dark:text-purple-200",
    countColor: "text-purple-950 dark:text-purple-50",
  },
  reopen: {
    bg: "bg-rose-100/90 dark:bg-rose-950/60",
    border: "border-rose-300/80 dark:border-rose-700/70",
    gradient:
      "from-rose-200/70 via-rose-100/40 to-transparent dark:from-rose-500/25 dark:via-rose-500/10",
    iconBg: "bg-rose-500/25 dark:bg-rose-500/35",
    iconFg: "text-rose-800 dark:text-rose-200",
    ring: "hover:ring-rose-500/50",
    textColor: "text-rose-900/90 dark:text-rose-200",
    countColor: "text-rose-950 dark:text-rose-50",
  },
};

const PIE_COLORS = ["#0d7a5f", "#c9a84c", "#3b6fa0", "#e85d3a", "#9b4423", "#4f46e5"];

function DashboardPage() {
  const { user } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();

  // --- Top filters ---
  const [department, setDepartment] = useState<Department | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [locationId, setLocationId] = useState<string>("all");

  const baseTickets = useMemo(
    () => (user ? visibleTickets(user, data.tickets) : []),
    [user, data.tickets],
  );

  const myTickets = useMemo(() => {
    const from = dateRange?.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : null;
    const to = dateRange?.to
      ? new Date(dateRange.to).setHours(23, 59, 59, 999)
      : dateRange?.from
        ? new Date(dateRange.from).setHours(23, 59, 59, 999)
        : null;
    return baseTickets.filter((t) => {
      if (department !== "all" && t.department !== department) return false;
      if (category !== "all" && t.category !== category) return false;
      if (locationId !== "all" && t.locationId !== locationId) return false;
      const created = new Date(t.createdAt).getTime();
      if (from !== null && created < from) return false;
      if (to !== null && created > to) return false;
      return true;
    });
  }, [baseTickets, department, category, locationId, dateRange]);

  const counts = useMemo(() => {
    const c: Record<TicketStatus, number> = {
      pending: 0,
      assigned: 0,
      completed: 0,
      hold: 0,
      closed: 0,
      reopen: 0,
    };
    for (const t of myTickets) c[t.status]++;
    return c;
  }, [myTickets]);

  const admin = Boolean(user && isAdmin(user));

  const locationOptions = useMemo(() => {
    if (category === "store") return data.stores.map((s) => ({ value: s.id, label: s.name }));
    if (category === "house") return data.houses.map((h) => ({ value: h.id, label: h.name }));
    return [];
  }, [category, data.stores, data.houses]);

  const statusChart = useMemo(
    () =>
      (Object.keys(STATUS_META) as TicketStatus[]).map((s) => ({
        name: STATUS_META[s].label,
        value: counts[s],
      })),
    [counts],
  );

  const deptChart = useMemo(
    () =>
      ALL_DEPARTMENTS.map((d) => ({
        name: d,
        value: myTickets.filter((t) => t.department === d).length,
      })),
    [myTickets],
  );

  const priorityChart = useMemo(() => {
    const prios: TicketPriority[] = ["low", "medium", "high", "urgent"];
    return prios.map((p) => ({
      name: PRIORITY_META[p].label,
      value: myTickets.filter((t) => t.priority === p).length,
    }));
  }, [myTickets]);

  const trendChart = useMemo(() => {
    const days = 14;
    const buckets: { date: string; created: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        created: 0,
      });
    }
    for (const t of myTickets) {
      const dt = new Date(t.createdAt);
      dt.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - dt.getTime()) / 86400000);
      if (diff >= 0 && diff < days) buckets[days - 1 - diff].created += 1;
    }
    return buckets;
  }, [myTickets]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Welcome back, {user.firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's what's happening in your workspace today.
        </p>
      </header>

      {/* Top filters */}
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <span className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Filters
        </span>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <FilterSelect
          value={department}
          onChange={(v) => setDepartment(v as typeof department)}
          placeholder="Department"
          options={[
            { value: "all", label: "All departments" },
            ...ALL_DEPARTMENTS.map((d) => ({ value: d, label: d })),
          ]}
        />
        <FilterSelect
          value={category}
          onChange={(v) => {
            setCategory(v as CategoryFilter);
            setLocationId("all");
          }}
          placeholder="Category"
          options={[
            { value: "all", label: "All categories" },
            { value: "store", label: "Store" },
            { value: "house", label: "House / Office" },
          ]}
        />
        <FilterSelect
          value={locationId}
          onChange={setLocationId}
          placeholder={category === "store" ? "Store" : category === "house" ? "House" : "Location"}
          options={[
            {
              value: "all",
              label: category === "all" ? "Select category first" : `All ${category}s`,
            },
            ...locationOptions,
          ]}
          disabled={category === "all"}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={
            department === "all" &&
            !dateRange &&
            category === "all" &&
            locationId === "all"
          }
          onClick={() => {
            setDateRange(undefined);
            setDepartment("all");
            setCategory("all");
            setLocationId("all");
          }}
          className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-dashed border-muted-foreground/30 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-all duration-300 ease-out group active:scale-95"
        >
          <XCircle className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70 group-hover:text-destructive group-hover:rotate-90 transition-transform duration-300 ease-in-out" />
          Clear Filters
        </Button>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tickets by status
          </h2>
          <button
            onClick={() => navigate("/ticketing/tickets?status=all")}
            className="text-xs font-medium text-primary hover:underline"
          >
            View all tickets →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => {
            const Icon = STATUS_ICON[s];
            const palette = STATUS_CARD[s];
            const cardLabel = s === "pending" ? "Created" : STATUS_META[s].label;
            return (
              <button
                key={s}
                onClick={() => navigate(`/ticketing/tickets?status=${s}`)}
                className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:ring-2 ${palette.bg} ${palette.border} ${palette.ring}`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${palette.gradient} opacity-90`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-xs ${palette.iconBg}`}
                    >
                      <Icon className={`h-4 w-4 ${palette.iconFg}`} />
                    </span>
                  </div>
                  <div className={`mt-3 text-xs font-semibold ${palette.textColor}`}>
                    {cardLabel}
                  </div>
                  <div className={`mt-1 font-display text-3xl font-bold tracking-tight ${palette.countColor}`}>
                    {counts[s]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {admin && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Organization overview
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={TicketCheck} label="Total Tickets" value={data.tickets.length} />
            <StatCard icon={UserCog} label="Total Users" value={data.users.length} />
            <StatCard icon={StoreIcon} label="Total Stores" value={data.stores.length} />
            <StatCard icon={MapPin} label="State Managers" value={data.states.length} />
            <StatCard icon={Building2} label="District Managers" value={data.districts.length} />
            <StatCard icon={Network} label="Market Managers" value={data.markets.length} />
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Tickets created (last 14 days)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="created"
                stroke="#0d7a5f"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tickets by status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" fill="#c9a84c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tickets by department">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="value" fill="#3b6fa0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tickets by priority">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Pie
                data={priorityChart}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
              >
                {priorityChart.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 w-[180px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined;
  onChange: (v: DateRange | undefined) => void;
}) {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const label = value?.from
    ? value.to && value.to.getTime() !== value.from.getTime()
      ? `${fmt(value.from)} — ${fmt(value.to)}`
      : fmt(value.from)
    : "All time";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 justify-start gap-2 px-3 font-normal">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{label}</span>
          {value?.from && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  onChange(undefined);
                }
              }}
              className="ml-1 -mr-1 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
              aria-label="Clear date range"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={value}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-display text-sm font-semibold">{title}</h3>
      {children}
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      />
    </Card>
  );
}

export default DashboardPage;
