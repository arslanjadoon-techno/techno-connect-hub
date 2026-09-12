import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./auth";
import { toast } from "sonner";

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const COUNTDOWN_SECONDS = 30; // 30 seconds countdown
const LAST_ACTIVITY_KEY = "app_last_active_timestamp";
const THROTTLE_INTERVAL_MS = 1000; // Throttle activity updates to once per second

export function useInactivityTimer() {
  const { user, logout } = useAuth();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const lastThrottleRef = useRef<number>(Date.now());

  // Helper to get last active timestamp
  const getLastActiveTime = useCallback((): number => {
    try {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return Date.now();
  }, []);

  // Helper to record activity
  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleRef.current > THROTTLE_INTERVAL_MS) {
      lastThrottleRef.current = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } catch {
        // ignore
      }
    }
  }, []);

  // Reset timer manually (e.g. click "Stay Logged In")
  const stayLoggedIn = useCallback(() => {
    const now = Date.now();
    lastThrottleRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // ignore
    }
    setIsWarningOpen(false);
    setSecondsLeft(COUNTDOWN_SECONDS);
    toast.success("Session extended. You're all set!", {
      duration: 3000,
    });
  }, []);

  // Logout immediately
  const logoutNow = useCallback(() => {
    setIsWarningOpen(false);
    try {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {
      // ignore
    }
    logout();
    toast.info("You have logged out of your session.");
  }, [logout]);

  // Listen to user interaction events across window
  useEffect(() => {
    if (!user) {
      setIsWarningOpen(false);
      return;
    }

    // Set initial timestamp on login/mount
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }

    const handleUserActivity = () => {
      // Only record activity if the warning modal is NOT active
      // (When warning modal is active, user must explicitly click 'Stay Logged In' or dismiss)
      if (!isWarningOpen) {
        recordActivity();
      }
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "wheel",
      "click",
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [user, isWarningOpen, recordActivity]);

  // Interval timer checking elapsed inactivity
  useEffect(() => {
    if (!user) {
      setIsWarningOpen(false);
      return;
    }

    const interval = setInterval(() => {
      const lastActive = getLastActiveTime();
      const elapsed = Date.now() - lastActive;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        const countdownElapsed = Math.floor((elapsed - INACTIVITY_TIMEOUT_MS) / 1000);
        const remaining = Math.max(0, COUNTDOWN_SECONDS - countdownElapsed);

        if (remaining <= 0) {
          // Timer finished -> auto logout
          setIsWarningOpen(false);
          try {
            localStorage.removeItem(LAST_ACTIVITY_KEY);
          } catch {
            // ignore
          }
          logout();
          toast.error("You have been logged out due to 30 minutes of inactivity.", {
            duration: 6000,
          });
        } else {
          setIsWarningOpen(true);
          setSecondsLeft(remaining);
        }
      } else {
        // Active again (e.g. from another tab or action)
        if (isWarningOpen) {
          setIsWarningOpen(false);
          setSecondsLeft(COUNTDOWN_SECONDS);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, isWarningOpen, getLastActiveTime, logout]);

  return {
    isWarningOpen,
    secondsLeft,
    totalCountdown: COUNTDOWN_SECONDS,
    stayLoggedIn,
    logoutNow,
  };
}
