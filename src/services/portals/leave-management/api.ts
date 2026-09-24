import { API_BASE_URL } from "@/lib/config";

export const LEAVE_API_BASE_URL =
  (import.meta.env.VITE_LEAVE_API_PROD_URL as string) ||
  (import.meta.env.VITE_API_DEV_URL as string) ||
  "";
