import { http } from "./http";
import { DISTRICT_API_PATHS } from "@/lib/config";
import type { District } from "@/lib/api/client";

export class DistrictsService {
  getAll(params?: { page?: number; size?: number; state?: string | number }) {
    return http.get<District[]>(DISTRICT_API_PATHS.getAll, params);
  }
  get(id: string | number) { return http.get<District>(DISTRICT_API_PATHS.district(id)); }
  add(payload: { name: string; stateId: number }) {
    return http.post<District>(DISTRICT_API_PATHS.addDistrict, payload);
  }
  update(payload: { id: number; name: string }) {
    return http.put<District>(DISTRICT_API_PATHS.updateDistrict, payload);
  }
  delete(payload: { id: number }) {
    return http.delete<null>(DISTRICT_API_PATHS.deleteDistrict, payload);
  }
}

export const districtsService = new DistrictsService();
