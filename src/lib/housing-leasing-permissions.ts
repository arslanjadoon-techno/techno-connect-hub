import { useMemo } from "react";
import { useAuth } from "./auth";

export type AccessLevel = "hide" | "read" | "write";

/**
 * Looks up the current user's access level for a permission key (e.g.
 * "housingleasing.edit_general_information"). Mirrors leasing-permissions.ts
 * exactly - a key that's simply absent from the returned list means the
 * permission doesn't apply to this user at all, which defaults to "hide".
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
 * Maps each Housing Leasing route/nav URL to the "show_*" permission key that
 * gates it. Shared by the sidebar (hides the nav link) and the route guards
 * (blocks direct navigation) so there's one place to update if a page moves.
 * Mirrors LEASING_PAGE_PERMISSION_KEYS.
 */
export const HOUSING_LEASING_PAGE_PERMISSION_KEYS: Record<string, string> = {
  "/housing-leasing/dashboard": "housingleasing.show_leasing_dashboard",
  "/housing-leasing/manage-properties": "housingleasing.show_manage_properties",
  "/housing-leasing/manage-housing-leasing": "housingleasing.show_manage_leasing",
  "/housing-leasing/manage-rent-payment-list": "housingleasing.show_rentpayment_list",
  "/housing-leasing/manage-rent-payment-agreement": "housingleasing.show_rent_agreement",
  "/housing-leasing/rent-agreement-to-monthly-rent": "housingleasing.show_rent_agreement_table",
  "/housing-leasing/lease-monitor/next-month-rent-change": "housingleasing.show_lease_monitor",
  "/housing-leasing/lease-monitor/lease-expiry-breakdown": "housingleasing.show_lease_monitor",
  "/housing-leasing/reports": "housingleasing.show_leasing_reports",
  "/housing-leasing/bulk-upload/rent": "housingleasing.show_leasing_bulk_upload",
  "/housing-leasing/bulk-upload/accounting": "housingleasing.show_leasing_bulk_upload",
  "/housing-leasing/bulk-upload/lease-details": "housingleasing.show_leasing_bulk_upload",
};

/** The Housing Leasing Detail drill-down isn't in the map above (it's not a
 * nav/sidebar item - it's reached by clicking a row), but routes.tsx still
 * gates it. */
export const HOUSING_LEASING_DETAIL_PERMISSION_KEY = "housingleasing.show_leasing_detail";

export const HOUSING_LEASING_EXPORT_BUTTON_PERMISSION_KEY = "housingleasing.show_export_button";
