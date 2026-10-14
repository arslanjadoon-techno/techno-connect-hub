import {
  leaveGroupConversationService,
  removeGroupMemberService,
  transferGroupOwnershipService,
  updateChatSettingsService,
} from "@/services/Team-chat/chat.service";
import { getBuddySendId, getChannelId, normalizeChatError } from "./chatHealper";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";

export function useChatGroupActions({
  setChannels,
  setMessagesByChat,
  setMutedChatIds,
  setSelectedChat,
  setSendError,
  navigate,
  // setProfileUser,
  fetchChatData,
}: any) {
  const handleLeaveGroup = async (chatId: any) => {
    if (!chatId) return;
    try {
      await leaveGroupConversationService(chatId);
      setChannels((prev: any[]) =>
        prev.filter((channel) => String(getChannelId(channel)) !== String(chatId)),
      );
      setMessagesByChat((prev: Record<string, any[]>) => {
        const next = { ...prev };
        delete next[String(chatId)];
        return next;
      });
      setMutedChatIds((prev: string[]) => {
        const next = prev.filter((id) => id !== String(chatId));
        updateChatSettingsService({ mutedChatIds: next }).catch(() => {});
        return next;
      });
      setSelectedChat(null);
      navigate(CHAT_APP_BASE_PATH);
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  const handleTransferOwnership = async (chatId: any, userId: any) => {
    if (!chatId || !userId) return;
    try {
      await transferGroupOwnershipService(chatId, userId);
      await fetchChatData();
      setSendError("");
    } catch (error) {
      setSendError(normalizeChatError(error));
      throw error;
    }
  };

  const handleRemoveGroupMember = async (chatId: any, userId: any) => {
    if (!chatId || !userId) return;
    try {
      await removeGroupMemberService(chatId, userId);
      setSelectedChat((previous: any) => {
        if (!previous || String(previous.id) !== String(chatId)) return previous;
        const participants = Array.isArray(previous.raw?.participants)
          ? previous.raw.participants
          : [];
        const remaining = participants.filter(
          (participant: any) => String(getBuddySendId(participant)) !== String(userId),
        );
        return {
          ...previous,
          participants: remaining,
          raw: { ...(previous.raw || {}), participants: remaining },
        };
      });
    } catch (error) {
      setSendError(normalizeChatError(error));
      throw error;
    }
  };

  return { handleLeaveGroup, handleTransferOwnership, handleRemoveGroupMember };
}
