import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  MapPin,
  Calendar,
  Award,
  Star,
  CheckCircle2,
  TrendingUp,
  Flame,
  ArrowRight,
} from "lucide-react";
import wallOfFameBanner from "@/assets/images/wall_of_fame_banner_1788807945812.jpg";

export interface MonthlyChampion {
  id: string;
  year: number;
  month: string;
  monthNumber: number;
  championTitle: string; // e.g. "April 2026 Champion"
  name: string;
  market: string;
  photo: string;
  score: number; // e.g. 124.5
  totalBoxes: number;
  highlight: string;
  awardCategory: string;
  tenure: string;
}

const CHAMPIONS_DATABASE: Record<number, MonthlyChampion[]> = {
  2026: [
    {
      id: "2026-04",
      year: 2026,
      month: "April",
      monthNumber: 4,
      championTitle: "April 2026 Champion",
      name: "Salim Thanawala",
      market: "Arizona - Phoenix",
      photo:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
      score: 124.8,
      totalBoxes: 1540,
      highlight: "All-Time Highest Market Volume & 148% Accessories Payout",
      awardCategory: "President's Grand Laureate",
      tenure: "5 Years",
    },
    {
      id: "2026-03",
      year: 2026,
      month: "March",
      monthNumber: 3,
      championTitle: "March 2026 Champion",
      name: "Sarah Connor",
      market: "California - Los Angeles",
      photo:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
      score: 119.2,
      totalBoxes: 1395,
      highlight: "Perfect 100% CSI Customer Rating & 132% Voice Lines",
      awardCategory: "Grand Sales Vanguard",
      tenure: "3 Years",
    },
    {
      id: "2026-02",
      year: 2026,
      month: "February",
      monthNumber: 2,
      championTitle: "February 2026 Champion",
      name: "Marcus Vance",
      market: "Texas - Dallas",
      photo:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
      score: 115.6,
      totalBoxes: 1280,
      highlight: "Record Upgrades Pacing & Regional Sales MVP",
      awardCategory: "Pinnacle Achiever",
      tenure: "4 Years",
    },
    {
      id: "2026-01",
      year: 2026,
      month: "January",
      monthNumber: 1,
      championTitle: "January 2026 Champion",
      name: "Elena Rodriguez",
      market: "Florida - Miami",
      photo:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=80",
      score: 112.4,
      totalBoxes: 1190,
      highlight: "Unstoppable New Year Sprint & 98% Retention Rate",
      awardCategory: "Elite Pacesetter",
      tenure: "2 Years",
    },
    {
      id: "2026-05",
      year: 2026,
      month: "May",
      monthNumber: 5,
      championTitle: "May 2026 Champion",
      name: "David Kim",
      market: "Washington - Seattle",
      photo:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80",
      score: 116.0,
      totalBoxes: 1310,
      highlight: "Northwest Regional Leader & Peak Conversion Benchmark",
      awardCategory: "Executive Vanguard",
      tenure: "3.5 Years",
    },
    {
      id: "2026-06",
      year: 2026,
      month: "June",
      monthNumber: 6,
      championTitle: "June 2026 Champion",
      name: "Rachel Adams",
      market: "Colorado - Denver",
      photo:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
      score: 117.3,
      totalBoxes: 1345,
      highlight: "Mountain Market Record High & 140% MIM Efficiency",
      awardCategory: "Grand Sales Vanguard",
      tenure: "4 Years",
    },
  ],
  2025: [
    {
      id: "2025-12",
      year: 2025,
      month: "December",
      monthNumber: 12,
      championTitle: "December 2025 Champion",
      name: "Salim Thanawala",
      market: "Arizona - Phoenix",
      photo:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
      score: 122.4,
      totalBoxes: 1480,
      highlight: "Holiday Sales Grandmaster & Record Boxes",
      awardCategory: "Annual MVP",
      tenure: "4 Years",
    },
    {
      id: "2025-11",
      year: 2025,
      month: "November",
      monthNumber: 11,
      championTitle: "November 2025 Champion",
      name: "Sarah Connor",
      market: "California - Los Angeles",
      photo:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
      score: 118.0,
      totalBoxes: 1350,
      highlight: "Black Friday Sales Pioneer & Top Accessories",
      awardCategory: "President's Star",
      tenure: "2.5 Years",
    },
    {
      id: "2025-10",
      year: 2025,
      month: "October",
      monthNumber: 10,
      championTitle: "October 2025 Champion",
      name: "Marcus Vance",
      market: "Texas - Houston",
      photo:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
      score: 114.7,
      totalBoxes: 1260,
      highlight: "Southwest Territory Dominance & High Retention",
      awardCategory: "Executive Laureate",
      tenure: "3 Years",
    },
  ],
  2024: [
    {
      id: "2024-12",
      year: 2024,
      month: "December",
      monthNumber: 12,
      championTitle: "December 2024 Champion",
      name: "Elena Rodriguez",
      market: "Florida - Miami",
      photo:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=80",
      score: 120.1,
      totalBoxes: 1410,
      highlight: "Southeast Regional Champion of the Year",
      awardCategory: "Hall of Fame Inductee",
      tenure: "1.5 Years",
    },
    {
      id: "2024-11",
      year: 2024,
      month: "November",
      monthNumber: 11,
      championTitle: "November 2024 Champion",
      name: "Salim Thanawala",
      market: "Arizona - Phoenix",
      photo:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
      score: 117.5,
      totalBoxes: 1330,
      highlight: "Desert Region Top Sales Record",
      awardCategory: "Master Achiever",
      tenure: "3 Years",
    },
    {
      id: "2024-10",
      year: 2024,
      month: "October",
      monthNumber: 10,
      championTitle: "October 2024 Champion",
      name: "Sarah Connor",
      market: "California - San Diego",
      photo:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80",
      score: 115.0,
      totalBoxes: 1290,
      highlight: "Pacific Coast Grand Laureate",
      awardCategory: "Executive Star",
      tenure: "2 Years",
    },
  ],
  2023: [
    {
      id: "2023-12",
      year: 2023,
      month: "December",
      monthNumber: 12,
      championTitle: "December 2023 Champion",
      name: "Salim Thanawala",
      market: "Arizona - Phoenix",
      photo:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
      score: 121.0,
      totalBoxes: 1400,
      highlight: "Founding Hall of Fame Champion",
      awardCategory: "Grand Founder",
      tenure: "2 Years",
    },
    {
      id: "2023-11",
      year: 2023,
      month: "November",
      monthNumber: 11,
      championTitle: "November 2023 Champion",
      name: "Marcus Vance",
      market: "Texas - Dallas",
      photo:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
      score: 116.2,
      totalBoxes: 1310,
      highlight: "Lone Star Record High Volume",
      awardCategory: "Star Achiever",
      tenure: "1 Year",
    },
    {
      id: "2023-10",
      year: 2023,
      month: "October",
      monthNumber: 10,
      championTitle: "October 2023 Champion",
      name: "David Kim",
      market: "Washington - Seattle",
      photo:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80",
      score: 113.8,
      totalBoxes: 1240,
      highlight: "Pacific Northwest Top Pioneer",
      awardCategory: "Pacesetter",
      tenure: "1 Year",
    },
  ],
};

