import { http } from "../http";
import { STORE_API_PATHS } from "@/lib/config";
import type { Store } from "@/lib/api/client";

export class StoresService {
  getAll(params?: {
    page?: number;
    size?: number;
    state?: string | number;
    district?: string | number;
    market?: string | number;
  }) {
    return http.get<Store[]>(STORE_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<Store>(STORE_API_PATHS.store(id));
  }
  add(payload: {
    name: string;
    address: string;
    email: string;
    phone: string;
    districtId: number;
  }) {
    return http.post<Store>(STORE_API_PATHS.addStore, payload);
  }
  update(payload: {
    id: number;
    name: string;
    address: string;
    email: string;
    phone: string;
    districtId: number;
  }) {
    return http.put<Store>(STORE_API_PATHS.updateStore, payload);
  }
  delete(id: number | string | { id: number | string }) {
    const numericId = typeof id === "object" && id !== null ? (id as any).id : id;
    return http.delete<null>(STORE_API_PATHS.deleteStore(numericId));
  }
}

export const storesService = new StoresService();
