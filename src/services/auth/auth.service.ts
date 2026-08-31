import { http } from "../http";
import { AUTH_PATHS } from "@/lib/config";
import type { BackendUser, TwoFaSetupData } from "@/lib/api/client";

export class AuthService {
  login(email: string, password: string) {
    return http.post<{
      token?: string;
      user?: BackendUser;
      requires2FA?: boolean;
      twoFactorRequired?: boolean;
    }>(AUTH_PATHS.login, { email, password }, false);
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
}

export const authService = new AuthService();
