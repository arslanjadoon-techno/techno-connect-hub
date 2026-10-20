import { http } from "../http";
import { STORE_API_PATHS } from "@/lib/config";
import type { Store } from "@/lib/api/client";

export class StoresService {
  getAll(params?: {
    page?: number;
    size?: number;
    state?: string | number;
    State?: string | number;
    district?: string | number;
    District?: string | number;
    market?: string | number;
    Market?: string | number;
    search?: string;
    Search?: string;
  }) {
    const query: Record<string, any> = { ...params };
    if (query.search && !query.Search) {
      query.Search = query.search;
      delete query.search;
    }
    if (query.state && !query.State) {
      query.State = query.state;
      delete query.state;
    }
    if (query.market && !query.Market) {
      query.Market = query.market;
      delete query.market;
    }
    if (query.district && !query.District) {
      query.District = query.district;
      delete query.district;
    }
    return http.get<Store[]>(STORE_API_PATHS.getAll, query);
  }
  getStoreDropdownList() {
    return http.get<
      Array<{
        id: number;
        name: string;
        number?: string;
        email?: string;
        phone?: string;
        address?: string;
      }>
    >(STORE_API_PATHS.getStoreDropdownList);
  }
  async get(id: string | number) {
    const res = await http.get<any>(STORE_API_PATHS.store(id));
    if (res && res.data && Array.isArray(res.data)) {
      return {
        ...res,
        data: res.data[0] ?? null,
      };
    }
    return res;
  }
  add(payload: {
    name: string;
    number?: string;
    address: string;
    email: string;
    phone: string;
    doorCode?: string;
    stateId?: number;
    districtId: number;
    marketId?: number;
  }) {
    return http.post<Store>(STORE_API_PATHS.addStore, payload);
  }
  update(payload: {
    id: number;
    name: string;
    number?: string;
    address: string;
    email: string;
    phone: string;
    doorCode?: string;
    stateId?: number;
    districtId: number;
    marketId?: number;
  }) {
    return http.put<Store>(STORE_API_PATHS.updateStore, payload);
  }
  delete(id: number | string | { id: number | string }) {
    const numericId = typeof id === "object" && id !== null ? (id as any).id : id;
    return http.delete<null>(STORE_API_PATHS.deleteStore(numericId));
  }
}

export const storesService = new StoresService();
