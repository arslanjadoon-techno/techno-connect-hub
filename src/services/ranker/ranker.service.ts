import { http } from "../http";
import type { RankerKpi, RankerStar, RankerWeight, RankerStandingsQuery } from "./types";

/**
 * Ranker Portal Service Class
 * Prepared for Ranker portal backend endpoints.
 */
export class RankerService {
  /**
   * Fetch Ranker portal standings.
   */
  async getStandings(params?: RankerStandingsQuery) {
    return http.get<Record<string, unknown>[]>(
      "/api/ranker/standings",
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  /**
   * Fetch Ranker dashboard summary KPIs.
   */
  async getDashboardKpis() {
    return http.get<RankerKpi[]>("/api/ranker/kpis");
  }

  /**
   * Fetch monthly star performers.
   */
  async getMonthlyStars() {
    return http.get<RankerStar[]>("/api/ranker/stars");
  }

  /**
   * Fetch KPI weights breakdown.
   */
  async getKpiWeights() {
    return http.get<RankerWeight[]>("/api/ranker/kpi-weights");
  }
}

export const rankerService = new RankerService();
