import { CHAT_API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/api/client";

type ChatId = string | number;

const request = async (path: string, method: string, body?: unknown) => {
  const response = await fetch(`${CHAT_API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-app-name": "chat",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || data?.error || `Group request failed (${response.status})`);
  return data;
};

export const createGroupChatService = (title: string, userIds: ChatId[]) =>
  request("/api/v1/chat/groups", "POST", { title, userIds });

export const addGroupMembersService = (chatId: ChatId, userIds: ChatId[]) =>
  request(`/api/v1/chat/${encodeURIComponent(chatId)}/members`, "POST", { userIds });

export const removeGroupMemberService = (chatId: ChatId, userId: ChatId) =>
  request(`/api/v1/chat/${encodeURIComponent(chatId)}/members/${encodeURIComponent(userId)}`, "DELETE");

export const leaveGroupConversationService = (chatId: ChatId) =>
  request(`/api/v1/chat/${encodeURIComponent(chatId)}/leave`, "POST", {});

export const transferGroupOwnershipService = (chatId: ChatId, userId: ChatId) =>
  request(`/api/v1/chat/${encodeURIComponent(chatId)}/transfer-owner`, "POST", { userId });
