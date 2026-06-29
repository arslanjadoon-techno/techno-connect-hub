import { Card } from "@/components/ui/card";
import {
  Users, MapPin, Layers, CalendarDays, Award, Trophy, Sparkles, Star,
  ArrowRight, Gem,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

// ---------- KPI cards on top ----------
const KPIS = [
  { label: "Total Users",      value: "37",  icon: Users,       tone: "from-sky-500/20 to-sky-500/5",       fg: "text-sky-600 dark:text-sky-400" },
  { label: "Active Markets",   value: "12",  icon: MapPin,      tone: "from-emerald-500/20 to-emerald-500/5", fg: "text-emerald-600 dark:text-emerald-400" },
  { label: "KPI Categories",   value: "7",   icon: Layers,      tone: "from-amber-500/20 to-amber-500/5",   fg: "text-amber-600 dark:text-amber-400" },
  { label: "Upcoming Events",  value: "0",   icon: CalendarDays, tone: "from-violet-500/20 to-violet-500/5", fg: "text-violet-600 dark:text-violet-400" },
];

// ---------- KPI Weights (donut) ----------
const KPI_WEIGHTS = [
  { name: "Accessories", value: 25 },
  { name: "Voice",       value: 20 },
  { name: "HSI",         value: 15 },
  { name: "MIM",         value: 10 },
  { name: "Upgrades",    value: 10 },
  { name: "BTS",         value: 10 },
  { name: "Retention",   value: 10 },
];
const WEIGHT_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#a855f7", "#eab308", "#ec4899", "#06b6d4"];

// ---------- Avg KPI Performance (radar) ----------
const RADAR = [
  { kpi: "Accessories", value: 70 },
  { kpi: "Voice",       value: 50 },
  { kpi: "HSI",         value: 45 },
  { kpi: "MIM",         value: 90 },
  { kpi: "Upgrades",    value: 55 },
  { kpi: "BTS",         value: 40 },
  { kpi: "Retention",   value: 35 },
];

// ---------- Monthly stars ----------
const STARS = [
  { name: "Salim Thanawala",   market: "Dallas - North", rank: 1, tone: "bg-sky-500"   },
  { name: "Hamed Ali Sufi Syed", market: "Phily",         rank: 2, tone: "bg-amber-500" },
  { name: "Prabhakar Sivan",   market: "Oregon",         rank: 3, tone: "bg-zinc-400"  },
];

// ---------- KPI overview (horizontal bars) ----------
const OVERVIEW = [
  { name: "Accessories", value: 25, color: "#ef4444" },
  { name: "Voice",       value: 20, color: "#3b82f6" },
  { name: "HSI",         value: 15, color: "#10b981" },
  { name: "MIM",         value: 10, color: "#a855f7" },
  { name: "Upgrades",    value: 10, color: "#eab308" },
  { name: "BTS",         value: 10, color: "#ec4899" },
  { name: "Retention",   value: 10, color: "#06b6d4" },
];

function SectionCard({
  title, icon: Icon, action, children, className = "",
}: { title: string; icon: any; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`relative overflow-hidden p-5 ${className}`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export default function RankerDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold">Ranker Portal</h1>
        <p className="text-sm text-muted-foreground">
          Live KPI performance, monthly stars, and the yearly champion across all markets.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <Card key={k.label} className="relative overflow-hidden p-5 transition hover:shadow-lg">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${k.tone}`} />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
                <div className="mt-2 font-display text-3xl font-semibold">{k.value}</div>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 backdrop-blur ${k.fg}`}>
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Row 1: Upcoming + KPI Weights */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Upcoming"
          icon={CalendarDays}
          action={
            <button className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              VIEW ALL <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
            <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-950/40">
              <Sparkles className="h-7 w-7 text-amber-500" />
            </div>
            <div className="font-display text-lg font-semibold text-amber-500">COMING SOON…</div>
            <p className="text-xs italic text-muted-foreground">Exciting events are on the way!</p>
            <div className="mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-primary to-primary/30" />
          </div>
        </SectionCard>

        <SectionCard title="KPI Weights" icon={Award}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={KPI_WEIGHTS}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  label={(d) => `${d.name} ${d.value}%`}
                >
                  {KPI_WEIGHTS.map((_, i) => (
                    <Cell key={i} fill={WEIGHT_COLORS[i % WEIGHT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Row 2: Avg KPI Performance + Yearly Champion */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Avg KPI Performance" icon={Sparkles}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR} outerRadius="75%">
                <PolarGrid />
                <PolarAngleAxis dataKey="kpi" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#eab308" fill="#fcd34d" fillOpacity={0.7} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[11px] italic text-muted-foreground">
            Real-time average across all 37 managers
          </p>
        </SectionCard>

        <SectionCard title="Yearly Champion" icon={Trophy} action={<Gem className="h-4 w-4 text-sky-400" />}>
          <div className="flex h-[260px] flex-col items-center justify-center gap-3 text-center">
            <div className="relative">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-white"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                ST
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-sky-400 text-[11px] font-bold text-white shadow">
                #1
              </span>
            </div>
            <div>
              <div className="font-semibold">SALIM THANAWALA</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">DALLAS - NORTH</div>
            </div>
            <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              111.1% Score
            </span>
          </div>
        </SectionCard>
      </div>

      {/* Row 3: Monthly Stars + KPI Overview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Monthly Stars"
          icon={Star}
          action={
            <button className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              VIEW ALL <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          <div className="space-y-2.5">
            {STARS.map((s) => (
              <div key={s.name} className="flex items-center gap-3 rounded-lg border bg-card/60 p-3 transition hover:bg-accent/40">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${s.tone}`}>
                  {s.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.market}</div>
                </div>
                <span className="font-display text-sm font-bold text-amber-500">#{s.rank}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="KPI Overview"
          icon={Award}
          action={
            <button className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
              DETAILS <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={OVERVIEW} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" domain={[0, 30]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: "right", formatter: (v: number) => `${v}%`, fontSize: 11 }}>
                  {OVERVIEW.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
