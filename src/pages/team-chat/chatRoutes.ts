/** Shared route base for the Team Chat feature. */
export const CHAT_APP_BASE_PATH = "/chat";

/** Build a chat route from the persisted conversation identifier. */
export const getChatRoute = (conversationId?: string | number | null): string => {
  const normalizedId = String(conversationId ?? "").trim();
  return normalizedId
    ? `${CHAT_APP_BASE_PATH}/${encodeURIComponent(normalizedId)}`
    : CHAT_APP_BASE_PATH;
};
