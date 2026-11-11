import type { UserPermissionEntry } from "@/lib/api/client";

type OtpPermissionScope = "chat" | "manager" | "backoffice";

const normalize = (value: unknown) => String(value ?? "").toLowerCase().replace(/[\s_-]/g, "");

/** Checks whether the user has the requested portal in either access representation. */
export function hasPortalAccess(user: any, portalName: string): boolean {
  const target = normalize(portalName);
  const assignedPortals = Array.isArray(user?.assignedPortals) ? user.assignedPortals : [];
  if (assignedPortals.some((portal: unknown) => normalize(portal) === target)) return true;

  const portalAccess = Array.isArray(user?.portalAccess) ? user.portalAccess : [];
  return portalAccess.some((access: any) => normalize(access?.portalName) === target);
}

/** Mirrors the backend OTP permission rule: non-hidden OTP permission in the requested portal. */
export function hasOtpPermission(
  permissions: readonly UserPermissionEntry[] | null | undefined,
  scope: OtpPermissionScope,
): boolean {
  return (permissions ?? []).some((permission) => {
    const portal = normalize(permission.portalName);
    const permissionText = normalize(
      `${permission.permissionKey} ${permission.permissionName} ${permission.permissionDescription ?? ""}`,
    );
    const access = normalize(permission.accessLevel);

    const isRequestPermission = scope !== "chat" || permissionText.includes("request");

    return (
      portal.includes(scope) &&
      permissionText.includes("otp") &&
      isRequestPermission &&
      (access === "read" || access === "write")
    );
  });
}

export function hasOtpAccess(
  permissions: readonly UserPermissionEntry[] | null | undefined,
  scope: Exclude<OtpPermissionScope, "chat">,
  user?: unknown,
): boolean {
  return hasPortalAccess(user, scope);
}

export function canRequestOtp(permissions: readonly UserPermissionEntry[] | null | undefined): boolean {
  return hasOtpPermission(permissions, "chat");
}
