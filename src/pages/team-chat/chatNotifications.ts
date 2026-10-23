const NOTIFICATIONS_ENABLED_KEY = "chat_notifications_enabled";
let notificationAudioContext: AudioContext | null = null;

type ChatNotificationOptions = {
  title?: string;
  body?: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
  url?: string;
  preserveCall?: boolean;
  requireInteraction?: boolean;
};

const hasNotificationApi = () => typeof window !== "undefined" && "Notification" in window;

export const areChatNotificationsEnabled = () => {
  if (!hasNotificationApi()) return false;

  try {
    const stored = window.localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    // If the user has never set an app preference, follow the browser permission.
    // An explicit "false" remains respected as an intentional opt-out.
    if (stored === null) return Notification.permission === "granted";
    return stored === "true";
  } catch (error) {
    console.warn("[Chat notifications] Could not read notification preference", error);
    return Notification.permission === "granted";
  }
};

export const setChatNotificationsEnabled = (enabled: boolean) => {
  try {
    window.localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.warn("[Chat notifications] Could not save notification preference", error);
  }
};

export const requestChatNotificationPermission = async () => {
  if (!hasNotificationApi()) return "unsupported";

  if (Notification.permission === "granted") {
    setChatNotificationsEnabled(true);
    return "granted";
  }

  if (Notification.permission === "denied") return "denied";

  const permission = await Notification.requestPermission();
  setChatNotificationsEnabled(permission === "granted");
  return permission;
};

export const getNotificationSupport = () => {
  if (!hasNotificationApi()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "granted";
  return "default";
};

const createWindowNotification = ({
  title,
  body,
  icon,
  tag,
  onClick,
  url,
  preserveCall,
  requireInteraction,
}: ChatNotificationOptions) => {
  try {
    const notification = new Notification(title || "New message", {
      body: body || "",
      icon: icon || undefined,
      tag: tag || undefined,
      renotify: true,
      requireInteraction: Boolean(requireInteraction),
      data: { url: url || "/", preserveCall: Boolean(preserveCall) },
      silent: false,
    } as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };

    notification.onerror = (event) => {
      console.error("[Chat notifications] Browser notification error", event);
    };
    return notification;
  } catch (error) {
    console.error("[Chat notifications] Failed to create desktop notification", error);
    return null;
  }
};

export const showChatNotification = ({
  title,
  body,
  icon,
  tag,
  onClick,
  url,
  preserveCall = false,
  requireInteraction = false,
}: ChatNotificationOptions) => {
  if (!hasNotificationApi()) {
    console.warn("[Chat notifications] Skipped: Notification API is unsupported");
    return null;
  }
  if (Notification.permission !== "granted") {
    console.warn("[Chat notifications] Skipped: browser permission is", Notification.permission);
    return null;
  }
  if (!areChatNotificationsEnabled()) {
    console.warn(
      "[Chat notifications] Skipped: app preference is disabled. Set chat_notifications_enabled=true or enable it in chat settings.",
    );
    return null;
  }

  // Keep incoming-call alerts on the page's Notification object to avoid
  // reloading the client and interrupting an active WebRTC call.
  if (!preserveCall && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
    return navigator.serviceWorker.ready
      .then(async (registration) => {
        try {
          await registration.showNotification(title || "New message", {
            body: body || "",
            icon: icon || undefined,
            tag: tag || undefined,
            renotify: true,
            requireInteraction,
            data: { url: url || "/", preserveCall },
            silent: false,
            vibrate: [120, 60, 120],
          } as NotificationOptions);
          console.debug("[Chat notifications] Desktop notification submitted to service worker", {
            title,
            tag,
          });
          return registration;
        } catch (error) {
          console.warn(
            "[Chat notifications] Service-worker notification failed; trying page notification",
            error,
          );
          return createWindowNotification({
            title,
            body,
            icon,
            tag,
            onClick,
            url,
            preserveCall,
            requireInteraction,
          });
        }
      })
      .catch((error) => {
        console.warn(
          "[Chat notifications] Service worker unavailable; trying page notification",
          error,
        );
        return createWindowNotification({
          title,
          body,
          icon,
          tag,
          onClick,
          url,
          preserveCall,
          requireInteraction,
        });
      });
  }

  return createWindowNotification({
    title,
    body,
    icon,
    tag,
    onClick,
    url,
    preserveCall,
    requireInteraction,
  });
};

export const playMessageNotificationSound = () => {
  if (!areChatNotificationsEnabled()) return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    notificationAudioContext ||= new AudioContextClass();
    const context = notificationAudioContext;
    void context.resume().catch(() => undefined);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, start);
    oscillator.frequency.exponentialRampToValueAtTime(660, start + 0.12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  } catch (error) {
    console.warn("[Chat notifications] Notification audio unavailable", error);
  }
};

export const playCallNotificationSound = () => {
  if (!areChatNotificationsEnabled()) return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    notificationAudioContext ||= new AudioContextClass();
    const context = notificationAudioContext;
    void context.resume().catch(() => undefined);

    [0, 0.28, 0.56].forEach((offset) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + offset;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1046, start);
      oscillator.frequency.exponentialRampToValueAtTime(784, start + 0.18);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.24);
    });
  } catch (error) {
    console.warn("[Chat notifications] Call notification audio unavailable", error);
  }
};
