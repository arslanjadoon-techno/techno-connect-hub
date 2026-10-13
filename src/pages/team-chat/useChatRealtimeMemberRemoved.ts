import { useCallback } from "react";
import { getBuddySendId, getChannelId } from "./chatHealper";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";

export function useChatRealtimeMemberRemoved({
  currentUserId,
  selectedChat,
  navigate,
  setChannels,
  setSelectedChat,
}: any) {
  return useCallback(
    ({ chatId, removedUser }: any) => {
      if (!chatId || !removedUser) return;
      const removedUserId = String(getBuddySendId(removedUser) || removedUser.userId || "");
      const isCurrentUserRemoved = removedUserId === currentUserId;

      setChannels((previous: any[]) =>
        previous
          .map((channel) =>
            String(getChannelId(channel)) === String(chatId)
              ? {
                  ...channel,
                  participants: (channel.participants || []).filter(
                    (participant: any) => String(getBuddySendId(participant)) !== removedUserId,
                  ),
                }
              : channel,
          )
          .filter(
            (channel) => !isCurrentUserRemoved || String(getChannelId(channel)) !== String(chatId),
          ),
      );

      if (isCurrentUserRemoved && String(selectedChat?.chatId || selectedChat?.id) === String(chatId)) {
        setSelectedChat(null);
        navigate(CHAT_APP_BASE_PATH);
      } else if (!isCurrentUserRemoved && String(selectedChat?.id) === String(chatId)) {
        setSelectedChat((previous: any) =>
          previous
            ? {
                ...previous,
                raw: {
                  ...(previous.raw || {}),
                  participants: (previous.raw?.participants || []).filter(
                    (participant: any) => String(getBuddySendId(participant)) !== removedUserId,
                  ),
                },
              }
            : previous,
        );
      }
    },
    [currentUserId, navigate, selectedChat?.chatId, selectedChat?.id, setChannels, setSelectedChat],
  );
}
