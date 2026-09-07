import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  MapPin,
  TrendingUp,
  Percent,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
} from "lucide-react";

export interface StarPerformer {
  id: number;
  rank: number;
  title: string;
  name: string;
  market: string;
  score: number; // e.g. 118 for 118%
  photo: string;
  tier: "platinum" | "gold" | "silver" | "normal";
  salesBoxes: number;
  accessoriesPct: number;
  voicePct: number;
  retentionPct: number;
  ntid: string;
}

const INITIAL_STAR_PERFORMERS: StarPerformer[] = [
  {
    id: 1,
    rank: 1,
    title: "Legendary Performer",
    name: "Salim Thanawala",
    market: "Arizona - Phoenix",
    score: 118.5,
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    tier: "platinum",
    salesBoxes: 1420,
    accessoriesPct: 144,
    voicePct: 128,
    retentionPct: 96,
    ntid: "sthanawala",
  },
  {
    id: 2,
    rank: 2,
    title: "Elite Performer",
    name: "Sarah Connor",
    market: "California - Los Angeles",
    score: 112.0,
    photo:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    tier: "gold",
    salesBoxes: 1285,
    accessoriesPct: 135,
    voicePct: 119,
    retentionPct: 94,
    ntid: "sconnor",
  },
  {
    id: 3,
    rank: 3,
    title: "Premier Performer",
    name: "Marcus Vance",
    market: "Texas - Dallas",
    score: 106.8,
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    tier: "silver",
    salesBoxes: 1140,
    accessoriesPct: 122,
    voicePct: 110,
    retentionPct: 91,
    ntid: "mvance",
  },
  {
    id: 4,
    rank: 4,
    title: "Top Achiever",
    name: "Elena Rodriguez",
    market: "Florida - Miami",
    score: 99.4,
    photo:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
    tier: "normal",
    salesBoxes: 980,
    accessoriesPct: 108,
    voicePct: 98,
    retentionPct: 89,
    ntid: "erodriguez",
  },
  {
    id: 5,
    rank: 5,
    title: "Rising Star",
    name: "David Kim",
    market: "Washington - Seattle",
    score: 95.2,
    photo:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
    tier: "normal",
    salesBoxes: 910,
    accessoriesPct: 104,
    voicePct: 93,
    retentionPct: 86,
    ntid: "dkim",
  },
  {
    id: 6,
    rank: 6,
    title: "Impact Star",
    name: "Rachel Adams",
    market: "Colorado - Denver",
    score: 91.8,
    photo:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    tier: "normal",
    salesBoxes: 865,
    accessoriesPct: 98,
    voicePct: 89,
    retentionPct: 84,
    ntid: "radams",
  },
];

const PERIOD_OPTIONS = [
  { value: "current", label: "August 2026 (Current)" },
  { value: "july-2026", label: "July 2026" },
  { value: "june-2026", label: "June 2026" },
  { value: "q2-2026", label: "Q2 2026 Aggregate" },
  { value: "all-time", label: "Year-To-Date (2026)" },
];

const MARKET_OPTIONS = [
  { value: "all", label: "All Markets" },
  { value: "arizona", label: "Arizona" },
  { value: "california", label: "California" },
  { value: "texas", label: "Texas" },
  { value: "florida", label: "Florida" },
  { value: "washington", label: "Washington" },
  { value: "colorado", label: "Colorado" },
];

