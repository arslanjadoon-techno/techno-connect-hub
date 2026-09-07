import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Zap,
  Flame,
  ShieldCheck,
  Target,
  BarChart3,
  Layers,
  Database,
} from "lucide-react";
import { ConfettiBackground } from "@/components/confetti-background";

interface CategoryItem {
  id: string;
  letter: string;
  name: string;
  code: string;
  fullName: string;
  weight: number;
  formula: string;
  notes: string;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  circleBg: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: "accessories",
    letter: "A",
    name: "Accessories",
    code: "ACCESSORIES",
    fullName: "Accessories",
    weight: 25,
    formula: "Actual / Target",
    notes: "Highest weight — biggest impact",
    colorHex: "#ef4444",
    badgeBg: "bg-red-500/10 dark:bg-red-950/40 border-red-500/30",
    badgeText: "text-red-600 dark:text-red-400",
    dotColor: "bg-red-500",
    circleBg: "bg-red-500 text-white",
  },
  {
    id: "voice",
    letter: "B",
    name: "Voice Activations",
    code: "VOICE",
    fullName: "Voice Activations",
    weight: 20,
    formula: "Actual / Target",
    notes: "Also drives Upgrades target",
    colorHex: "#3b82f6",
    badgeBg: "bg-blue-500/10 dark:bg-blue-950/40 border-blue-500/30",
    badgeText: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
    circleBg: "bg-blue-500 text-white",
  },
  {
    id: "hsi",
    letter: "C",
    name: "HSI",
    code: "HSI",
    fullName: "HSI",
    weight: 15,
    formula: "Actual / Target",
    notes: "High-speed internet activations",
    colorHex: "#10b981",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30",
    badgeText: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    circleBg: "bg-emerald-500 text-white",
  },
  {
    id: "mim",
    letter: "D",
    name: "Migrations",
    code: "MIM",
    fullName: "Migrations",
    weight: 10,
    formula: "Actual / Target",
    notes: "Magenta in Metro migrations",
    colorHex: "#a855f7",
    badgeBg: "bg-purple-500/10 dark:bg-purple-950/40 border-purple-500/30",
    badgeText: "text-purple-600 dark:text-purple-400",
    dotColor: "bg-purple-500",
    circleBg: "bg-purple-500 text-white",
  },
  {
    id: "upgrades",
    letter: "E",
    name: "Upgrades",
    code: "UPGRADES",
    fullName: "Upgrades",
    weight: 10,
    formula: "Actual / (Voice Target × 20%)",
    notes: "Special target rule applies",
    colorHex: "#eab308",
    badgeBg: "bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30",
    badgeText: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
    circleBg: "bg-amber-500 text-white",
  },
  {
    id: "bts",
    letter: "F",
    name: "BTS",
    code: "BTS",
    fullName: "BTS",
    weight: 10,
    formula: "Actual / Target",
    notes: "Business solutions performance",
    colorHex: "#ec4899",
    badgeBg: "bg-pink-500/10 dark:bg-pink-950/40 border-pink-500/30",
    badgeText: "text-pink-600 dark:text-pink-400",
    dotColor: "bg-pink-500",
    circleBg: "bg-pink-500 text-white",
  },
  {
    id: "retention",
    letter: "G",
    name: "95-Day Activation Retention",
    code: "RETENTION",
    fullName: "95-Day Activation Retention",
    weight: 10,
    formula: "95-Day Retention %",
    notes: "Newest category",
    colorHex: "#06b6d4",
    badgeBg: "bg-cyan-500/10 dark:bg-cyan-950/40 border-cyan-500/30",
    badgeText: "text-cyan-600 dark:text-cyan-400",
    dotColor: "bg-cyan-500",
    circleBg: "bg-cyan-500 text-white",
  },
];

