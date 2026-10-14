import { CHAT_API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/api/client";

const request = async <T>(path: string, method: string, body?: unknown): Promise<T> => {
  const token = getToken()
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const response = await fetch(`${CHAT_API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-App-Name": "chat",
      ...(token ? { token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      payload?.error || payload?.message || `Chat request failed (${response.status})`,
    );
  }
  return payload as T;
};

export const createGroupChatService = (title: string, userIds: Array<string | number>) =>
  request(`/api/v1/chat/groups`, "POST", { title, userIds });

export const addGroupMembersService = (chatId: string | number, userIds: Array<string | number>) =>
  request(`/api/v1/chat/${encodeURIComponent(chatId)}/members`, "POST", { userIds });

export const removeGroupMemberService = (chatId: string | number, userId: string | number) =>
  request(
    `/api/v1/chat/${encodeURIComponent(chatId)}/members/${encodeURIComponent(userId)}`,
    "DELETE",
  );

export const leaveGroupConversationService = (chatId: string | number) =>
  request(`/api/v1/chat/${encodeURIComponent(chatId)}/leave`, "POST");

export const transferGroupOwnershipService = (chatId: string | number, userId: string | number) =>
  request(`/api/v1/chat/${encodeURIComponent(chatId)}/transfer-owner`, "POST", { userId });
