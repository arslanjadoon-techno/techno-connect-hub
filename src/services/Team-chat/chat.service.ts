import { AUTH_PATHS, CHAT_API_BASE_URL } from "@/lib/config";
import { getStoredUser, getToken } from "@/lib/api/client";
type RequestConfig = {
  headers?: Record<string, string>;
  params?: ChatParams;
};

const apiRequest = async <T>(
  path: string,
  method: string,
  body?: unknown,
  config: RequestConfig = {},
): Promise<T> => {
  const url = new URL(`${CHAT_API_BASE_URL}${path}`, window.location.origin);
  Object.entries(config.params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });

  const token = getToken();
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(config.headers ?? {}),
  };
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  if (!response.ok) {
    const error = new Error(
      response.status === 429
        ? "Too many chat requests. Please wait a moment and try again."
        : `Chat request failed (${response.status})`,
    );
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return (await response.json()) as T;
};

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

type ChatId = string | number;
type ChatParams = Record<string, unknown>;
type ChatPayload = Record<string, unknown>;
type UserIdList = Array<string | number>;

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

const getChatHeaders = () => ({
  headers: {
    // Backend chat controllers use X-App-Name to select the chat tenant.
    "x-app-name": "chat",
  },
});

const withPersonEmail = (params: ChatParams = {}): ChatParams => {
  const email = getStoredUser<{ email?: string }>()?.email;
  return email ? { ...params, email } : params;
};

export const loginChatService = ({ login, email, password }: LoginCredentials) =>
  api.post(AUTH_PATHS.login, { email: email || login, password });

// export const getAdminDashboardService = () =>
//   api.get("/chat-service/admin/dashboard", getChatHeaders());

// export const getAdminUsersService = (params: ChatParams = {}) =>
//   api.get("/chat-service/admin/users", { ...getChatHeaders(), params });

// export const getAdminUserService = (userId: ChatId) =>
//   api.get(`/chat-service/admin/users/${encodeURIComponent(userId)}`, getChatHeaders());

// export const createAdminUserService = (payload: ChatPayload) =>
//   api.post("/chat-service/admin/users", payload, getChatHeaders());

// export const bulkCreateAdminUsersService = (users: ChatPayload[]) =>
//   api.post("/chat-service/admin/users/bulk", { users }, getChatHeaders());

// export const updateAdminUserService = (userId: ChatId, payload: ChatPayload) =>
//   api.patch(`/chat-service/admin/users/${encodeURIComponent(userId)}`, payload, getChatHeaders());

// export const changeAdminUserPasswordService = (userId: ChatId, password: string) =>
//   api.patch(
//     `/chat-service/admin/users/${encodeURIComponent(userId)}/password`,
//     { password },
//     getChatHeaders(),
//   );

export const getChatStatusService = () => api.get("/api/v1/chat/users/me", getChatHeaders());

export const getNotes = (includeArchived = false) =>
  api.get("/api/v1/notes", { ...getChatHeaders(), params: { includeArchived } });
export const getNote = (id: ChatId) =>
  api.get(`/api/v1/notes/${encodeURIComponent(id)}`, getChatHeaders());
export const createNote = (note: ChatNotePayload) =>
  api.post("/api/v1/notes", note, getChatHeaders());
export const updateNote = (id: ChatId, note: ChatNotePayload) =>
  api.put(`/api/v1/notes/${encodeURIComponent(id)}`, note, getChatHeaders());
export const deleteNote = (id: ChatId) =>
  api.delete(`/api/v1/notes/${encodeURIComponent(id)}`, getChatHeaders());

export const getChatSettingsService = () =>
  api.get("/api/v1/chat/preferences/settings", getChatHeaders());

export const updateChatSettingsService = (settings: ChatPayload) =>
  api.put("/api/v1/chat/preferences/settings", settings, getChatHeaders());

export const updateChatStatusService = (presence: string) =>
  api.patch("/api/v1/chat/users/me/presence", { presence }, getChatHeaders());

export const updateChatAvatarService = (file: File) => {
  const formData = new FormData();
  formData.append("file", file, file.name || "avatar");
  return api.post("/api/v1/chat/users/me/avatar", formData, {
    ...getChatHeaders(),
    headers: {
      ...getChatHeaders().headers,
      // Let Axios/browser set the multipart boundary automatically.
    },
  });
};

export const updateChatAvatarUrlService = (avatarUrl: string) =>
  api.patch("/api/v1/chat/users/me/avatar", { avatarUrl }, getChatHeaders());

export const getChatUsersService = (params: ChatParams = {}) =>
  api.get("/api/v1/chat/users", {
    ...getChatHeaders(),
    params: withPersonEmail({ limit: 1000, ...params }),
  });

export const getChatUserProfileService = (userId: ChatId) =>
  api.get(`/api/v1/chat/users/${encodeURIComponent(userId)}`, getChatHeaders());

export const getChatConversationsService = (params: ChatParams = {}) =>
  api.get("/api/v1/chat", {
    ...getChatHeaders(),
    params: withPersonEmail(params),
  });

export const openDirectChatService = (userId: ChatId) =>
  api.post("/api/v1/chat/direct", { userId: String(userId || "") }, getChatHeaders());

