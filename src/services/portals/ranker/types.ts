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

export interface GoalVsAchievementMetricItem {
  tid: string;
  techId: string;
  market_Manager: string;
  market: string;
  storeName: string;
  year: number;
  month: number;
  day: number;
  target?: number;
  achieved?: number;
  percentage?: number;
}

export interface GoalVsAchievementByodItem {
  tid: string;
  techId: string;
  market_Manager: string;
  market: string;
  storeName: string;
  year: number;
  month: number;
  day: number;
  achieved: number;
}

export interface GoalVsAchievementAffirmItem {
  tid: string;
  techId: string;
  market_Manager: string;
  market: string;
  storeName: string;
  year: number;
  month: number;
  day: number;
  invoice_Amount: number;
  financed_Amount: number;
  non_Financed_Amount: number;
}

export interface GoalVsAchievementSummaryItem {
  tid: string;
  techId: string;
  districtManager: string;
  district: string | null;
  market: string;
  storeName: string;
  month: number;
  year: number;
  full_Month_Target: number;
  full_Month_Achieved: number;
  mtD_Target: number;
  mtD_Achieved: number;
  voicE_Target: number;
  voicE_Achieved: number;
  upgrade_Target: number;
  upgrade_Achieved: number;
  btS_Target: number;
  btS_Achieved: number;
  hsI_Target: number;
  hsI_Achieved: number;
  miM_Target: number;
  miM_Achieved: number;
  acC_Target: number;
  acC_Achieved: number;
}

export interface GoalVsAchievementDcsItem {
  tid: string;
  techId: string;
  market_Manager: string;
  market: string;
  storeName: string;
  year: number;
  month: number;
  day: number;
  total_Targets_FMTD?: number;
  dcS_ACHIEVED_FMTD?: number;
  rT_ACHIEVED_FMTD?: number;
  total_Targets_Voice?: number;
  dcS_ACHIEVED_Voice?: number;
  rT_ACHIEVED_Voice?: number;
  total_Targets_BTS?: number;
  dcS_ACHIEVED_BTS?: number;
  rT_ACHIEVED_BTS?: number;
  total_Targets_HSI?: number;
  dcS_ACHIEVED_HSI?: number;
  rT_ACHIEVED_HSI?: number;
  total_Targets_MIM?: number;
  dcS_ACHIEVED_MIM?: number;
  rT_ACHIEVED_MIM?: number;
}

export interface GoalVsAchievementResponse {
  ACC: GoalVsAchievementMetricItem[];
  VOICE: GoalVsAchievementMetricItem[];
  HSI: GoalVsAchievementMetricItem[];
  BTS: GoalVsAchievementMetricItem[];
  UPGRADE: GoalVsAchievementMetricItem[];
  MIM: GoalVsAchievementMetricItem[];
  BYOD: GoalVsAchievementByodItem[];
  Affirm: GoalVsAchievementAffirmItem[];
  Summary: GoalVsAchievementSummaryItem[];
  TOTAL_ACHIEVEMENTS?: GoalVsAchievementMetricItem[];
  DCS_VS_RTBDI?: GoalVsAchievementDcsItem[];
}

export interface RankerGoalVsAchievementParams {
  market: string;
  year: number | string;
  month: number | string;
  dayfrom: number | string;
  dayto: number | string;
}
