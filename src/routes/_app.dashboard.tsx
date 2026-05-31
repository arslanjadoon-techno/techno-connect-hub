import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { visibleTickets, isAdmin } from "@/lib/permissions";
import { STATUS_META, type TicketStatus, ALL_DEPARTMENTS, PRIORITY_META, type TicketPriority } from "@/lib/types";
import { Card } from "@/components/ui/card";
import {
  TicketCheck, Store as StoreIcon, MapPin, Building2, Network, UserCog,
  Clock, CheckCircle2, PauseCircle, AlertCircle, RotateCw, Archive,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Techno Ticket Portal" }] }),
  component: DashboardPage,
});

const STATUS_ICON: Record<TicketStatus, typeof Clock> = {
  pending: Clock,
  assigned: AlertCircle,
  completed: CheckCircle2,
  hold: PauseCircle,
  closed: Archive,
  reopen: RotateCw,
};

const PIE_COLORS = ["#0d7a5f", "#c9a84c", "#3b6fa0", "#e85d3a", "#9b4423", "#4f46e5"];

function DashboardPage() {
  const { user } = useAuth();
  const { data } = useData();
  if (!user) return null;

  const myTickets = useMemo(() => visibleTickets(user, data.tickets), [user, data.tickets]);

  const counts = useMemo(() => {
    const c: Record<TicketStatus, number> = {
      pending: 0, assigned: 0, completed: 0, hold: 0, closed: 0, reopen: 0,
    };
    for (const t of myTickets) c[t.status]++;
    return c;
  }, [myTickets]);

  const admin = isAdmin(user);

  const statusChart = useMemo(
    () => (Object.keys(STATUS_META) as TicketStatus[]).map((s) => ({
      name: STATUS_META[s].label, value: counts[s],
    })),
    [counts],
  );

  const deptChart = useMemo(
    () => ALL_DEPARTMENTS.map((d) => ({
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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tickets by status
          </h2>
          <Link to="/tickets" className="text-xs font-medium text-primary hover:underline">
            View all tickets →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(STATUS_META) as TicketStatus[]).map((s) => {
            const Icon = STATUS_ICON[s];
            return (
              <Card key={s} className="p-4 transition-shadow hover:shadow-[var(--shadow-elegant)]">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  {STATUS_META[s].label}
                </div>
                <div className="mt-2 font-display text-3xl font-semibold">
                  {counts[s]}
                </div>
              </Card>
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
            <StatCard icon={StoreIcon}   label="Stores"        value={data.stores.length} />
            <StatCard icon={MapPin}      label="States"        value={data.states.length} />
            <StatCard icon={Network}     label="Markets"       value={data.markets.length} />
            <StatCard icon={Building2}   label="Districts"     value={data.districts.length} />
            <StatCard icon={UserCog}     label="Users"         value={data.users.length} />
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
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="created" stroke="#0d7a5f" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tickets by status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
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
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="value" fill="#3b6fa0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tickets by priority">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Pie data={priorityChart} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} paddingAngle={2}>
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-display text-sm font-semibold">{title}</h3>
      {children}
    </Card>
  );
}

function StatCard({
  icon: Icon, label, value,
}: { icon: typeof Clock; label: string; value: number }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      />
    </Card>
  );
}
