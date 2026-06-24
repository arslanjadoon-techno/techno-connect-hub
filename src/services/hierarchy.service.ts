import { http } from "./http";
import { HIRARCHY_API_PATHS } from "@/lib/config";
import type { BackendUser } from "@/lib/api/client";

export class HierarchyService {
  getRoles() { return http.get<string[]>("/api/users/roles"); }
  getDepartments() { return http.get<{ id: number; name: string }[]>("/api/departments/get-all"); }
  getStates() { return http.post<{ id: number; name: string }[]>("/api/states/search"); }
  getMarkets() { return http.get<{ id: number; name: string; stateId: number }[]>("/api/markets/get-all"); }
  getDistricts() { return http.get<{ id: number; name: string; marketId: number }[]>("/api/districts/get-all"); }
  getDistrictsByState(id: string | number) {
    return http.get<BackendUser>(HIRARCHY_API_PATHS.getDistrictsByState(id));
  }
}

export const hierarchyService = new HierarchyService();
