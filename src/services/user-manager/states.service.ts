import { http } from "../http";
import { STATE_API_PATHS } from "@/lib/config";
import type { State } from "@/lib/api/client";

export class StatesService {
  getAll(params?: { page?: number; size?: number }) {
    return http.get<State[]>(STATE_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<State>(STATE_API_PATHS.state(id));
  }
  add(payload: { name: string; symbol: string }) {
    return http.post<State>(STATE_API_PATHS.addState, payload);
  }
  update(payload: { id: number; name: string; symbol: string }) {
    return http.put<State>(STATE_API_PATHS.updateState, payload);
  }
  delete(id: number) {
    return http.delete<null>(STATE_API_PATHS.deleteState, { id });
  }
}

export const statesService = new StatesService();
