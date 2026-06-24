import { http } from "./http";
import { HOUSE_API_PATHS } from "@/lib/config";
import type { House } from "@/lib/api/client";

type HousePayload = {
  address: string; phone: string;
  stateId: number; districtId: number; marketId: number;
};

export class HousesService {
  getAll(params?: { page?: number; size?: number; state?: string | number; district?: string | number; market?: string | number }) {
    return http.get<House[]>(HOUSE_API_PATHS.getAll, params);
  }
  get(id: string | number) { return http.get<House>(HOUSE_API_PATHS.house(id)); }
  add(payload: HousePayload) { return http.post<House>(HOUSE_API_PATHS.addHouse, payload); }
  update(payload: HousePayload & { id: number }) {
    return http.put<House>(HOUSE_API_PATHS.updateHouse, payload);
  }
  delete(payload: { id: number }) {
    return http.delete<null>(HOUSE_API_PATHS.deleteHouse, payload);
  }
}

export const housesService = new HousesService();
