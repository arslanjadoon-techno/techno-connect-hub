import { http } from "../http";
import { AUTH_PATHS, USER_API_PATHS } from "@/lib/config";
import type { BackendUser, TwoFaSetupData } from "@/lib/api/client";
import type { TotpLoginResponseData, TotpVerifyResponseData } from "./types";

export class AuthService {
  /**
   * Primary TOTP-based login replacing legacy login endpoint.
   * Handles 3 use cases:
   * 1. First-time registration -> requiresSetup = true with qrCode and partialToken
   * 2. Already registered -> requiresTotp = true with partialToken
   * 3. 2FA Bypassed -> direct token + user
   */
  totpLogin(email: string, password: string) {
    return http.post<TotpLoginResponseData>(AUTH_PATHS.totpLogin, { email, password }, false);
  }

  /**
   * Verifies the 6-digit TOTP code using partialToken.
   * Completes login and returns user session and JWT token.
   */
  totpVerify(partialToken: string, code: string) {
    return http.post<TotpVerifyResponseData>(AUTH_PATHS.totpVerify, { partialToken, code }, false);
  }

  /**
   * Login method alias for compatibility across the codebase.
   */
  login(email: string, password: string) {
    return this.totpLogin(email, password);
  }

  forgotPassword(email: string) {
    return http.post<null>(AUTH_PATHS.forgotPassword, { email }, false);
  }
  verifyOtp(email: string, otp: string) {
    return http.post<null>(AUTH_PATHS.verifyOtp, { email, otp }, false);
  }
  resetPassword(email: string, otp: string, newPassword: string, confirmPassword: string) {
    return http.post<null>(
      AUTH_PATHS.resetPassword,
      { email, otp, newPassword, confirmPassword },
      false,
    );
  }
  twoFaSetup(email: string) {
    return http.post<TwoFaSetupData>(AUTH_PATHS.twoFaSetup, { email }, false);
  }
  twoFaVerifyEnable(email: string, code: string) {
    return http.post<null>(AUTH_PATHS.twoFaVerifyEnable, { email, code }, false);
  }
  twoFaLoginVerify(email: string, code: string) {
    return http.post<{ token: string; user: BackendUser }>(
      AUTH_PATHS.twoFaLoginVerify,
      { email, code },
      false,
    );
  }

  /**
   * Resets 2FA for a user so that the QR code setup screen is presented on their next login.
   * Endpoint: PUT /api/users/reset-2fa
   */
  reset2Fa(email: string) {
    return http.put<null>(USER_API_PATHS.reset2Fa, { email }, false);
  }
}

export const authService = new AuthService();
