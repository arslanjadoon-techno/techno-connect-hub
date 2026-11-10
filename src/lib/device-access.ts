/**
 * Static access control for the Add Devices page.
 * Only the specified administrative emails are granted access.
 */

export const ALLOWED_ADD_DEVICES_EMAILS: readonly string[] = [
  "admin@techno.com",
  "ahsan.khan@techno-communications.com",
];

/**
 * Checks whether the specified user email is authorized to access the Add Devices page.
 * Comparison is case-insensitive and trims leading/trailing whitespace.
 */
export function canAccessAddDevices(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_ADD_DEVICES_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
}
