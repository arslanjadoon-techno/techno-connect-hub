import { updateChatSettingsService } from "@/services/Team-chat/chat.service";

export function useChatMute({ setMutedChatIds, setSendError }: any) {
  const handleToggleChatMute = (chatId: any) => {
    if (!chatId) return;
    setMutedChatIds((previous: string[]) => {
      const normalizedChatId = String(chatId);
      const next = previous.includes(normalizedChatId)
        ? previous.filter((id) => id !== normalizedChatId)
        : [...previous, normalizedChatId];
      updateChatSettingsService({ mutedChatIds: next }).catch(() => {
        setSendError("Chat notification setting could not be saved.");
      });
      return next;
    });
  };
  return { handleToggleChatMute };
}
