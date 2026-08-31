import { http } from "../http";
import { USER_API_PATHS } from "@/lib/config";
import type { BackendUser, AddUserPayload } from "@/lib/api/client";

export class UsersService {
  getAll(params?: { page?: number; size?: number; department?: string; portal?: string }) {
    return http.get<BackendUser[]>(USER_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<BackendUser>(USER_API_PATHS.user(id));
  }
  add(payload: AddUserPayload) {
    return http.post<BackendUser>(USER_API_PATHS.addUser, payload);
  }
  update(payload: Partial<AddUserPayload> & { id: number }) {
    return http.put<BackendUser>(USER_API_PATHS.updateUser, payload);
  }
  delete(id: number) {
    return http.delete<null>(USER_API_PATHS.deleteUser, { id });
  }
}

export const usersService = new UsersService();
