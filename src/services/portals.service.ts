import { http } from "./http";
import { PORTAL_API_PATHS } from "@/lib/config";
import type { Portal } from "@/lib/api/client";

export class PortalsService {
  getAll(params?: { page?: number; size?: number }) {
    return http.get<Portal[]>(PORTAL_API_PATHS.getAll, params);
  }
}

export const portalsService = new PortalsService();