export default function CriteriaDetailsPage() {
  return (
    <ConfettiBackground>
      <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in relative z-10">
        {/* Header: Exact Match to Screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
                    CRITERIA DETAILS
                  </h1>
                  <Zap className="h-5 w-5 text-sky-400 fill-sky-400" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  The 7 performance categories and their weights
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-lg border border-border/60 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Weightage Model 2026
            </span>
          </div>
        </div>

        {/* Top 3 Distinctly Colored Cards (User explicitly requested 3 cards with different colors) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Amber / Yellow - Categories & Weightage */}
          <Card className="relative overflow-hidden rounded-2xl border-2 border-amber-400/60 dark:border-amber-500/50 bg-card/95 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.01]">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Categories & Target
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-4xl sm:text-5xl font-black text-amber-500">
                      7
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Categories
                    </span>
                  </div>
                </div>
                <div className="text-right border-l border-amber-400/30 pl-4 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Total
                  </span>
                  <div className="font-display text-3xl sm:text-4xl font-black text-amber-500">
                    100%
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Comprehensive 100% Performance Allocation
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Sky Blue / Cyan - Data Source (DCS) */}
          <Card className="relative overflow-hidden rounded-2xl border-2 border-sky-400/60 dark:border-sky-500/50 bg-card/95 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.01]">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                    Data Source
                  </span>
                  <div className="font-display text-4xl sm:text-5xl font-black text-sky-500">
                    DCS
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                  <Database className="h-6 w-6 text-sky-500" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Commissionable Data Feed (Real-Time Validated)
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Emerald Green - Status (Active) */}
          <Card className="relative overflow-hidden rounded-2xl border-2 border-emerald-400/60 dark:border-emerald-500/50 bg-card/95 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.01]">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-green-500" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Criteria Status
                  </span>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-8 w-8 text-emerald-500" />
                    <span className="font-display text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                >
                  Live System
                </Badge>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Enforced Across All Markets & Categories
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 1: WEIGHTAGE DISTRIBUTION (Matching image) */}
        <Card className="rounded-2xl border-2 border-border/70 bg-card/95 backdrop-blur-md shadow-xl overflow-hidden">
          <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              <h2 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight text-foreground flex items-center gap-1.5">
                WEIGHTAGE DISTRIBUTION
                <Flame className="h-4 w-4 text-amber-500 fill-amber-500 inline" />
              </h2>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-5">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.colorHex }}
                    />
                    <span className="font-bold text-foreground">{cat.code}</span>
                    <span className="text-muted-foreground">— {cat.fullName}</span>
                  </div>
                  <span className="font-display font-extrabold text-amber-500 dark:text-amber-400 text-sm sm:text-base">
                    {cat.weight}%
                  </span>
                </div>

                {/* Progress Bar Container: Dark Blue/Navy Track Matching Screenshot */}
                <div className="w-full bg-slate-200 dark:bg-slate-900/90 h-3 rounded-full overflow-hidden p-0.5 border border-border/40">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-slate-900 dark:bg-slate-100"
                    style={{
                      width: `${cat.weight * 3.5}%`,
                      maxWidth: "100%",
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SECTION 2: THE 7 PERFORMANCE CATEGORIES TABLE (Matching image) */}
        <Card className="rounded-2xl border-2 border-border/70 bg-card/95 backdrop-blur-md shadow-xl overflow-hidden">
          <CardHeader className="p-5 sm:p-6 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-sky-500" />
              <h2 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight text-foreground">
                THE 7 PERFORMANCE CATEGORIES
              </h2>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 sm:px-6 w-16">#</th>
                  <th className="py-3 px-4 sm:px-6">Category</th>
                  <th className="py-3 px-4 sm:px-6">Weight</th>
                  <th className="py-3 px-4 sm:px-6">Formula</th>
                  <th className="py-3 px-4 sm:px-6">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {CATEGORIES.map((cat) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-accent/30 transition-colors duration-150"
                  >
                    {/* Column 1: Circular Letter Indicator */}
                    <td className="py-4 px-4 sm:px-6">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${cat.circleBg}`}
                      >
                        {cat.letter}
                      </div>
                    </td>

                    {/* Column 2: Category Name & Sub-code */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-bold text-foreground text-sm sm:text-base">
                        {cat.name}
                      </div>
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {cat.code}
                      </div>
                    </td>

                    {/* Column 3: Weight Pill */}
                    <td className="py-4 px-4 sm:px-6">
                      <Badge
                        variant="outline"
                        className={`font-black text-xs px-2.5 py-0.5 ${cat.badgeBg} ${cat.badgeText}`}
                      >
                        {cat.weight}%
                      </Badge>
                    </td>

                    {/* Column 4: Formula */}
                    <td className="py-4 px-4 sm:px-6 font-mono text-xs text-foreground/90 font-medium">
                      {cat.formula}
                    </td>

                    {/* Column 5: Notes */}
                    <td className="py-4 px-4 sm:px-6 text-xs text-muted-foreground font-medium">
                      {cat.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </ConfettiBackground>
  );
}
