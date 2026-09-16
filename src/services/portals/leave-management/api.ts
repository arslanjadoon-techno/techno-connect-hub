import { API_BASE_URL } from "@/lib/config";

export const LEAVE_API_BASE_URL =
  (import.meta.env.VITE_API_DEV_URL as string) ||
  (import.meta.env.VITE_LEAVE_API_PROD_URL as string) ||
  "https://9t47yj4np0.execute-api.us-west-2.amazonaws.com/Prod";
