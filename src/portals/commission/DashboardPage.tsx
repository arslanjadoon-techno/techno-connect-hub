import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, Wallet } from "lucide-react";

({
  head: () => ({ meta: [{ title: "Dashboard — Commission Portal" }] }),
  component: CommissionDashboard,
});

const KPIS = [
  { label: "Total Commission (MTD)", value: "$ —", icon: DollarSign, accent: "from-emerald-500/20 to-emerald-500/5", iconFg: "text-emerald-600 dark:text-emerald-400" },
  { label: "Active Agents", value: "—", icon: Users, accent: "from-sky-500/20 to-sky-500/5", iconFg: "text-sky-600 dark:text-sky-400" },
  { label: "Pending Payouts", value: "$ —", icon: Wallet, accent: "from-amber-500/20 to-amber-500/5", iconFg: "text-amber-600 dark:text-amber-400" },
  { label: "Growth vs Last Month", value: "—", icon: TrendingUp, accent: "from-violet-500/20 to-violet-500/5", iconFg: "text-violet-600 dark:text-violet-400" },
];

function CommissionDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold">Commission Portal</h1>
        <p className="text-sm text-muted-foreground">
          Track payouts, agent performance, and commission cycles. Full module coming soon.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <Card key={k.label} className={`relative overflow-hidden p-5 transition hover:shadow-lg`}>
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${k.accent}`} />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
                <div className="mt-2 font-display text-3xl font-semibold">{k.value}</div>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 backdrop-blur ${k.iconFg}`}>
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-10 text-center">
        <div className="mx-auto max-w-md space-y-2">
          <h2 className="font-display text-lg font-semibold">Commission analytics — coming soon</h2>
          <p className="text-sm text-muted-foreground">
            Detailed reports, agent leaderboards, and payout schedules will appear here once
            the commission service is connected.
          </p>
        </div>
      </Card>
    </div>
  );
}
