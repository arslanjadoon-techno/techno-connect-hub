import { http } from "../http";
import { MARKET_API_PATHS } from "@/lib/config";
import type { Market } from "@/lib/api/client";

export class MarketsService {
  getAll(params?: {
    page?: number;
    size?: number;
    state?: string | number;
    district?: string | number;
  }) {
    return http.get<Market[]>(MARKET_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<Market>(MARKET_API_PATHS.market(id));
  }
  add(payload: { name: string; stateId: number }) {
    return http.post<Market>(MARKET_API_PATHS.addMarket, payload);
  }
  update(payload: { id: number; name: string; stateId: number }) {
    return http.put<Market>(MARKET_API_PATHS.updateMarket, payload);
  }
  delete(id: number) {
    return http.delete<null>(MARKET_API_PATHS.deleteMarket, { id });
  }
}

export const marketsService = new MarketsService();
