import { http } from "../http";

export class HierarchyService {
  getRoles() {
    return http.get<string[]>("/api/users/roles");
  }
  getDepartments() {
    return http.get<{ id: number; name: string }[]>("/api/departments/get-all");
  }
  getStates() {
    return http.post<{ id: number; name: string }[]>("/api/states/search");
  }
  getMarkets() {
    return http.get<{ id: number; name: string; stateId: number }[]>("/api/markets/get-all");
  }
  getDistricts() {
    return http.get<{ id: number; name: string; marketId: number }[]>("/api/districts/get-all");
  }
}

export const hierarchyService = new HierarchyService();
