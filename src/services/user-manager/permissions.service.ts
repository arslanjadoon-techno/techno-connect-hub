import { http } from "../http";
import { PERMISSION_API_PATHS, USER_PERMISSION_API_PATHS } from "@/lib/config";

export type PermissionAccessLevel = "hide" | "read" | "write";
export type UserAccessMap = Record<number, PermissionAccessLevel>;

export interface PermissionItem {
  id: number;
  portalId: number;
  portalName: string;
  key: string;
  name: string;
  description?: string;
  createdDate?: string;
  createdBy?: string;
  modifiedDate?: string | null;
  modifiedBy?: string | null;
}

export interface UserPermissionItem {
  permissionId: number;
  permissionKey: string;
  permissionName: string;
  permissionDescription?: string;
  portalId: number;
  portalName: string;
  accessLevel: PermissionAccessLevel;
}

export interface AddPermissionPayload {
  portalId: number;
  name: string;
  description?: string;
}

export interface AssignPermissionEntry {
  permissionId: number;
  accessLevel: PermissionAccessLevel;
}

export interface AssignUserPermissionsPayload {
  userId: number;
  permissions: AssignPermissionEntry[];
}

/**
 * Transforms portal name & permission name into the standardized preview key.
 * Example: "Ticketing" + "Test Permission 1" -> "ticketing.test_permission_1"
 */
export function generatePermissionKey(portalName: string, permissionName: string): string {
  const portalSlug = portalName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const nameSlug = permissionName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!portalSlug && !nameSlug) return "";
  if (!portalSlug) return nameSlug;
  if (!nameSlug) return `${portalSlug}.`;
  return `${portalSlug}.${nameSlug}`;
}

export class PermissionsService {
  /**
   * Retrieves all permissions from the backend API.
   * If portalId is provided, returns permissions filtered by that portal.
   */
  getAll(params?: { portalId?: number | string }) {
    return http.get<PermissionItem[]>(PERMISSION_API_PATHS.getAll, params);
  }

  /**
   * Creates a new permission via the backend API.
   */
  add(payload: AddPermissionPayload) {
    return http.post<PermissionItem>(PERMISSION_API_PATHS.add, payload);
  }

  /**
   * Retrieves user permissions for a specific user ID.
   */
  getUserPermissions(userId: number | string) {
    return http.get<UserPermissionItem[]>(USER_PERMISSION_API_PATHS.getByUserId(userId));
  }

  /**
   * Assigns / updates permissions for a specific user.
   */
  assign(payload: AssignUserPermissionsPayload) {
    return http.put<null>(USER_PERMISSION_API_PATHS.assign, payload);
  }
}

export const permissionsService = new PermissionsService();
