import { http } from "../http";
import { DISTRICT_API_PATHS } from "@/lib/config";
import type { District } from "@/lib/api/client";

export class DistrictsService {
  getAll(params?: {
    page?: number;
    size?: number;
    state?: string | number;
    market?: string | number;
  }) {
    return http.get<District[]>(DISTRICT_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<District>(DISTRICT_API_PATHS.district(id));
  }
  add(payload: {
    name: string;
    stateId?: number;
    marketId?: number;
    managerId?: number | null;
    manager?: string;
    email?: string | null;
    phone?: string | null;
  }) {
    return http.post<District>(DISTRICT_API_PATHS.addDistrict, payload);
  }
  update(payload: {
    id: number;
    name: string;
    stateId?: number;
    marketId?: number;
    managerId?: number | null;
    manager?: string;
    email?: string | null;
    phone?: string | null;
  }) {
    return http.put<District>(DISTRICT_API_PATHS.updateDistrict, payload);
  }
  delete(id: number | string | { id: number | string }) {
    const numericId = typeof id === "object" && id !== null ? (id as any).id : id;
    return http.delete<null>(DISTRICT_API_PATHS.deleteDistrict(numericId));
  }
}

export const districtsService = new DistrictsService();
