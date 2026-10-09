import { HttpClient } from "../http";
import { USER_API_PATHS, USER_MANAGEMENT_API_BASE_URL } from "@/lib/config";
import type { BackendUser, AddUserPayload } from "@/lib/api/client";

export class UsersService {
  private readonly http = new HttpClient(USER_MANAGEMENT_API_BASE_URL);
  getAll(params?: { page?: number; size?: number; department?: string; portal?: string }) {
    return this.http.get<BackendUser[]>(USER_API_PATHS.getAll, params);
  }
  search(params: string | { search: string; department?: string }) {
    if (typeof params === "string") {
      return this.http.get<BackendUser[]>(USER_API_PATHS.search, { search: params });
    }
    const queryParams: Record<string, string> = { search: params.search };
    if (params.department && params.department !== "all") {
      queryParams.department = params.department;
    }
    return this.http.get<BackendUser[]>(USER_API_PATHS.search, queryParams);
  }
  get(id: string | number) {
    return this.http.get<BackendUser>(USER_API_PATHS.user(id));
  }
  add(payload: AddUserPayload) {
    return this.http.post<BackendUser>(USER_API_PATHS.addUser, payload);
  }
  update(payload: Partial<AddUserPayload> & { id: number }) {
    return this.http.put<BackendUser>(USER_API_PATHS.updateUser, payload);
  }
  delete(id: number | string | { id: number | string }) {
    const numericId = typeof id === "object" && id !== null ? (id as any).id : id;
    return this.http.delete<null>(USER_API_PATHS.deleteUser(numericId));
  }
}

export const usersService = new UsersService();
