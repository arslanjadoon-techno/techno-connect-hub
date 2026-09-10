export interface RankerAggregatedRecord {
  voiceAchievedPCt: number;
  btsAchievedPCt: number;
  hsiAchievedPCt: number;
  mimAchievedPCt: number;
  upgradesAchievedPCt: number;
  accessoriesAchievedPCt: number;
  retentionAchievedPCt: number;
  dM_Name: string | null;
  mM_PIC_URL: string | null;
  tid: string | null;
  techID: string | null;
  storeName: string | null;
  market: string;
  marketManager: string;
  day: number;
  month: number;
  year: number;
  voiceTarget: number;
  voiceAchieved: number;
  btsTarget: number;
  btsAchieved: number;
  hsiTarget: number;
  hsiAchieved: number;
  mimTarget: number;
  mimAchieved: number;
  upgradesTarget: number;
  upgradesAchieved: number;
  accessoriesTarget: number;
  accessoriesAchieved: number;
  retentionTarget: number;
  retentionAchieved: number;
}

export interface RankerScoredRecord extends RankerAggregatedRecord {
  id: string | number;
  score: number;
}

export interface RankerKpi {
  label: string;
  value: string | number;
  tone?: string;
  fg?: string;
}

export interface RankerStar {
  name: string;
  market: string;
  rank: number;
  score?: number;
  tone?: string;
  photo?: string | null;
}

export interface RankerStarPerformer {
  id: number;
  rank: number;
  title: string;
  name: string;
  market: string;
  score: number;
  photo: string | null;
  tier: "platinum" | "gold" | "silver" | "normal";
  ntid: string;
  category?: string;
  breakdown?: {
    accessories: number;
    voice: number;
    hsi: number;
    mim: number;
    upgrades: number;
    bts: number;
    retention: number;
  };
}

export interface RankerWeight {
  name: string;
  value: number;
  color?: string;
}

export interface RankerStandingsQuery {
  market?: string;
  year?: number | string;
  month?: number | string;
  day?: number | string;
  search?: string;
}

export interface RankerFilterOptions {
  years: number[];
  months: number[];
  days: number[];
}