export default function StarRankerPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current");
  const [selectedMarket, setSelectedMarket] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredPerformers = useMemo(() => {
    return INITIAL_STAR_PERFORMERS.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.market.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchMarket =
        selectedMarket === "all" || p.market.toLowerCase().includes(selectedMarket.toLowerCase());

      return matchSearch && matchMarket;
    });
  }, [searchQuery, selectedMarket]);

  // Top 3 in large frames
  const topThree = filteredPerformers.filter((p) => p.rank <= 3);

  // Bottom 3 in stacked lines/rows
  const bottomThree = filteredPerformers.filter((p) => p.rank > 3 && p.rank <= 6);

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Star Ranker
            </h1>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 text-xs gap-1 py-0.5"
            >
              <Sparkles className="h-3 w-3" />
              Elite Tier
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Honoring top performers across all markets. Featuring 3 distinguished tier champions and
            key performance leaders.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* Search bar */}
          <div className="relative w-[180px] sm:w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search star performer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 text-xs bg-background"
            />
          </div>

          {/* Period selector */}
          <div className="w-[170px]">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-9 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="text-xs">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Market selector */}
          <div className="w-[140px]">
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger className="h-9 text-xs">
                <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Market" />
              </SelectTrigger>
              <SelectContent>
                {MARKET_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="text-xs">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* SECTION 1: 3 BARI FRAMES (PLATINUM, GOLD, SILVER) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Grand Podium Champions
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">Top 3 Tier Performers</span>
        </div>

        {topThree.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
            No star performers match your current filter selection.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {topThree.map((performer) => (
              <BigStarCard key={performer.id} performer={performer} />
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: 3 OPER NEECHY LINES ME (TOP ACHIEVER, RISING STAR, IMPACT STAR - NORMAL THEME) */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Honor Roll Leaders
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">Performers Ranked #4 to #6</span>
        </div>

        {bottomThree.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted-foreground text-xs">
            No performers found in the #4 to #6 ranking bracket.
          </div>
        ) : (
          <div className="space-y-3">
            {bottomThree.map((performer) => (
              <NormalStarRow key={performer.id} performer={performer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 🌟 1. BigStarCard: Handles Platinum (#1), Gold (#2), and Silver (#3)
// ---------------------------------------------------------------------------
function BigStarCard({ performer }: { performer: StarPerformer }) {
  const isPlatinum = performer.rank === 1;
  const isGold = performer.rank === 2;
  const isSilver = performer.rank === 3;

  // Platinum styling
  if (isPlatinum) {
    return (
      <Card className="relative overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-slate-500/60 shadow-xl shadow-slate-400/10 dark:shadow-slate-950/50 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between">
        {/* Platinum Sheen Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-sky-50/70 to-slate-200/50 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-indigo-950/40 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-slate-300 via-sky-200 to-indigo-300 dark:from-slate-400 dark:via-sky-400 dark:to-indigo-300" />

        <div className="relative p-6 flex flex-col items-center text-center space-y-4">
          {/* Header Tier Pill */}
          <div className="flex items-center justify-between w-full">
            <Badge
              variant="outline"
              className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-800 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700 dark:text-slate-100 border-slate-300 dark:border-slate-600 shadow-xs text-[11px] font-bold uppercase tracking-wider py-1 px-3 gap-1.5"
            >
              <Crown className="h-3.5 w-3.5 text-indigo-500 dark:text-sky-400" />
              Platinum Tier #1
            </Badge>

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Rank #1
            </span>
          </div>

          {/* Profile Picture with Platinum Metallic Halo */}
          <div className="relative my-2">
            <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-slate-300 via-sky-100 to-indigo-300 dark:from-slate-600 dark:via-sky-500 dark:to-indigo-400 shadow-lg">
              <img
                src={performer.photo}
                alt={performer.name}
                referrerPolicy="no-referrer"
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover border-2 border-white dark:border-slate-900 shadow-md"
              />
            </div>
            {/* Crown Rank Badge Floating */}
            <div className="absolute -bottom-2 -right-1 bg-gradient-to-br from-indigo-600 to-slate-800 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-slate-800">
              <Crown className="h-4 w-4 text-amber-300" />
            </div>
          </div>

          {/* Title Text */}
          <div className="space-y-1">
            <div className="inline-block bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-slate-100 dark:via-sky-200 dark:to-white bg-clip-text text-transparent font-display text-lg sm:text-xl font-extrabold tracking-tight">
              {performer.title}
            </div>
            <h3 className="text-xl font-bold text-foreground">{performer.name}</h3>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="font-medium">{performer.market}</span>
            </div>
          </div>

          {/* Score Percentage Banner */}
          <div className="w-full bg-gradient-to-r from-slate-200/80 via-white to-slate-200/80 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 p-3.5 rounded-xl border border-slate-300 dark:border-slate-600/80 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
              Performance Score
            </span>
            <div className="font-display text-3xl sm:text-4xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-1">
              <span>{performer.score}%</span>
              <TrendingUp className="h-5 w-5 text-indigo-500 inline" />
            </div>
          </div>

          {/* Key Metrics breakdown */}
          <div className="w-full grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <span className="text-[10px] text-muted-foreground block">Boxes</span>
              <span className="text-xs font-bold text-foreground">
                {performer.salesBoxes.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <span className="text-[10px] text-muted-foreground block">Accessories</span>
              <span className="text-xs font-bold text-foreground">{performer.accessoriesPct}%</span>
            </div>
            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <span className="text-[10px] text-muted-foreground block">Retention</span>
              <span className="text-xs font-bold text-foreground">{performer.retentionPct}%</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Gold styling (#2)
  if (isGold) {
    return (
      <Card className="relative overflow-hidden rounded-2xl border-2 border-amber-400 dark:border-amber-500/70 shadow-xl shadow-amber-500/10 dark:shadow-amber-950/40 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between">
        {/* Gold Glow Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100/90 via-yellow-50/50 to-amber-100/30 dark:from-amber-950/50 dark:via-amber-900/30 dark:to-stone-900 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

        <div className="relative p-6 flex flex-col items-center text-center space-y-4">
          {/* Header Tier Pill */}
          <div className="flex items-center justify-between w-full">
            <Badge
              variant="outline"
              className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 border-amber-400 shadow-xs text-[11px] font-bold uppercase tracking-wider py-1 px-3 gap-1.5"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-950" />
              Gold Tier #2
            </Badge>

            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Rank #2
            </span>
          </div>

          {/* Profile Picture with Radiant Gold Halo */}
          <div className="relative my-2">
            <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-400 shadow-lg">
              <img
                src={performer.photo}
                alt={performer.name}
                referrerPolicy="no-referrer"
                className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover border-2 border-white dark:border-slate-900 shadow-md"
              />
            </div>
            {/* Trophy Rank Badge */}
            <div className="absolute -bottom-2 -right-1 bg-gradient-to-br from-amber-500 to-yellow-600 text-amber-950 p-2 rounded-full shadow-lg border-2 border-white dark:border-slate-800">
              <Trophy className="h-4 w-4 text-amber-950 fill-amber-950" />
            </div>
          </div>

          {/* Title Text */}
          <div className="space-y-1">
            <div className="inline-block bg-gradient-to-r from-amber-800 via-yellow-700 to-amber-900 dark:from-amber-200 dark:via-yellow-300 dark:to-amber-100 bg-clip-text text-transparent font-display text-lg sm:text-xl font-extrabold tracking-tight">
              {performer.title}
            </div>
            <h3 className="text-xl font-bold text-foreground">{performer.name}</h3>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="font-medium">{performer.market}</span>
            </div>
          </div>

          {/* Score Percentage Banner */}
          <div className="w-full bg-gradient-to-r from-amber-200/80 via-white to-amber-200/80 dark:from-amber-900/60 dark:via-amber-800/40 dark:to-amber-900/60 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/80 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300 block mb-0.5">
              Performance Score
            </span>
            <div className="font-display text-3xl sm:text-4xl font-black text-amber-950 dark:text-amber-100 flex items-center justify-center gap-1">
              <span>{performer.score}%</span>
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400 inline" />
            </div>
          </div>

          {/* Key Metrics breakdown */}
          <div className="w-full grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <span className="text-[10px] text-muted-foreground block">Boxes</span>
              <span className="text-xs font-bold text-foreground">
                {performer.salesBoxes.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <span className="text-[10px] text-muted-foreground block">Accessories</span>
              <span className="text-xs font-bold text-foreground">{performer.accessoriesPct}%</span>
            </div>
            <div className="p-2 rounded-lg bg-background/60 border border-border/60">
              <span className="text-[10px] text-muted-foreground block">Retention</span>
              <span className="text-xs font-bold text-foreground">{performer.retentionPct}%</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Silver styling (#3)
  return (
    <Card className="relative overflow-hidden rounded-2xl border-2 border-zinc-300 dark:border-zinc-500/70 shadow-xl shadow-zinc-400/10 dark:shadow-zinc-950/40 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between">
      {/* Silver Glow Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-100/90 via-slate-50/60 to-zinc-200/40 dark:from-zinc-900/90 dark:via-zinc-800/60 dark:to-slate-900 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-zinc-300 via-slate-200 to-zinc-400" />

      <div className="relative p-6 flex flex-col items-center text-center space-y-4">
        {/* Header Tier Pill */}
        <div className="flex items-center justify-between w-full">
          <Badge
            variant="outline"
            className="bg-gradient-to-r from-zinc-200 via-slate-200 to-zinc-300 text-zinc-900 dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700 dark:text-zinc-100 border-zinc-300 dark:border-zinc-500 shadow-xs text-[11px] font-bold uppercase tracking-wider py-1 px-3 gap-1.5"
          >
            <Medal className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
            Silver Tier #3
          </Badge>

          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Rank #3</span>
        </div>

        {/* Profile Picture with Chrome Silver Halo */}
        <div className="relative my-2">
          <div className="relative p-1.5 rounded-full bg-gradient-to-tr from-zinc-400 via-slate-200 to-zinc-300 shadow-lg">
            <img
              src={performer.photo}
              alt={performer.name}
              referrerPolicy="no-referrer"
              className="h-28 w-28 sm:h-32 sm:w-32 rounded-full object-cover border-2 border-white dark:border-slate-900 shadow-md"
            />
          </div>
          {/* Medal Rank Badge */}
          <div className="absolute -bottom-2 -right-1 bg-gradient-to-br from-zinc-500 to-slate-700 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-slate-800">
            <Medal className="h-4 w-4 text-zinc-200" />
          </div>
        </div>

        {/* Title Text */}
        <div className="space-y-1">
          <div className="inline-block bg-gradient-to-r from-zinc-800 via-slate-700 to-zinc-900 dark:from-zinc-100 dark:via-slate-200 dark:to-white bg-clip-text text-transparent font-display text-lg sm:text-xl font-extrabold tracking-tight">
            {performer.title}
          </div>
          <h3 className="text-xl font-bold text-foreground">{performer.name}</h3>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <span className="font-medium">{performer.market}</span>
          </div>
        </div>

        {/* Score Percentage Banner */}
        <div className="w-full bg-gradient-to-r from-zinc-200/80 via-white to-zinc-200/80 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 p-3.5 rounded-xl border border-zinc-300 dark:border-zinc-600 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block mb-0.5">
            Performance Score
          </span>
          <div className="font-display text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1">
            <span>{performer.score}%</span>
            <TrendingUp className="h-5 w-5 text-zinc-600 dark:text-zinc-300 inline" />
          </div>
        </div>

        {/* Key Metrics breakdown */}
        <div className="w-full grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2 rounded-lg bg-background/60 border border-border/60">
            <span className="text-[10px] text-muted-foreground block">Boxes</span>
            <span className="text-xs font-bold text-foreground">
              {performer.salesBoxes.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-background/60 border border-border/60">
            <span className="text-[10px] text-muted-foreground block">Accessories</span>
            <span className="text-xs font-bold text-foreground">{performer.accessoriesPct}%</span>
          </div>
          <div className="p-2 rounded-lg bg-background/60 border border-border/60">
            <span className="text-[10px] text-muted-foreground block">Retention</span>
            <span className="text-xs font-bold text-foreground">{performer.retentionPct}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 🌟 2. NormalStarRow: Renders #4 (Top Achiever), #5 (Rising Star), #6 (Impact Star)
// Stacked vertically in lines ("oper neechy lines me") with normal clean theme
// ---------------------------------------------------------------------------
function NormalStarRow({ performer }: { performer: StarPerformer }) {
  return (
    <Card className="overflow-hidden border border-border/80 bg-card/70 hover:bg-accent/20 transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Rank badge, Avatar, Name & Title */}
          <div className="flex items-center gap-4">
            {/* Rank badge */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 font-display text-sm font-bold text-muted-foreground border border-border/60">
              #{performer.rank}
            </div>

            {/* Profile Avatar */}
            <div className="relative shrink-0">
              <img
                src={performer.photo}
                alt={performer.name}
                referrerPolicy="no-referrer"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-cover border border-border/80 shadow-xs"
              />
            </div>

            {/* Performer Details */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold bg-primary/5 text-primary border-primary/20 py-0.5"
                >
                  {performer.title}
                </Badge>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  ID: {performer.ntid}
                </span>
              </div>
              <h4 className="text-base font-bold text-foreground">{performer.name}</h4>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span>{performer.market}</span>
              </div>
            </div>
          </div>

          {/* Right: Metrics & Score Percentage */}
          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
            {/* Mini metrics */}
            <div className="hidden md:flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Boxes
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {performer.salesBoxes.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Accessories
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {performer.accessoriesPct}%
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Retention
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {performer.retentionPct}%
                </span>
              </div>
            </div>

            {/* Score Percentage Pill */}
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                Score
              </span>
              <div className="flex items-center gap-1 font-display text-xl sm:text-2xl font-bold text-foreground">
                <span>{performer.score}%</span>
                <Percent className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar visual */}
        <div className="mt-3 w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(performer.score, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
