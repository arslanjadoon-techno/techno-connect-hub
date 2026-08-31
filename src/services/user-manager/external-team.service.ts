import { http } from "../http";
import { EXTERNAL_TEAM_API_PATHS } from "@/lib/config";
import type { ExternalVendor } from "@/lib/api/client";

export class ExternalTeamService {
  getAll(params?: { page?: number; size?: number }) {
    return http.get<ExternalVendor[]>(EXTERNAL_TEAM_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<ExternalVendor>(EXTERNAL_TEAM_API_PATHS.state(id));
  }
  add(payload: { name: string; email: string; phone: string; address?: string }) {
    return http.post<ExternalVendor>(EXTERNAL_TEAM_API_PATHS.addState, payload);
  }
  update(payload: { id: number; name: string; email: string; phone: string; address?: string }) {
    return http.put<ExternalVendor>(EXTERNAL_TEAM_API_PATHS.updateState, payload);
  }
  delete(id: number) {
    return http.delete<null>(EXTERNAL_TEAM_API_PATHS.deleteState, { id });
  }
}

export const externalTeamService = new ExternalTeamService();
