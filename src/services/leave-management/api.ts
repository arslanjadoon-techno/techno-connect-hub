import { API_BASE_URL } from "@/lib/config";

export const LEAVE_API_BASE_URL =
  (import.meta.env.VITE_LEAVE_API_URL as string) ||
  (API_BASE_URL !== "N/A" ? API_BASE_URL : "") ||
  "";
