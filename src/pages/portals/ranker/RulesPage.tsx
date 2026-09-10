import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, Trophy, Zap, Info, BookOpen, CheckCircle2 } from "lucide-react";
import { ConfettiBackground } from "@/components/confetti-background";

export default function RulesPage() {
  return (
    <ConfettiBackground>
      <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Ranker Portal Rules
              </h1>
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs gap-1 py-0.5"
              >
                <BookOpen className="h-3 w-3" />
                Official Guidelines
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Official governance and participation policies for Market Managers and regional
              standings.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-lg border border-border/60 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Standard Operating Policy 2026
            </span>
          </div>
        </div>

        {/* Top Notice Banner: Matches Image Exactly */}
        <div className="rounded-2xl border-2 border-amber-400/40 bg-card/95 backdrop-blur-md p-5 sm:p-6 shadow-md flex items-center gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
          </div>
          <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
            Rules are designed to ensure a level playing field for all Market Managers. Performance
            is tracked meticulously to celebrate genuine growth and excellence.
          </p>
        </div>

        {/* 3 Main Rules Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* RULE 1: COMMISSIONABLE DATA ONLY (DCS) */}
          <Card className="relative overflow-hidden rounded-2xl border-2 border-amber-400/50 dark:border-amber-500/40 bg-card/95 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-500" />

            <div>
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-6 w-6 text-amber-500" />
                  </div>
                  <h2 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight text-amber-600 dark:text-amber-400 leading-snug">
                    COMMISSIONABLE DATA ONLY (DCS)
                  </h2>
                </div>
              </CardHeader>

              <CardContent className="p-6 pt-2 space-y-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-1" />
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                    All activation performance will be measured using DCS (commissionable data).
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-1" />
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                    Only commissionable activations will count toward rankings.
                  </p>
                </div>
              </CardContent>
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/20 text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-between">
              <span>Policy Rule #1</span>
              <span>DCS Validated</span>
            </div>
          </Card>

          {/* RULE 2: NEW MARKET PARTICIPATION */}
          <Card className="relative overflow-hidden rounded-2xl border-2 border-sky-400/50 dark:border-sky-500/40 bg-card/95 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-sky-400 to-cyan-500" />

            <div>
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6 text-sky-500" />
                  </div>
                  <h2 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight text-foreground leading-snug">
                    NEW MARKET PARTICIPATION
                  </h2>
                </div>
              </CardHeader>

              <CardContent className="p-6 pt-2 space-y-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-sky-500 shrink-0 mt-1" />
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                    Markets operational for less than 6 months can participate in the Stack Ranker.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-sky-500 shrink-0 mt-1" />
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                    However, they will not be eligible for final prizes or recognition (shoutouts)
                    during this period.
                  </p>
                </div>
              </CardContent>
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/20 text-[11px] font-semibold text-sky-600 dark:text-sky-400 flex items-center justify-between">
              <span>Policy Rule #2</span>
              <span>Tenure Rule</span>
            </div>
          </Card>

          {/* RULE 3: ELIGIBILITY FOR NEW MARKETS */}
          <Card className="relative overflow-hidden rounded-2xl border-2 border-yellow-400/50 dark:border-yellow-500/40 bg-card/95 backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-yellow-400 to-amber-500" />

            <div>
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                    <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h2 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-tight text-foreground leading-snug">
                    ELIGIBILITY FOR NEW MARKETS
                  </h2>
                </div>
              </CardHeader>

              <CardContent className="p-6 pt-2 space-y-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-1" />
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                    Newly acquired markets will become fully eligible for prizes and recognition
                    once they:
                  </p>
                </div>

                <div className="flex items-start gap-3 pl-4">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-1" />
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                    Complete 6 months of operation.
                  </p>
                </div>

                <div className="flex items-start gap-3 pl-4">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-1" />
                  <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
                    Complete the retention exception period.
                  </p>
                </div>
              </CardContent>
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/20 text-[11px] font-semibold text-yellow-600 dark:text-yellow-400 flex items-center justify-between">
              <span>Policy Rule #3</span>
              <span>Prize Eligibility</span>
            </div>
          </Card>
        </div>
      </div>
    </ConfettiBackground>
  );
}
