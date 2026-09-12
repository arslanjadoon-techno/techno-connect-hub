import { API_BASE_URL } from "@/lib/config";

export const LEAVE_API_BASE_URL =
  (import.meta.env.VITE_LEAVE_API_URL as string) ||
  (API_BASE_URL && API_BASE_URL !== "N/A" ? API_BASE_URL : "") ||
  "https://9t47yj4np0.execute-api.us-west-2.amazonaws.com/Prod";
