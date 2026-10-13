import { updateChatStatusService } from "@/services/Team-chat/chat.service";
import { getBuddyEmail, normalizeChatError } from "./chatHealper";

export function useChatPresence({
  statusSaving,
  setStatusSaving,
  setCurrentStatus,
  setProfileUser,
  setLoadError,
  selectedChat,
  clearUnreadForChat,
  normalizePresence,
}: any) {
  const handleStatusChange = async (presence: string) => {
    if (statusSaving) return;
    const normalizedPresence = normalizePresence(presence);
    setStatusSaving(true);
    setCurrentStatus(normalizedPresence);
    localStorage.setItem("chat_presence", normalizedPresence);
    try {
      const response: any = await updateChatStatusService(normalizedPresence);
      const savedUser = response.data?.data || response.data || {};
      setProfileUser((previous: any) => ({
        ...(previous || {}), ...savedUser, presence: normalizedPresence, status: normalizedPresence,
      }));
      if (selectedChat?.type === "channel") {
        clearUnreadForChat({ chatId: selectedChat.id });
      } else if (selectedChat?.type === "person") {
        clearUnreadForChat({
          chatId: selectedChat.chatId,
          userId: selectedChat.id,
          email: selectedChat.subtitle || getBuddyEmail(selectedChat.raw),
        });
      }
    } catch (error) {
      setLoadError(normalizeChatError(error));
    } finally {
      setStatusSaving(false);
    }
  };

  return { handleStatusChange };
}
