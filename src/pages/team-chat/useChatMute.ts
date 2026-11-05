import {
  muteConversationService,
  unmuteConversationService,
} from "@/services/Team-chat/chat.service";

export function useChatMute({ mutedChatIds, setMutedChatIds, setSendError }: any) {
  const handleToggleChatMute = async (chatId: any) => {
    if (!chatId) return;
    const normalizedChatId = String(chatId);
    const wasMuted = mutedChatIds.includes(normalizedChatId);
    const next = wasMuted
      ? mutedChatIds.filter((id: string) => id !== normalizedChatId)
      : [...mutedChatIds, normalizedChatId];

    setMutedChatIds(next);
    try {
      if (wasMuted) await unmuteConversationService(normalizedChatId);
      else await muteConversationService(normalizedChatId);
    } catch {
      setMutedChatIds(mutedChatIds);
      setSendError("Chat notification setting could not be saved.");
    }
  };
  return { handleToggleChatMute };
}
