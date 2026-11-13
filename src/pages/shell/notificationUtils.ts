export const getNotificationLink = (
  type?: string,
  requestId?: string | number,
): string | undefined => {
  const normalizedType = String(type || "").toLowerCase();
  if (normalizedType === "otp_manager") return "/otp/manager";
  if (normalizedType === "otp_backoffice_pending") return "/otp/backoffice";
  if (normalizedType === "otp") return "/chat";
  if (normalizedType.startsWith("otp:")) {
    return `/chat/${encodeURIComponent(normalizedType.slice("otp:".length))}`;
  }

  if (
    normalizedType.startsWith("chat_message:") ||
    normalizedType.startsWith("chat_reaction:")
  ) {
    return `/chat/${encodeURIComponent(normalizedType.slice(normalizedType.indexOf(":") + 1))}`;
  }

  return requestId ? `/expenses/requests/${encodeURIComponent(String(requestId))}` : undefined;
};
