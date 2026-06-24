import { http } from "./http";
import { EXTERNAL_TEAM_API_PATHS } from "@/lib/config";
import type { ExternalVendor } from "@/lib/api/client";

type VendorPayload = {
  name: string; phone: string; marketId: number; address: string; workNature: string;
};

export class ExternalTeamService {
  getAll(params?: { page?: number; size?: number; market?: string | number }) {
    return http.get<ExternalVendor[]>(EXTERNAL_TEAM_API_PATHS.getAll, params);
  }
  get(id: string | number) { return http.get<ExternalVendor>(EXTERNAL_TEAM_API_PATHS.state(id)); }
  add(payload: VendorPayload) { return http.post<ExternalVendor>(EXTERNAL_TEAM_API_PATHS.addState, payload); }
  update(payload: Omit<VendorPayload, "marketId"> & { id: number }) {
    return http.put<ExternalVendor>(EXTERNAL_TEAM_API_PATHS.updateState, payload);
  }
  delete(payload: { id: number }) {
    return http.delete<null>(EXTERNAL_TEAM_API_PATHS.deleteState, payload);
  }
}

export const externalTeamService = new ExternalTeamService();
