import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useData } from "@/lib/data-store";
import { visibleTickets, isAdmin } from "@/lib/permissions";
import { STATUS_META, type TicketStatus, ALL_DEPARTMENTS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import {
  TicketCheck, Store as StoreIcon, MapPin, Building2, Network, UserCog,
  Wrench, Clock, CheckCircle2, PauseCircle, AlertCircle, RotateCw, Archive,
} from "lucide-react";

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

  const depCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of ALL_DEPARTMENTS) m[d] = 0;
    for (const t of myTickets) m[t.department] = (m[t.department] ?? 0) + 1;
    return m;
  }, [myTickets]);

  const admin = isAdmin(user);

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

      {admin && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tickets by department
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {ALL_DEPARTMENTS.map((d) => (
              <Card key={d} className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wrench className="h-4 w-4" />
                  {d}
                </div>
                <div className="mt-2 font-display text-2xl font-semibold">
                  {depCounts[d] ?? 0}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
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