const YEAR_OPTIONS = ["2026", "2025", "2024", "2023"];

export default function WallOfFamePage() {
  // By default current year (2026) is selected
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  const yearChampions = useMemo(() => {
    const yr = parseInt(selectedYear, 10) || 2026;
    return CHAMPIONS_DATABASE[yr] || [];
  }, [selectedYear]);

  // The 3 primary large frames spotlighting top monthly champions of the year
  const primaryThreeChampions = useMemo(() => {
    return yearChampions.slice(0, 3);
  }, [yearChampions]);

  // Any additional monthly champions of that year
  const otherMonthlyChampions = useMemo(() => {
    return yearChampions.slice(3);
  }, [yearChampions]);

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
      {/* 🌟 1. Top Suitable Hero Banner / Image */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl bg-slate-950 text-white">
        {/* Banner background image */}
        <div className="absolute inset-0">
          <img
            src={wallOfFameBanner}
            alt="Wall of Fame Prestige Banner"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-45 scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Luxury vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60" />
        </div>

        {/* Hero content container */}
        <div className="relative p-6 sm:p-10 md:p-12 z-10 flex flex-col justify-between min-h-[260px] sm:min-h-[300px]">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-3 py-1 gap-1.5 font-bold tracking-widest uppercase shadow-xs"
              >
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                Techno Communications Hall of Fame
              </Badge>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-none">
              Wall of Fame
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-xl">
              Celebrating exceptional sales leadership, record-shattering achievements, and the
              monthly champions who define our culture of uncompromising excellence.
            </p>
          </div>

          {/* Quick Laureate Stats banner row */}
          <div className="pt-6 mt-4 border-t border-white/10 flex items-center gap-6 sm:gap-10 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                  Annual Inductees
                </span>
                <span className="text-base sm:text-lg font-bold text-white">
                  {yearChampions.length} Champions
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                  Peak Score
                </span>
                <span className="text-base sm:text-lg font-bold text-white">124.8% Benchmark</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                  Honor Status
                </span>
                <span className="text-base sm:text-lg font-bold text-white">
                  President's Circle
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 2. Year Filter Bar (Current Year 2026 selected by default) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/80 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-foreground">Select Induction Year</h2>
            <p className="text-xs text-muted-foreground">
              Displaying monthly champions inducted during the {selectedYear} performance cycle
            </p>
          </div>
        </div>

        {/* Year Select & Year Pill Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60">
            {YEAR_OPTIONS.map((yr) => (
              <Button
                key={yr}
                variant={selectedYear === yr ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedYear(yr)}
                className={`h-7 px-3 text-xs font-semibold rounded-md transition-all ${
                  selectedYear === yr
                    ? "shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {yr}
                {yr === "2026" && (
                  <span className="ml-1 text-[9px] px-1 py-0.2 bg-white/20 rounded font-normal">
                    Current
                  </span>
                )}
              </Button>
            ))}
          </div>

          <div className="w-[120px] sm:hidden">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((yr) => (
                  <SelectItem key={yr} value={yr} className="text-xs">
                    Year {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 🌟 3. 3 Bary Sary Frames (Large Prominent Champion Frames) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Featured Monthly Champions ({selectedYear})
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Spotlight Hall of Fame Frames
          </span>
        </div>

        {primaryThreeChampions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border text-muted-foreground text-xs">
            No champions recorded for year {selectedYear}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {primaryThreeChampions.map((champ, index) => (
              <BigChampionFrame key={champ.id} champion={champ} spotlightIndex={index + 1} />
            ))}
          </div>
        )}
      </div>

      {/* 🌟 4. Extended Archive: Other Monthly Champions of the Year */}
      {otherMonthlyChampions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-indigo-500" />
              <h3 className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground">
                All {selectedYear} Monthly Champions
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">Additional Honorees</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherMonthlyChampions.map((champ) => (
              <Card
                key={champ.id}
                className="overflow-hidden border border-border/80 bg-card/80 hover:bg-accent/20 transition-all duration-200 hover:shadow-md"
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={champ.photo}
                      alt={champ.name}
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 rounded-full object-cover border-2 border-amber-400/60 shadow-xs"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-amber-950 p-1 rounded-full shadow">
                      <Trophy className="h-3 w-3" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 py-0 mb-1"
                    >
                      {champ.championTitle}
                    </Badge>
                    <h4 className="text-sm font-bold text-foreground truncate">{champ.name}</h4>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{champ.market}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground block">Score</span>
                    <span className="font-display text-base font-bold text-primary">
                      {champ.score}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 🌟 BigChampionFrame: Grand showcase for user image, market name, monthly champion title
// ---------------------------------------------------------------------------
function BigChampionFrame({
  champion,
  spotlightIndex,
}: {
  champion: MonthlyChampion;
  spotlightIndex: number;
}) {
  const isFirst = spotlightIndex === 1;

  return (
    <Card className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-amber-400/60 dark:border-amber-500/40 shadow-xl shadow-amber-500/5 dark:shadow-amber-950/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:border-amber-500 flex flex-col justify-between bg-card">
      {/* Top accent radiant bar */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

      {/* Subtle glowing backdrop gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />

      <div className="relative p-6 flex flex-col items-center text-center space-y-4">
        {/* Monthly Champion Badge / Ribbon */}
        <div className="w-full flex items-center justify-between">
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-amber-950 border-amber-400 shadow-xs text-xs font-black uppercase tracking-wider py-1 px-3 gap-1.5"
          >
            <Trophy className="h-3.5 w-3.5 fill-amber-950 text-amber-950" />
            {champion.championTitle}
          </Badge>

          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
            Spotlight #{spotlightIndex}
          </span>
        </div>

        {/* User's Large Image with Trophy Laurel Frame */}
        <div className="relative my-2">
          {/* Golden laurel halo border */}
          <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 shadow-xl group-hover:scale-105 transition-transform duration-300">
            <img
              src={champion.photo}
              alt={champion.name}
              referrerPolicy="no-referrer"
              className="h-32 w-32 sm:h-36 sm:w-36 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-inner"
            />
          </div>

          {/* Floating Gold Medal Badge */}
          <div className="absolute -bottom-2 -right-1 bg-gradient-to-br from-amber-500 to-yellow-600 text-amber-950 p-2.5 rounded-full shadow-xl border-2 border-white dark:border-slate-900">
            <Crown className="h-5 w-5 text-amber-950 fill-amber-950" />
          </div>
        </div>

        {/* User Name & Market Name */}
        <div className="space-y-1.5 w-full">
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            {champion.awardCategory}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {champion.name}
          </h3>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="font-semibold text-foreground/80">{champion.market}</span>
          </div>
        </div>

        {/* Score & Volume Highlight Card */}
        <div className="w-full bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-amber-950/40 p-4 rounded-2xl border border-amber-400/40 dark:border-amber-700/50 shadow-xs">
          <div className="flex items-center justify-around divide-x divide-border/60">
            <div className="px-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Overall Score
              </span>
              <span className="font-display text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {champion.score}%
              </span>
            </div>

            <div className="px-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Boxes Sold
              </span>
              <span className="font-display text-2xl sm:text-3xl font-black text-foreground">
                {champion.totalBoxes.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-amber-400/20 text-[11px] text-muted-foreground italic line-clamp-1">
            "{champion.highlight}"
          </div>
        </div>

        {/* Induction detail footer */}
        <div className="w-full flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            Inducted {champion.month} {champion.year}
          </span>
          <span className="font-medium text-foreground">Tenure: {champion.tenure}</span>
        </div>
      </div>
    </Card>
  );
}
