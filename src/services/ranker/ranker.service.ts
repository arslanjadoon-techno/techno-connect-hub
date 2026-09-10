import { RANKER_API_BASE_URL, RANKER_API_PATHS } from "@/lib/config";
import type {
  RankerAggregatedRecord,
  RankerScoredRecord,
  RankerKpi,
  RankerStar,
  RankerWeight,
  RankerStandingsQuery,
  RankerStarPerformer,
  RankerFilterOptions,
} from "./types";

export const KPI_WEIGHTS = {
  accessories: 0.25,
  voice: 0.2,
  hsi: 0.15,
  mim: 0.1,
  upgrades: 0.1,
  bts: 0.1,
  retention: 0.1,
} as const;

/**
 * Calculate KPI score for a record using official category weightage matching previous Ranker project:
 * - Accessories: 25%
 * - Voice Activations: 20%
 * - HSI: 15%
 * - Migrations (MIM): 10%
 * - Upgrades: 10%
 * - BTS: 10%
 * - 95-Day Retention: 10%
 */
export function calculateKpiScore(
  record: Pick<
    RankerAggregatedRecord,
    | "accessoriesAchievedPCt"
    | "voiceAchievedPCt"
    | "hsiAchievedPCt"
    | "mimAchievedPCt"
    | "upgradesAchievedPCt"
    | "btsAchievedPCt"
    | "retentionAchievedPCt"
  >,
  precision = 2,
): number {
  const score =
    (parseFloat(String(record.accessoriesAchievedPCt)) || 0) * 0.25 +
    (parseFloat(String(record.voiceAchievedPCt)) || 0) * 0.2 +
    (parseFloat(String(record.hsiAchievedPCt)) || 0) * 0.15 +
    (parseFloat(String(record.mimAchievedPCt)) || 0) * 0.1 +
    (parseFloat(String(record.upgradesAchievedPCt)) || 0) * 0.1 +
    (parseFloat(String(record.btsAchievedPCt)) || 0) * 0.1 +
    (parseFloat(String(record.retentionAchievedPCt)) || 0) * 0.1;

  return parseFloat(score.toFixed(precision));
}

/**
 * Helper to extract max year, max month, and max day from records.
 */
export function getLatestDate(records: RankerAggregatedRecord[]) {
  if (!records || records.length === 0) {
    return { maxYear: 0, maxMonth: 0, maxDay: 0 };
  }
  const maxYear = Math.max(...records.map((m) => m.year));
  const maxMonth = Math.max(...records.filter((m) => m.year === maxYear).map((m) => m.month));
  const maxDay = Math.max(
    ...records.filter((m) => m.year === maxYear && m.month === maxMonth).map((m) => m.day),
  );
  return { maxYear, maxMonth, maxDay };
}

/**
 * Ranker Portal Service Class
 * Handles API calls and calculation logic for the Ranker portal.
 */
export class RankerService {
  private cache: RankerAggregatedRecord[] | null = null;
  private cachePromise: Promise<RankerAggregatedRecord[]> | null = null;

  constructor(public readonly baseUrl: string = RANKER_API_BASE_URL) {}

