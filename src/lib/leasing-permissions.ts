import { useMemo } from "react";
import { useAuth } from "./auth";

export type AccessLevel = "hide" | "read" | "write";

/**
 * Looks up the current user's access level for a permission key (e.g.
 * "leasing.edit_general_information"). The backend already resolves
 * "never explicitly assigned" to that permission's own default (write for
 * Leasing, hide elsewhere) via Permission.DefaultAccessLevel - a key that's
 * simply absent from the returned list means the permission doesn't apply to
 * this user at all (e.g. no access to that portal), which defaults to "hide".
 */
export function usePermission(key: string): AccessLevel {
  const { permissions } = useAuth();
  return useMemo(() => {
    const entry = permissions.find((p) => p.permissionKey === key);
    return entry?.accessLevel ?? "hide";
  }, [permissions, key]);
}

/** True unless the key resolves to "hide". */
export function useCanShow(key: string): boolean {
  return usePermission(key) !== "hide";
}

/** True only when the key resolves to "write". */
export function useCanWrite(key: string): boolean {
  return usePermission(key) === "write";
}

/**
 * Maps each Leasing route/nav URL to the "show_*" permission key that gates
 * it. Shared by the sidebar (hides the nav link) and the route guards (blocks
 * direct navigation) so there's one place to update if a page moves.
 */
export const LEASING_PAGE_PERMISSION_KEYS: Record<string, string> = {
  "/leasing/dashboard": "leasing.show_leasing_dashboard",
  "/leasing/leasing-view": "leasing.show_leasing_view",
  "/leasing/manage-leasing": "leasing.show_manage_leasing",
  "/leasing/manage-rent-payment-list": "leasing.show_rentpayment_list",
  "/leasing/manage-rent-payment-agreement": "leasing.show_rent_agreement",
  "/leasing/rent-agreement-to-monthly-rent": "leasing.show_rent_agreement_table",
  "/leasing/lease-monitor/next-month-rent-change": "leasing.show_lease_monitor",
  "/leasing/lease-monitor/lease-expiry-breakdown": "leasing.show_lease_monitor",
  "/leasing/reports": "leasing.show_leasing_reports",
  "/leasing/bulk-upload/rent": "leasing.show_leasing_bulk_upload",
  "/leasing/bulk-upload/accounting": "leasing.show_leasing_bulk_upload",
  "/leasing/bulk-upload/lease-details": "leasing.show_leasing_bulk_upload",
};

/** The Leasing Detail drill-down isn't in the map above (it's not a nav/sidebar
 * item - it's reached by clicking a row), but routes.tsx still gates it. */
export const LEASING_DETAIL_PERMISSION_KEY = "leasing.show_leasing_detail";

export const LEASING_EXPORT_BUTTON_PERMISSION_KEY = "leasing.show_export_button";
