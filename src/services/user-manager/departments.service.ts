import { http } from "../http";
import { DEPARTMENT_API_PATHS } from "@/lib/config";
import type { Department } from "@/lib/api/client";

export interface DepartmentPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  managerId?: number | null;
  description?: string;
}

export interface DepartmentUpdatePayload extends DepartmentPayload {
  id: number;
}

export class DepartmentsService {
  getAll(params?: { page?: number; size?: number }) {
    return http.get<Department[]>(DEPARTMENT_API_PATHS.getAll, params);
  }
  get(id: string | number) {
    return http.get<Department>(DEPARTMENT_API_PATHS.department(id));
  }
  add(payload: DepartmentPayload) {
    return http.post<Department>(DEPARTMENT_API_PATHS.addDepartment, payload);
  }
  update(payload: DepartmentUpdatePayload) {
    return http.put<Department>(DEPARTMENT_API_PATHS.updateDepartment, payload);
  }
  delete(id: number | string | { id: number | string }) {
    const numericId = typeof id === "object" && id !== null ? (id as any).id : id;
    return http.delete<null>(DEPARTMENT_API_PATHS.deleteDepartment, { id: Number(numericId) });
  }
}

export const departmentsService = new DepartmentsService();
