import { AUTH_PATHS, CHAT_API_BASE_URL } from "@/lib/config";
import { getStoredUser, getToken } from "@/lib/api/client";

// ==================================================================
//  Types
// ==================================================================

type ChatId = string | number;
type ChatParams = Record<string, unknown>;
type ChatPayload = Record<string, unknown>;
type UserIdList = Array<string | number>;

type RequestConfig = {
  headers?: Record<string, string>;
  params?: ChatParams;
  /** Set false to skip the in-flight dedupe cache. Useful for polling. */
  dedupe?: boolean;
};

export type ChatNotePayload = {
  title: string;
  content: string;
  isPinned?: boolean;
  isArchived?: boolean;
};

interface LoginCredentials {
  login?: string;
  email?: string;
  password: string;
}

// ==================================================================
//  Token cache — avoids hitting localStorage on every request
// ==================================================================

let cachedToken: string | null | undefined;

const readToken = (): string | undefined => {
  if (cachedToken === undefined) {
    cachedToken =
      getToken()
        ?.replace(/^Bearer\s+/i, "")
        .trim() ?? null;
  }
  return cachedToken ?? undefined;
};

/**
 * Call this on login / logout / 401 to force the next request to
 * re-read the token from storage.
 */
export const invalidateChatTokenCache = () => {
  cachedToken = undefined;
};

// ==================================================================
//  In-flight request dedupe — merges identical concurrent GETs
// ==================================================================

const inFlight = new Map<string, Promise<unknown>>();

const buildDedupeKey = (method: string, path: string, params?: ChatParams): string | null => {
  if (method !== "GET") return null;
  const sortedParams = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    : [];
  return `${method}:${path}:${JSON.stringify(sortedParams)}`;
};

// ==================================================================
//  Request core
// ==================================================================

const apiRequest = async <T>(
  path: string,
  method: string,
  body?: unknown,
  config: RequestConfig = {},
): Promise<T> => {
  const dedupeKey = config.dedupe !== false ? buildDedupeKey(method, path, config.params) : null;

  if (dedupeKey && inFlight.has(dedupeKey)) {
    return inFlight.get(dedupeKey) as Promise<T>;
  }

  const run = async (): Promise<T> => {
    const url = new URL(`${CHAT_API_BASE_URL}${path}`);
    if (config.params) {
      for (const [key, value] of Object.entries(config.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const token = readToken();
    const isFormData = body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { token } : {}),
      ...(config.headers ?? {}),
    };

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });

    // 204 or empty body → no JSON to parse
    if (response.status === 204) {
      return undefined as T;
    }

    // Always read as text first; JSON.parse only if there's content
    const text = await response.text();
    let payload: any = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const message =
        payload?.error ??
        payload?.message ??
        (response.status === 429
          ? "Too many chat requests. Please wait a moment and try again."
          : `Chat request failed (${response.status})`);

      const error = new Error(message) as Error & {
        status?: number;
        code?: string;
        details?: unknown;
      };
      error.status = response.status;
      error.code = payload?.code;
      error.details = payload?.details;
      throw error;
    }

    return payload as T;
  };

  const promise = run();

  if (dedupeKey) {
    inFlight.set(dedupeKey, promise);
    // Clean up without creating a second rejected promise. Calling finally()
    // here without handling its returned promise causes an extra
    // "Uncaught (in promise)" in the browser when the request fails.
    promise.then(
      () => inFlight.delete(dedupeKey),
      () => inFlight.delete(dedupeKey),
    );
  }

  return promise;
};

// ==================================================================
//  HTTP verbs
// ==================================================================

const api = {
  get: <T = unknown>(path: string, config?: RequestConfig) =>
    apiRequest<T>(path, "GET", undefined, config),
  post: <T = unknown>(path: string, body?: unknown, config?: RequestConfig) =>
    apiRequest<T>(path, "POST", body, config),
  put: <T = unknown>(path: string, body?: unknown, config?: RequestConfig) =>
    apiRequest<T>(path, "PUT", body, config),
  patch: <T = unknown>(path: string, body?: unknown, config?: RequestConfig) =>
    apiRequest<T>(path, "PATCH", body, config),
  delete: <T = unknown>(path: string, config?: RequestConfig) =>
    apiRequest<T>(path, "DELETE", undefined, config),
};

