import { useCallback } from "react";
import { getBuddySendId, getChannelId } from "./chatHealper";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";

export function useChatRealtimeMemberRemoved({
  currentUserId,
  selectedChat,
  navigate,
  setChannels,
  setSelectedChat,
  setMessagesByChat,
}: any) {
  return useCallback(
    ({ chatId, removedUser }: any) => {
      if (!chatId || !removedUser) return;
      const removedUserId = String(getBuddySendId(removedUser) || removedUser.userId || "");
      const isCurrentUserRemoved =
        removedUserId.toLowerCase() === String(currentUserId || "").toLowerCase();

      const removeParticipant = (conversation: any) => {
        const filter = (participant: any) =>
          String(getBuddySendId(participant) || "").toLowerCase() !== removedUserId.toLowerCase();
        const participants = Array.isArray(conversation?.participants)
          ? conversation.participants.filter(filter)
          : conversation?.participants;
        const members = Array.isArray(conversation?.members)
          ? conversation.members.filter(filter)
          : conversation?.members;
        const raw = conversation?.raw
          ? {
              ...conversation.raw,
              ...(Array.isArray(conversation.raw.participants)
                ? { participants: conversation.raw.participants.filter(filter) }
                : {}),
              ...(Array.isArray(conversation.raw.members)
                ? { members: conversation.raw.members.filter(filter) }
                : {}),
            }
          : conversation?.raw;
        return { ...conversation, participants, members, raw };
      };

      setChannels((previous: any[]) =>
        previous
          .map((channel) =>
            String(getChannelId(channel)) === String(chatId)
              ? removeParticipant(channel)
              : channel,
          )
          .filter(
            (channel) => !isCurrentUserRemoved || String(getChannelId(channel)) !== String(chatId),
          ),
      );

      if (
        isCurrentUserRemoved &&
        String(selectedChat?.chatId || selectedChat?.id) === String(chatId)
      ) {
        setMessagesByChat((previous: Record<string, any[]>) => {
          const next = { ...previous };
          [selectedChat?.id, selectedChat?.chatId, chatId]
            .filter(Boolean)
            .forEach((key) => delete next[String(key)]);
          return next;
        });
        setSelectedChat(null);
        navigate(CHAT_APP_BASE_PATH);
      } else if (!isCurrentUserRemoved && String(selectedChat?.id) === String(chatId)) {
        setSelectedChat((previous: any) => (previous ? removeParticipant(previous) : previous));
      }
    },
    [
      currentUserId,
      navigate,
      selectedChat?.chatId,
      selectedChat?.id,
      setChannels,
      setMessagesByChat,
      setSelectedChat,
    ],
  );
}
