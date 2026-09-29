import type { BackendUser, TwoFaSetupData } from "@/lib/api/client";

export interface TotpLoginPayload {
  email: string;
  password: string;
}

export interface TotpVerifyPayload {
  partialToken: string;
  code: string;
}

export interface TotpLoginSetupData {
  requiresSetup: true;
  partialToken: string;
  qrCode: string; // Base64 PNG image
  userName?: string;
  userID?: number;
  userId?: number;
}

export interface TotpLoginVerifyData {
  requiresTotp: true;
  partialToken: string;
  userName?: string;
  userID?: number;
  userId?: number;
}

export interface TotpLoginDirectData {
  token: string;
  user: BackendUser | any;
  permissions?: any[];
  qrCodeUrl?: string | null;
  secretKey?: string | null;
}

export type TotpLoginResponseData = TotpLoginSetupData | TotpLoginVerifyData | TotpLoginDirectData;

export interface TotpVerifyResponseData {
  token: string;
  user: BackendUser | any;
  permissions?: any[];
  qrCodeUrl?: string | null;
  secretKey?: string | null;
}
