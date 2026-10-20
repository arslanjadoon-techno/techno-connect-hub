import { http } from "../http";
import { MARKET_API_PATHS } from "@/lib/config";
import type { Market } from "@/lib/api/client";

export class MarketsService {
  getAll(params?: {
    page?: number;
    size?: number;
    state?: string | number;
    State?: string | number;
    district?: string | number;
    District?: string | number;
    Search?: string;
    search?: string;
  }) {
    const query: Record<string, any> = { ...params };
    if (query.search && !query.Search) {
      query.Search = query.search;
      delete query.search;
    }
    if (query.state && !query.State) {
      query.State = query.state;
      delete query.state;
    }
    return http.get<Market[]>(MARKET_API_PATHS.getAll, query);
  }
  get(id: string | number) {
    return http.get<Market>(MARKET_API_PATHS.market(id));
  }
  add(payload: {
    name: string;
    stateId: number;
    districtId?: number;
    managerId?: number | null;
    email?: string | null;
    phone?: string | null;
  }) {
    return http.post<Market>(MARKET_API_PATHS.addMarket, payload);
  }
  update(payload: {
    id: number;
    name: string;
    stateId?: number;
    districtId?: number;
    managerId?: number | null;
    email?: string | null;
    phone?: string | null;
  }) {
    return http.put<Market>(MARKET_API_PATHS.updateMarket, payload);
  }
  delete(id: number | string | { id: number | string }) {
    const numericId = typeof id === "object" && id !== null ? (id as any).id : Number(id);
    return http.delete<null>(MARKET_API_PATHS.deleteMarket, { id: numericId });
  }
}

export const marketsService = new MarketsService();
