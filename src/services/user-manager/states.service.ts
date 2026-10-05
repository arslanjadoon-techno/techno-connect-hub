import { http } from "../http";
import { STATE_API_PATHS } from "@/lib/config";
import type { State, StatePayload, StateQueryParams } from "@/lib/api/client";

export class StatesService {
  getAll(params?: StateQueryParams) {
    const trimmedSearch = params?.search?.trim();
    if (trimmedSearch) {
      return http.get<State[]>(
        `${STATE_API_PATHS.getAll}?search=${encodeURIComponent(trimmedSearch)}`,
      );
    }
    return http.get<State[]>(STATE_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<State>(STATE_API_PATHS.state(id));
  }
  add(payload: StatePayload) {
    return http.post<State>(STATE_API_PATHS.addState, payload);
  }
  update(payload: StatePayload & { id: number }) {
    return http.put<State>(STATE_API_PATHS.updateState, payload);
  }
  delete(id: number | string | { id: number | string }) {
    const numericId = typeof id === "object" && id !== null ? (id as any).id : id;
    return http.delete<null>(STATE_API_PATHS.deleteState(numericId));
  }
}

export const statesService = new StatesService();