// ==================================================================
//  Shared helpers
// ==================================================================

const CHAT_HEADERS: RequestConfig = {
  headers: {
    // Backend chat controllers use X-App-Name to select the chat tenant.
    "x-app-name": "chat",
  },
};

const chatConfig = (params?: ChatParams): RequestConfig => ({
  ...CHAT_HEADERS,
  params,
});

// ==================================================================
//  Auth
// ==================================================================

export const loginChatService = ({ login, email, password }: LoginCredentials) =>
  api.post(AUTH_PATHS.login, { email: email || login, password });

// ==================================================================
//  Users / status
// ==================================================================

export const getChatStatusService = () => api.get("/api/v1/chat/users/me", CHAT_HEADERS);

export const getChatUsersService = (params: ChatParams = {}) =>
  api.get("/api/v1/chat/users", chatConfig({ limit: 50, ...params }));

export const getChatUserProfileService = (userId: ChatId) =>
  api.get(`/api/v1/chat/users/${encodeURIComponent(userId)}`, CHAT_HEADERS);

export const updateChatStatusService = (presence: string) =>
  api.patch("/api/v1/chat/users/me/presence", { presence }, CHAT_HEADERS);

export const updateChatAvatarService = (file: File) => {
  const formData = new FormData();
  formData.append("file", file, file.name || "avatar");
  return api.post("/api/v1/chat/users/me/avatar", formData, CHAT_HEADERS);
};

export const updateChatAvatarUrlService = (avatarUrl: string) =>
  api.patch("/api/v1/chat/users/me/avatar", { avatarUrl }, CHAT_HEADERS);

// ==================================================================
//  Settings
// ==================================================================

export const getChatSettingsService = () =>
  api.get("/api/v1/chat/preferences/settings", CHAT_HEADERS);

export const updateChatSettingsService = (settings: ChatPayload) =>
  api.put("/api/v1/chat/preferences/settings", settings, CHAT_HEADERS);

// ==================================================================
//  Notes
// ==================================================================

export const getNotes = (includeArchived = false) =>
  api.get("/api/v1/notes", chatConfig({ includeArchived }));

export const getNote = (id: ChatId) =>
  api.get(`/api/v1/notes/${encodeURIComponent(id)}`, CHAT_HEADERS);

export const createNote = (note: ChatNotePayload) => api.post("/api/v1/notes", note, CHAT_HEADERS);

export const updateNote = (id: ChatId, note: ChatNotePayload) =>
  api.put(`/api/v1/notes/${encodeURIComponent(id)}`, note, CHAT_HEADERS);

export const deleteNote = (id: ChatId) =>
  api.delete(`/api/v1/notes/${encodeURIComponent(id)}`, CHAT_HEADERS);

// ==================================================================
//  Conversations
// ==================================================================

export const getChatConversationsService = (params: ChatParams = {}) =>
  api.get("/api/v1/chat", chatConfig(params));

export const openDirectChatService = (userId: ChatId) =>
  api.post("/api/v1/chat/direct", { userId: String(userId || "") }, CHAT_HEADERS);

// ==================================================================
//  Groups
// ==================================================================

export const createGroupChatService = ({
  title,
  userIds,
}: {
  title: string;
  userIds: UserIdList;
}) => api.post("/api/v1/chat/groups", { title, userIds }, CHAT_HEADERS);

export const addGroupMembersService = (chatId: ChatId, userIds: UserIdList) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/members`, { userIds }, CHAT_HEADERS);

export const removeGroupMemberService = (chatId: ChatId, userId: ChatId) =>
  api.delete(
    `/api/v1/chat/${encodeURIComponent(chatId)}/members/${encodeURIComponent(userId)}`,
    CHAT_HEADERS,
  );

export const leaveGroupConversationService = (chatId: ChatId) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/leave`, {}, CHAT_HEADERS);

export const deleteGroupConversationService = (chatId: ChatId) =>
  api.delete(`/api/v1/chat/${encodeURIComponent(chatId)}`, CHAT_HEADERS);

export const transferGroupOwnershipService = (chatId: ChatId, userId: ChatId) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/transfer-owner`, { userId }, CHAT_HEADERS);

// ==================================================================
//  Messages
// ==================================================================

export const getChatMessagesService = (chatId: ChatId, params: ChatParams = {}) =>
  api.get(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages`,
    chatConfig({ limit: 50, ...params }),
  );