export const createGroupChatService = ({
  title,
  userIds,
}: {
  title: string;
  userIds: UserIdList;
}) => api.post("/api/v1/chat/groups", { title, userIds }, getChatHeaders());

export const addGroupMembersService = (chatId: ChatId, userIds: UserIdList) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/members`, { userIds }, getChatHeaders());

export const removeGroupMemberService = (chatId: ChatId, userId: ChatId) =>
  api.delete(
    `/api/v1/chat/${encodeURIComponent(chatId)}/members/${encodeURIComponent(userId)}`,
    getChatHeaders(),
  );

export const leaveGroupConversationService = (chatId: ChatId) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/leave`, {}, getChatHeaders());

export const transferGroupOwnershipService = (chatId: ChatId, userId: ChatId) =>
  api.post(
    `/api/v1/chat/${encodeURIComponent(chatId)}/transfer-owner`,
    { userId },
    getChatHeaders(),
  );

export const getChatMessagesService = (chatId: ChatId, params: ChatParams = {}) =>
  api.get(`/api/v1/chat/${encodeURIComponent(chatId)}/messages`, {
    ...getChatHeaders(),
    params,
  });

export const getChatMessageInfoService = (chatId: ChatId, messageId: ChatId) =>
  api.get(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/info`,
    getChatHeaders(),
  );

export const clearChatHistoryService = (chatId: ChatId) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/clear-history`, {}, getChatHeaders());

export const sendConversationMessageService = (
  chatId: ChatId,
  text: string,
  options: ChatPayload = {},
) =>
  api.post(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages`,
    { text, ...options },
    getChatHeaders(),
  );

export const editConversationMessageService = (chatId: ChatId, messageId: ChatId, text: string) =>
  api.patch(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
    { text },
    getChatHeaders(),
  );

export const deleteConversationMessageService = (chatId: ChatId, messageId: ChatId) =>
  api.delete(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`,
    getChatHeaders(),
  );

export const pinConversationMessageService = (chatId: ChatId, messageId: ChatId, pinned: boolean) =>
  api.patch(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}/pin`,
    { pinned },
    getChatHeaders(),
  );

export const searchChatMessagesService = (params: ChatParams = {}) =>
  api.get("/api/v1/chat/messages/search", {
    ...getChatHeaders(),
    params,
  });

export const sendDirectMessageService = async (
  userId: ChatId,
  text: string,
  options: ChatPayload = {},
) => {
  const directResponse = await openDirectChatService(userId);
  const data = directResponse.data?.data || directResponse.data || {};
  const chatId =
    data.chatId || data.chat_id || data.id || data.conversationId || data.conversation_id;

  if (!chatId) {
    throw new Error("Unable to create direct conversation");
  }

  const messageResponse = await api.post(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages`,
    { text, ...options },
    getChatHeaders(),
  );

  // Keep the conversation id available to callers. The message endpoint
  // returns the message, while the UI also needs the conversation id to
  // refresh the message body after sending.
  return {
    ...messageResponse,
    data: {
      ...messageResponse.data,
      data: {
        ...(messageResponse.data?.data || {}),
        chatId,
        conversationId: chatId,
      },
    },
  };
};

export const markConversationReadService = (chatId: ChatId) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/read`, {}, getChatHeaders());

export const shareConversationFileService = (chatId: ChatId, file: File) => {
  const formData = new FormData();
  formData.append("file", file, file.name || "document");
  return api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/files`, formData, {
    ...getChatHeaders(),
    headers: {
      ...getChatHeaders().headers,
      // Do not set Content-Type manually; the browser adds the multipart boundary.
    },
  });
};

export const startConversationCallService = (chatId: ChatId, type: string) =>
  api.post(`/api/v1/chat/${encodeURIComponent(chatId)}/calls`, { type }, getChatHeaders());

export const startCallService = (payload: { conversationId?: ChatId; userId?: ChatId; type: string }) =>
  api.post("/api/v1/chat/calls/start", payload, getChatHeaders());

export const getActiveConversationCallsService = () =>
  api.get("/api/v1/chat/calls/active", getChatHeaders());

export const endConversationCallService = (chatId: ChatId, callId: ChatId) =>
  api.post(
    `/api/v1/chat/${encodeURIComponent(chatId)}/calls/${encodeURIComponent(callId)}/end`,
    {},
    getChatHeaders(),
  );

export const respondConversationCallService = (chatId: ChatId, callId: ChatId, action: string) =>
  api.post(
    `/api/v1/chat/${encodeURIComponent(chatId)}/calls/${encodeURIComponent(callId)}/respond`,
    { action },
    getChatHeaders(),
  );

export const addMessageReactionService = (chatId: ChatId, messageId: ChatId, emoji: string) =>
  api.post(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
      messageId,
    )}/reactions`,
    { emoji },
    getChatHeaders(),
  );

export const removeMessageReactionService = (chatId: ChatId, messageId: ChatId, emoji: string) =>
  api.delete(
    `/api/v1/chat/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(
      messageId,
    )}/reactions/${encodeURIComponent(emoji)}`,
    getChatHeaders(),
  );

export const getAllMessageServices = (userId: ChatId, currentUserId?: ChatId) =>
  api.get(`/chat-service/conversations/${encodeURIComponent(userId)}/messages`, {
    params: currentUserId ? { currentUserId } : undefined,
  });
