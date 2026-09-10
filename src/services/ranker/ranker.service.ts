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
 * Calculate KPI score for a record using official category weightage:
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
): number {
  const score =
    (Number(record.accessoriesAchievedPCt) || 0) * KPI_WEIGHTS.accessories +
    (Number(record.voiceAchievedPCt) || 0) * KPI_WEIGHTS.voice +
    (Number(record.hsiAchievedPCt) || 0) * KPI_WEIGHTS.hsi +
    (Number(record.mimAchievedPCt) || 0) * KPI_WEIGHTS.mim +
    (Number(record.upgradesAchievedPCt) || 0) * KPI_WEIGHTS.upgrades +
    (Number(record.btsAchievedPCt) || 0) * KPI_WEIGHTS.bts +
    (Number(record.retentionAchievedPCt) || 0) * KPI_WEIGHTS.retention;

  return Math.round(score * 10) / 10;
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
   * Extract Dashboard summary metrics:
   * - Total Unique Users
   * - Active Markets Count
   * - Yearly Champion (highest score performer across the year)
   * - Monthly Stars (top 3 performers by score)
   * - Average KPI performance for radar chart
   */
  getDashboardMetrics(records: RankerAggregatedRecord[]) {
    const usersSet = new Set<string>();
    const marketsSet = new Set<string>();

    let totalVoice = 0;
    let totalBts = 0;
    let totalHsi = 0;
    let totalMim = 0;
    let totalUpgrades = 0;
    let totalAccessories = 0;
    let totalRetention = 0;
    const count = records.length || 1;

    for (const r of records) {
      const name = (r.marketManager || r.dM_Name || "").trim();
      if (name) usersSet.add(name);
      if (r.market) marketsSet.add(r.market.trim());

      totalVoice += Number(r.voiceAchievedPCt) || 0;
      totalBts += Number(r.btsAchievedPCt) || 0;
      totalHsi += Number(r.hsiAchievedPCt) || 0;
      totalMim += Number(r.mimAchievedPCt) || 0;
      totalUpgrades += Number(r.upgradesAchievedPCt) || 0;
      totalAccessories += Number(r.accessoriesAchievedPCt) || 0;
      totalRetention += Number(r.retentionAchievedPCt) || 0;
    }

    // Scored records
    const scored = this.getScoredRecords(records);

    // Group by manager to find their highest achieved score
    const managerMap = new Map<
      string,
      {
        name: string;
        market: string;
        photo: string | null;
        highestScore: number;
        latestMonth: number;
        record: RankerAggregatedRecord;
      }
    >();

    for (const r of scored) {
      const name = (r.marketManager || r.dM_Name || "").trim();
      if (!name) continue;

      const existing = managerMap.get(name);
      if (!existing || r.score > existing.highestScore) {
        managerMap.set(name, {
          name,
          market: r.market,
          photo: r.mM_PIC_URL,
          highestScore: r.score,
          latestMonth: r.month,
          record: r,
        });
      }
    }

    const uniquePerformers = Array.from(managerMap.values()).sort(
      (a, b) => b.highestScore - a.highestScore,
    );

    // Yearly Champion is rank #1
    const yearlyChampion = uniquePerformers[0] || null;

    // Monthly stars: top 3 performers
    const monthlyStars: RankerStar[] = uniquePerformers.slice(0, 3).map((p, idx) => ({
      name: p.name,
      market: p.market,
      rank: idx + 1,
      score: p.highestScore,
      photo: p.photo,
      tone: idx === 0 ? "bg-sky-500" : idx === 1 ? "bg-amber-500" : "bg-emerald-500",
    }));

    // Average KPI Radar data
    const radarData = [
      { kpi: "Accessories", value: Math.round(totalAccessories / count) },
      { kpi: "Voice", value: Math.round(totalVoice / count) },
      { kpi: "HSI", value: Math.round(totalHsi / count) },
      { kpi: "MIM", value: Math.round(totalMim / count) },
      { kpi: "Upgrades", value: Math.round(totalUpgrades / count) },
      { kpi: "BTS", value: Math.round(totalBts / count) },
      { kpi: "Retention", value: Math.round(totalRetention / count) },
    ];

    return {
      totalUsers: usersSet.size,
      activeMarkets: marketsSet.size,
      yearlyChampion,
      monthlyStars,
      radarData,
    };
  }

  /**
   * Calculate Top 6 Star Rankers based on KPI weightage.
   */
  getTopStarRankers(records: RankerAggregatedRecord[], limit = 6): RankerStarPerformer[] {
    const scored = this.getScoredRecords(records);

    // Group by manager to get their top performance
    const managerMap = new Map<
      string,
      {
        name: string;
        market: string;
        photo: string | null;
        record: RankerScoredRecord;
      }
    >();

    for (const r of scored) {
      const name = (r.marketManager || r.dM_Name || "").trim();
      if (!name) continue;

      const existing = managerMap.get(name);
      if (!existing || r.score > existing.record.score) {
        managerMap.set(name, {
          name,
          market: r.market,
          photo: r.mM_PIC_URL,
          record: r,
        });
      }
    }

    const sorted = Array.from(managerMap.values()).sort((a, b) => b.record.score - a.record.score);

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

    return sorted.slice(0, limit).map((item, idx) => {
      const rec = item.record;
      return {
        id: idx + 1,
        rank: idx + 1,
        title: titles[idx] || "Star Ranker",
        name: item.name,
        market: item.market,
        score: rec.score,
        photo:
          item.photo ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&size=200`,
        tier: tiers[idx] || "normal",
        ntid: rec.marketManager?.toLowerCase().replace(/\s+/g, "") || `user${idx + 1}`,
        breakdown: {
          accessories: Math.round(rec.accessoriesAchievedPCt || 0),
          voice: Math.round(rec.voiceAchievedPCt || 0),
          hsi: Math.round(rec.hsiAchievedPCt || 0),
          mim: Math.round(rec.mimAchievedPCt || 0),
          upgrades: Math.round(rec.upgradesAchievedPCt || 0),
          bts: Math.round(rec.btsAchievedPCt || 0),
          retention: Math.round(rec.retentionAchievedPCt || 0),
        },
      };
    });
  }
}

export const rankerService = new RankerService();