  /**
   * Fetch aggregated achievement data from the Ranker AWS API.
   * Caches response in-memory to prevent redundant network requests.
   */
  async getAggregatedAchieved(opts?: {
    forceRefresh?: boolean;
  }): Promise<RankerAggregatedRecord[]> {
    if (!opts?.forceRefresh && this.cache) {
      return this.cache;
    }
    if (!opts?.forceRefresh && this.cachePromise) {
      return this.cachePromise;
    }

    const endpoint = `${this.baseUrl}${RANKER_API_PATHS.getAggregatedAchieved}`;

    this.cachePromise = (async () => {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            accept: "application/json, text/plain, */*",
            "cache-control": "no-cache",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch Ranker data (${response.status}: ${response.statusText})`,
          );
        }

        const data = await response.json();
        const records: RankerAggregatedRecord[] = Array.isArray(data) ? data : [];
        this.cache = records;
        return records;
      } catch (err) {
        console.error("Error fetching Ranker aggregated achieved data:", err);
        throw err;
      } finally {
        this.cachePromise = null;
      }
    })();

    return this.cachePromise;
  }

  /**
   * Calculate KPI scores for all aggregated records and attach unique id.
   */
  getScoredRecords(records: RankerAggregatedRecord[]): RankerScoredRecord[] {
    return records.map((r, idx) => ({
      ...r,
      id: `${r.year}-${r.month}-${r.day}-${r.market}-${r.marketManager || r.dM_Name || idx}`,
      score: calculateKpiScore(r),
    }));
  }

  /**
   * Extract unique Year, Month, and Day filter values without repetition.
   */
  getFilterOptions(records: RankerAggregatedRecord[]): RankerFilterOptions {
    const yearsSet = new Set<number>();
    const monthsSet = new Set<number>();
    const daysSet = new Set<number>();

    for (const r of records) {
      if (r.year) yearsSet.add(r.year);
      if (r.month) monthsSet.add(r.month);
      if (r.day) daysSet.add(r.day);
    }

    return {
      years: Array.from(yearsSet).sort((a, b) => b - a),
      months: Array.from(monthsSet).sort((a, b) => a - b),
      days: Array.from(daysSet).sort((a, b) => a - b),
    };
  }

  /**
   * Extract Dashboard summary metrics matching previous Ranker project:
   * 1. Map all data with totalScore calculated to 1 decimal place.
   * 2. Extract latest date (maxYear, maxMonth, maxDay).
   * 3. Filter only latest records sorted by totalScore descending.
   * 4. Yearly Champ = top latest record, Top Monthly = top 3 latest records.
   * 5. Radar chart = average of each KPI across latest records.
   */
  getDashboardMetrics(records: RankerAggregatedRecord[]) {
    if (!records || records.length === 0) {
      return {
        totalUsers: 0,
        activeMarkets: 0,
        yearlyChampion: null,
        monthlyStars: [],
        radarData: [
          { kpi: "Accessories", value: 0 },
          { kpi: "Voice", value: 0 },
          { kpi: "HSI", value: 0 },
          { kpi: "MIM", value: 0 },
          { kpi: "Upgrades", value: 0 },
          { kpi: "BTS", value: 0 },
          { kpi: "Retention", value: 0 },
        ],
      };
    }

    // 1. All data mapping
    const allData = records.map((item, index) => ({
      ...item,
      id: item.tid || `${item.marketManager || item.dM_Name}-${index}`,
      name: item.dM_Name || "No Name",
      market: item.market || "N/A",
      image: item.mM_PIC_URL || "",
      totalScore: parseFloat(
        (
          (parseFloat(String(item.accessoriesAchievedPCt)) || 0) * 0.25 +
          (parseFloat(String(item.voiceAchievedPCt)) || 0) * 0.2 +
          (parseFloat(String(item.hsiAchievedPCt)) || 0) * 0.15 +
          (parseFloat(String(item.mimAchievedPCt)) || 0) * 0.1 +
          (parseFloat(String(item.upgradesAchievedPCt)) || 0) * 0.1 +
          (parseFloat(String(item.btsAchievedPCt)) || 0) * 0.1 +
          (parseFloat(String(item.retentionAchievedPCt)) || 0) * 0.1
        ).toFixed(1),
      ),
    }));

    // 2. Latest Date extraction
    const maxYear = Math.max(...allData.map((m) => m.year));
    const maxMonth = Math.max(...allData.filter((m) => m.year === maxYear).map((m) => m.month));
    const maxDay = Math.max(
      ...allData.filter((m) => m.year === maxYear && m.month === maxMonth).map((m) => m.day),
    );

    // 3. Filter only Latest Records
    const latestRecords = allData
      .filter((m) => m.year === maxYear && m.month === maxMonth && m.day === maxDay)
      .sort((a, b) => b.totalScore - a.totalScore);

    const yearlyChamp = latestRecords[0] || null;
    const topMonthly = latestRecords.slice(0, 3);

    // Radar chart: Real-time average across all latest managers
    const kpiKeyMap: Record<string, keyof RankerAggregatedRecord> = {
      Accessories: "accessoriesAchievedPCt",
      Voice: "voiceAchievedPCt",
      HSI: "hsiAchievedPCt",
      MIM: "mimAchievedPCt",
      Upgrades: "upgradesAchievedPCt",
      BTS: "btsAchievedPCt",
      Retention: "retentionAchievedPCt",
    };

    const radarData = Object.entries(kpiKeyMap).map(([shortName, apiKey]) => {
      const total = latestRecords.reduce((sum, m) => {
        const val = parseFloat(String(m[apiKey])) || 0;
        return sum + val;
      }, 0);
      const average = latestRecords.length > 0 ? total / latestRecords.length : 0;
      return {
        kpi: shortName,
        value: parseFloat(average.toFixed(1)),
      };
    });

    const yearlyChampion = yearlyChamp
      ? {
          name: yearlyChamp.name,
          market: yearlyChamp.market,
          photo: yearlyChamp.image || null,
          highestScore: yearlyChamp.totalScore,
        }
      : null;

    const monthlyStars: RankerStar[] = topMonthly.map((m, idx) => ({
      name: m.name,
      market: m.market,
      rank: idx + 1,
      score: m.totalScore,
      photo: m.image || null,
      tone: idx === 0 ? "bg-[#00a3e0]" : idx === 1 ? "bg-[#ffcc00]" : "bg-gray-400",
    }));

    return {
      totalUsers: latestRecords.length,
      activeMarkets: new Set(latestRecords.map((m) => m.market)).size,
      yearlyChampion,
      monthlyStars,
      radarData,
    };
  }

  /**
   * Calculate Top 6 Star Rankers based on latest date records matching previous Ranker project.
   */
  getTopStarRankers(records: RankerAggregatedRecord[], limit = 6): RankerStarPerformer[] {
    if (!records || records.length === 0) return [];

    const maxYear = Math.max(...records.map((m) => m.year));
    const maxMonth = Math.max(...records.filter((m) => m.year === maxYear).map((m) => m.month));
    const maxDay = Math.max(
      ...records.filter((m) => m.year === maxYear && m.month === maxMonth).map((m) => m.day),
    );

    const latestData = records.filter(
      (item) => item.year === maxYear && item.month === maxMonth && item.day === maxDay,
    );

    const mappedData = latestData.map((item, index) => {
      const score = parseFloat(
        (
          (parseFloat(String(item.accessoriesAchievedPCt)) || 0) * 0.25 +
          (parseFloat(String(item.voiceAchievedPCt)) || 0) * 0.2 +
          (parseFloat(String(item.hsiAchievedPCt)) || 0) * 0.15 +
          (parseFloat(String(item.mimAchievedPCt)) || 0) * 0.1 +
          (parseFloat(String(item.upgradesAchievedPCt)) || 0) * 0.1 +
          (parseFloat(String(item.btsAchievedPCt)) || 0) * 0.1 +
          (parseFloat(String(item.retentionAchievedPCt)) || 0) * 0.1
        ).toFixed(2),
      );

      return {
        id: index + 1,
        rank: index + 1,
        title: "",
        name: item.dM_Name || "No Name",
        market: item.market || "N/A",
        score,
        photo: item.mM_PIC_URL || null,
        tier: "normal" as const,
        ntid: item.marketManager?.toLowerCase().replace(/\s+/g, "") || `user${index + 1}`,
        category: score >= 90 ? "Top Performer" : "Consistent Achiever",
        breakdown: {
          accessories: Math.round(Number(item.accessoriesAchievedPCt) || 0),
          voice: Math.round(Number(item.voiceAchievedPCt) || 0),
          hsi: Math.round(Number(item.hsiAchievedPCt) || 0),
          mim: Math.round(Number(item.mimAchievedPCt) || 0),
          upgrades: Math.round(Number(item.upgradesAchievedPCt) || 0),
          bts: Math.round(Number(item.btsAchievedPCt) || 0),
          retention: Math.round(Number(item.retentionAchievedPCt) || 0),
        },
      };
    });

    const sortedData = mappedData.sort((a, b) => b.score - a.score);

    const titles = [
      "Legendary Performer",
      "Elite Performer",
      "Premier Performer",
      "Top Achiever",
      "Rising Star",
      "Impact Star",
    ];

    const tiers: Array<"platinum" | "gold" | "silver" | "normal"> = [
      "platinum",
      "gold",
      "silver",
      "normal",
      "normal",
      "normal",
    ];

    return sortedData.slice(0, limit).map((item, idx) => ({
      ...item,
      id: idx + 1,
      rank: idx + 1,
      title: titles[idx] || (item.score >= 90 ? "Top Performer" : "Consistent Achiever"),
      tier: tiers[idx] || "normal",
    }));
  }
}

export const rankerService = new RankerService();