export const getChatMessageInfoService = (chatId: ChatId, messageId: ChatId) =>
  api.get(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/info`,
    CHAT_HEADERS,
  );

export const clearChatHistoryService = (chatId: ChatId) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/clear-history`, {}, CHAT_HEADERS);

export const sendConversationMessageService = (
  chatId: ChatId,
  text: string,
  options: ChatPayload = {},
) =>
  api.post(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages`,
    { text, ...options },
    CHAT_HEADERS,
  );

export const editConversationMessageService = (chatId: ChatId, messageId: ChatId, text: string) =>
  api.patch(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
    { text },
    CHAT_HEADERS,
  );

export const deleteConversationMessageService = (chatId: ChatId, messageId: ChatId) =>
  api.delete(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
    CHAT_HEADERS,
  );

export const pinConversationMessageService = (chatId: ChatId, messageId: ChatId, pinned: boolean) =>
  api.patch(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/pin`,
    { pinned },
    CHAT_HEADERS,
  );

export const searchChatMessagesService = (params: ChatParams = {}) =>
  api.get("/api/v1/chat/messages/search", chatConfig(params));

export const sendDirectMessageService = async (
  userId: ChatId,
  text: string,
  options: ChatPayload = {},
) => {
  const messageResponse: any = await api.post(
    `/api/v1/chat/direct/${encodeURIComponent(userId)}/messages`,
    { text, ...options },
    CHAT_HEADERS,
  );

  const result = messageResponse?.data?.data ?? messageResponse?.data ?? {};
  const sentMessage = result.SentMessage ?? result.sentMessage ?? result.message ?? result;
  const chatId =
    result.ChatId ??
    result.chatId ??
    result.chat_id ??
    result.conversationId ??
    result.conversation_id;

  if (!chatId) throw new Error("Unable to create direct conversation");

  return {
    ...messageResponse,
    data: {
      ...messageResponse.data,
      data: {
        ...(sentMessage || {}),
        chatId,
        conversationId: chatId,
        chat: result.Chat ?? result.chat,
      },
    },
  };
};

// ==================================================================
//  Files
// ==================================================================

export const shareConversationFileService = (chatId: ChatId, file: File) => {
  const formData = new FormData();
  formData.append("file", file, file.name || "document");
  return api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/files`, formData, CHAT_HEADERS);
};

// ==================================================================
//  Read receipts
// ==================================================================

export const markConversationReadService = (chatId: ChatId) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/read`, {}, CHAT_HEADERS);

// ==================================================================
//  Reactions
// ==================================================================

export const addMessageReactionService = (chatId: ChatId, messageId: ChatId, emoji: string) =>
  api.post(
    `/api/v1/chat/${encodeURIComponent(
      chatId,
    )}/messages/${encodeURIComponent(messageId)}/reactions`,
    { emoji },
    CHAT_HEADERS,
  );

export const removeMessageReactionService = (chatId: ChatId, messageId: ChatId, emoji: string) =>
  api.delete(
    `/api/v1/chat/${encodeURIComponent(
      chatId,
    )}/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(emoji)}`,
    CHAT_HEADERS,
  );

// ==================================================================
//  Calls
// ==================================================================

export const startConversationCallService = (chatId: ChatId, type: string) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/calls`, { type }, CHAT_HEADERS);

export const startCallService = (payload: {
  conversationId?: ChatId;
  userId?: ChatId;
  type: string;
}) => api.post("/api/v1/chat/calls/start", payload, CHAT_HEADERS);

export const getActiveConversationCallsService = () =>
  api.get("/api/v1/chat/calls/active", CHAT_HEADERS);

export const endConversationCallService = (chatId: ChatId, callId: ChatId) =>
  api.post(
    `/api/v1/chat/${encodeURIComponent(chatId)}/calls/${encodeURIComponent(callId)}/end`,
    {},
    CHAT_HEADERS,
  );

export const respondConversationCallService = (chatId: ChatId, callId: ChatId, action: string) =>
  api.post(
    `/api/v1/chat/${encodeURIComponent(chatId)}/calls/${encodeURIComponent(callId)}/respond`,
    { action },
    CHAT_HEADERS,
  );
