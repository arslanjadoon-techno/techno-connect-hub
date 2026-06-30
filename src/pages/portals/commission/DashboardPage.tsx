import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, Wallet, Loader2 } from "lucide-react";

function CommissionDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalCommission: 0,
    totalBoxes: 0,
    boxesCommission: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "https://idwhjd4bj2.execute-api.us-west-2.amazonaws.com/Prod/GetAllEmployeeCommissionMarketWise?OTP=123456"
        );

        if (response.ok) {
          const data = await response.json();

          if (Array.isArray(data)) {
            // 1. Unique NTIDs count karne ke liye Set banaya
            const uniqueUsers = new Set(data.map((item: any) => item.ntid)).size;

            // 2. Loop chala kar values ka total calculation nikala
            const totals = data.reduce(
              (acc: any, curr: any) => {
                acc.commission += curr.commission || 0;
                acc.totalBoxes += curr.total_Box || 0;
                acc.boxCommission += curr.box_Commission || 0;
                return acc;
              },
              { commission: 0, totalBoxes: 0, boxCommission: 0 }
            );

            // 3. State update kar di
            setStats({
              activeUsers: uniqueUsers,
              totalCommission: totals.commission,
              totalBoxes: totals.totalBoxes,
              boxesCommission: totals.boxCommission,
            });
          }
        }
      } catch (error) {
        console.error("Dashboard metrics load karne me error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // KPIs Structure with Dynamic Values
  const KPIS = [
    { 
      label: "Active Users", 
      value: loading ? "—" : stats.activeUsers.toLocaleString(), 
      icon: Users, 
      accent: "from-sky-500/20 to-sky-500/5", 
      iconFg: "text-sky-600 dark:text-sky-400" 
    },
    { 
      label: "Total Commission (MTD)", 
      value: loading ? "$ —" : `$${stats.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: DollarSign, 
      accent: "from-emerald-500/20 to-emerald-500/5", 
      iconFg: "text-emerald-600 dark:text-emerald-400" 
    },
    { 
      label: "Total Boxes", 
      value: loading ? "—" : stats.totalBoxes.toLocaleString(), 
      icon: Wallet, 
      accent: "from-amber-500/20 to-amber-500/5", 
      iconFg: "text-amber-600 dark:text-amber-400" 
    },
    { 
      label: "Boxes Commission", 
      value: loading ? "$ —" : `$${stats.boxesCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: TrendingUp, 
      accent: "from-violet-500/20 to-violet-500/5", 
      iconFg: "text-violet-600 dark:text-violet-400" 
    },
  ];

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
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-md border">
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

export default CommissionDashboard;