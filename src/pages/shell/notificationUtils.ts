import { CHAT_APP_BASE_PATH, getChatRoute } from "../team-chat/chatRoutes";

export const getNotificationLink = (
  type?: string,
  requestId?: string | number,
): string | undefined => {
  const normalizedType = String(type || "").toLowerCase();
  if (normalizedType === "otp_manager") return "/otp/manager";
  if (normalizedType === "otp_backoffice_pending") return "/otp/backoffice";
  if (normalizedType === "otp") return CHAT_APP_BASE_PATH;
  if (normalizedType.startsWith("otp:")) {
    return getChatRoute(normalizedType.slice("otp:".length));
  }

  if (
    normalizedType.startsWith("chat_message:") ||
    normalizedType.startsWith("chat_reaction:")
  ) {
    return getChatRoute(normalizedType.slice(normalizedType.indexOf(":") + 1));
  }

  return requestId ? `/expenses/requests/${encodeURIComponent(String(requestId))}` : undefined;
};
