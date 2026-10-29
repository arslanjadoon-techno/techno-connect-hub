type RoleSource = {
  roleName?: unknown;
  role?: unknown;
  portalAccess?: Array<{ roleName?: unknown }>;
};

const normalizeRole = (value: unknown) => String(value ?? "").toLowerCase().replace(/[\s_-]/g, "");

/** Returns true only when the authenticated user has the Rep or Trainer role. */
export function canRequestOtp(user: RoleSource | null | undefined): boolean {
  if (!user) return false;

  const portalRoles = Array.isArray(user.portalAccess)
    ? user.portalAccess.map((entry) => entry?.roleName)
    : [];
  const directRoles = [
    user.roleName,
    typeof user.role === "string" ? user.role : (user.role as { name?: unknown } | null)?.name,
  ];

  return [...portalRoles, ...directRoles].some((role) => {
    const normalized = normalizeRole(role);
    return normalized === "rep" || normalized === "trainer";
  });
}
