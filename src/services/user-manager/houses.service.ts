import { http } from "../http";
import { HOUSE_API_PATHS } from "@/lib/config";
import type { House } from "@/lib/api/client";

export class HousesService {
  getAll(params?: {
    page?: number;
    size?: number;
    state?: string | number;
    district?: string | number;
    market?: string | number;
  }) {
    return http.get<House[]>(HOUSE_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<House>(HOUSE_API_PATHS.house(id));
  }
  add(payload: {
    name: string;
    address: string;
    email: string;
    phone: string;
    districtId: number;
  }) {
    return http.post<House>(HOUSE_API_PATHS.addHouse, payload);
  }
  update(payload: {
    id: number;
    name: string;
    address: string;
    email: string;
    phone: string;
    districtId: number;
  }) {
    return http.put<House>(HOUSE_API_PATHS.updateHouse, payload);
  }
  delete(id: number) {
    return http.delete<null>(HOUSE_API_PATHS.deleteHouse, { id });
  }
}

export const housesService = new HousesService();
