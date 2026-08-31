import { useEffect } from "react";

/**
 * While mounted, forces the auth screens (login / forgot / reset / OTP / 2FA)
 * to use the default Indigo palette. Restores the user's chosen palette on unmount.
 *
 * Implementation: toggles a `.auth-standard` class on <html>, which overrides
 * the relevant CSS variables (see src/styles.css).
 */
export function useAuthThemeReset() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("auth-standard");
    return () => {
      html.classList.remove("auth-standard");
    };
  }, []);
}
