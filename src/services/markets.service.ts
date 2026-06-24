import { http } from "./http";
import { MARKET_API_PATHS } from "@/lib/config";

export interface Market {
  id: number;
  name: string;
  state: { id: number; name: string };
  district: { id: number; name: string };
  createdAt?: string;
  updatedAt?: string;
}

export class MarketsService {
  getAll(params?: { page?: number; size?: number; state?: string | number; district?: string | number }) {
    return http.get<Market[]>(MARKET_API_PATHS.getAll, params);
  }
  get(id: string | number) { return http.get<Market>(MARKET_API_PATHS.market(id)); }
  add(payload: { name: string; stateId: number; districtId: number }) {
    return http.post<Market>(MARKET_API_PATHS.addMarket, payload);
  }
  update(payload: { id: number; name: string; districtId: number }) {
    return http.put<Market>(MARKET_API_PATHS.updateMarket, payload);
  }
  delete(payload: { id: number }) {
    return http.delete<null>(MARKET_API_PATHS.deleteMarket, payload);
  }
}

export const marketsService = new MarketsService();
