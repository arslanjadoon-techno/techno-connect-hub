export type PermissionAccessLevel = "hide" | "read" | "write";
export type UserAccessMap = Record<string, PermissionAccessLevel>;

export interface PermissionItem {
  id: string;
  portalId?: number | string;
  portalName: string;
  name: string;
  key: string;
  description?: string;
  createdAt: string;
  isCustom?: boolean;
}

export const SEEDED_PERMISSIONS: PermissionItem[] = [
  // Leasing Portal
  {
    id: "perm-leasing-1",
    portalName: "Leasing",
    name: "Upload Statement Button",
    key: "leasing_upload_statement_button",
    description: "Allows uploading monthly lease statement documents directly.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-leasing-2",
    portalName: "Leasing",
    name: "View Dashboard",
    key: "leasing_view_dashboard",
    description: "Access leasing portal dashboard metrics and overview.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-leasing-3",
    portalName: "Leasing",
    name: "Export Contracts",
    key: "leasing_export_contracts",
    description: "Download CSV / PDF reports of current lease contracts.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-leasing-4",
    portalName: "Leasing",
    name: "Approve Renewal",
    key: "leasing_approve_renewal",
    description: "Review and grant authorization for lease renewal requests.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },

  // Commission Portal
  {
    id: "perm-comm-1",
    portalName: "Commission",
    name: "View Dashboard",
    key: "commission_view_dashboard",
    description: "Access executive commission performance metrics.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-comm-2",
    portalName: "Commission",
    name: "View My Commission",
    key: "commission_view_my_commission",
    description: "View personal individual commission earnings statements.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-comm-3",
    portalName: "Commission",
    name: "View All Markets",
    key: "commission_view_all_markets",
    description: "View commission breakdown across all territorial markets.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-comm-4",
    portalName: "Commission",
    name: "Export Commission CSV",
    key: "commission_export_csv",
    description: "Export full monthly commission ledger to Excel / CSV.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },

  // Ticketing Portal
  {
    id: "perm-ticketing-1",
    portalName: "Ticketing",
    name: "Create Ticket",
    key: "ticketing_create_ticket",
    description: "Submit new internal support and incident tickets.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-ticketing-2",
    portalName: "Ticketing",
    name: "Assign Ticket",
    key: "ticketing_assign_ticket",
    description: "Reassign open tickets to specific team members or departments.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-ticketing-3",
    portalName: "Ticketing",
    name: "External Team Access",
    key: "ticketing_external_team_access",
    description: "Manage vendors, subcontractors, and external repair teams.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },

  // Leave Portal
  {
    id: "perm-leave-1",
    portalName: "Leave",
    name: "Request Leave",
    key: "leave_request_leave",
    description: "Submit employee leave requests (vacation, sick, casual).",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-leave-2",
    portalName: "Leave",
    name: "Approve Leave",
    key: "leave_approve_leave",
    description: "Grant or decline pending subordinate leave requests.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-leave-3",
    portalName: "Leave",
    name: "View Team Balances",
    key: "leave_view_team_balances",
    description: "Inspect remaining quota balances across the entire team.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },

  // Ranker Portal
  {
    id: "perm-ranker-1",
    portalName: "Ranker",
    name: "View Standings",
    key: "ranker_view_standings",
    description: "Access store and representative performance standings.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-ranker-2",
    portalName: "Ranker",
    name: "Edit Target Quotas",
    key: "ranker_edit_target_quotas",
    description: "Configure sales targets and achievement multipliers.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },

  // Scheduling Portal
  {
    id: "perm-sched-1",
    portalName: "Scheduling",
    name: "View Shift Schedule",
    key: "scheduling_view_shift_schedule",
    description: "Check weekly store roster and assigned coverage hours.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-sched-2",
    portalName: "Scheduling",
    name: "Publish Rosters",
    key: "scheduling_publish_rosters",
    description: "Create, modify, and publish store work shifts.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },

  // User Manager Portal
  {
    id: "perm-admin-1",
    portalName: "User Manager",
    name: "Create User",
    key: "user_manager_create_user",
    description: "Register new employee accounts and configure initial credentials.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "perm-admin-2",
    portalName: "User Manager",
    name: "Deactivate User",
    key: "user_manager_deactivate_user",
    description: "Toggle active account status or revoke credentials.",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
];

const STORAGE_CUSTOM_KEY = "mis_custom_permissions";
const STORAGE_USER_PERMS_PREFIX = "mis_user_perms_";

/**
 * Transforms portal name & permission name into the standardized snake_case key.
 * Example: "Leasing" + "Upload Statement Button" -> "leasing_upload_statement_button"
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
  if (!nameSlug) return `${portalSlug}_`;
  return `${portalSlug}_${nameSlug}`;
}

export const permissionsService = {
  /**
   * Returns all available permissions: seeded defaults + custom user-created items.
   */
  getAll(): PermissionItem[] {
    let custom: PermissionItem[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) custom = parsed;
      }
    } catch (e) {
      console.error("Failed reading custom permissions:", e);
    }
    return [...custom, ...SEEDED_PERMISSIONS];
  },

  /**
   * Save a newly created permission.
   */
  create(payload: {
    portalName: string;
    portalId?: number | string;
    name: string;
    key: string;
    description?: string;
  }): PermissionItem {
    const newItem: PermissionItem = {
      id: `perm-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      portalName: payload.portalName.trim(),
      portalId: payload.portalId,
      name: payload.name.trim(),
      key: payload.key.trim(),
      description: payload.description?.trim() || "",
      createdAt: new Date().toISOString(),
      isCustom: true,
    };

    try {
      const current = this.getCustomOnly();
      const updated = [newItem, ...current];
      localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed saving permission:", e);
    }

    return newItem;
  },

  getCustomOnly(): PermissionItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [];
  },

  deleteCustom(id: string): boolean {
    try {
      const current = this.getCustomOnly();
      const updated = current.filter((p) => p.id !== id);
      localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Retrieves access level map for a specific user ID.
   * Format: { [permKey: string]: "hide" | "read" | "write" }
   */
  getUserAccessLevels(userId: number | string): UserAccessMap {
    try {
      const raw = localStorage.getItem(`${STORAGE_USER_PERMS_PREFIX}${userId}_levels`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as UserAccessMap;
        }
      }

      // Check legacy format fallback
      const legacyRaw = localStorage.getItem(`${STORAGE_USER_PERMS_PREFIX}${userId}`);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          const mapped: UserAccessMap = {};
          legacyParsed.forEach((key: string) => {
            mapped[key] = "write";
          });
          return mapped;
        }
      }
    } catch {
      /* ignore */
    }

    // Default fallback access levels
    return {
      commission_view_my_commission: "read",
      ticketing_create_ticket: "write",
      leave_request_leave: "write",
    };
  },

  /**
   * Persists access level map for a specific user ID.
   */
  saveUserAccessLevels(userId: number | string, accessMap: UserAccessMap): void {
    try {
      localStorage.setItem(
        `${STORAGE_USER_PERMS_PREFIX}${userId}_levels`,
        JSON.stringify(accessMap),
      );

      // Keep legacy array updated with active (non-hide) permissions
      const activeKeys = Object.entries(accessMap)
        .filter(([, level]) => level === "read" || level === "write")
        .map(([k]) => k);
      localStorage.setItem(`${STORAGE_USER_PERMS_PREFIX}${userId}`, JSON.stringify(activeKeys));
    } catch (e) {
      console.error("Failed to store user access levels:", e);
    }
  },

  /**
   * Retrieves array of assigned permission keys for a specific user ID.
   */
  getUserPermissions(userId: number | string): string[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_USER_PERMS_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
    // Default fallback: assign some initial permissions based on role / general permissions
    return ["commission_view_my_commission", "ticketing_create_ticket", "leave_request_leave"];
  },

  /**
   * Persists assigned permission keys for a specific user ID.
   */
  saveUserPermissions(userId: number | string, permissionKeys: string[]): void {
    try {
      localStorage.setItem(`${STORAGE_USER_PERMS_PREFIX}${userId}`, JSON.stringify(permissionKeys));
    } catch (e) {
      console.error("Failed to store user permissions:", e);
    }
  },
};
