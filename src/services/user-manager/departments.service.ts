import { http } from "../http";
import { DEPARTMENT_API_PATHS } from "@/lib/config";
import type { Department } from "@/lib/api/client";

export class DepartmentsService {
  getAll(params?: { page?: number; size?: number }) {
    return http.get<Department[]>(DEPARTMENT_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<Department>(DEPARTMENT_API_PATHS.department(id));
  }
  add(payload: { name: string; description?: string }) {
    return http.post<Department>(DEPARTMENT_API_PATHS.addDepartment, payload);
  }
  update(payload: { id: number; name: string; description?: string }) {
    return http.put<Department>(DEPARTMENT_API_PATHS.updateDepartment, payload);
  }
  delete(id: number) {
    return http.delete<null>(DEPARTMENT_API_PATHS.deleteDepartment, { id });
  }
}

export const departmentsService = new DepartmentsService();
