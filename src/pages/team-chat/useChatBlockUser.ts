import { updateChatSettingsService } from "@/services/Team-chat/chat.service";
import { normalizeChatError } from "./chatHealper";

type BlockUserOptions = {
  blockedUserIds: string[];
  requestConfirmation: (options: any) => Promise<boolean>;
  setBlockedUserIds: (update: any) => void;
  setMessagesByChat: (update: any) => void;
  setSendError: (message: string) => void;
};

export function useChatBlockUser({
  blockedUserIds,
  requestConfirmation,
  setBlockedUserIds,
  setMessagesByChat,
  setSendError,
}: BlockUserOptions) {
  const handleBlockUser = async (message: any) => {
    const userId = message?.authorId;
    if (!userId) return;

    const normalizedUserId = String(userId);
    const isBlocked = blockedUserIds.includes(normalizedUserId);
    const confirmed = await requestConfirmation({
      title: isBlocked ? "Unblock user?" : "Block user?",
      message: isBlocked
        ? "Allow messages from this user again?"
        : "You will no longer receive messages from this user.",
      confirmLabel: isBlocked ? "Unblock" : "Block",
    });
    if (!confirmed) return;

    const nextBlockedUserIds = isBlocked
      ? blockedUserIds.filter((id) => id !== normalizedUserId)
      : [...blockedUserIds, normalizedUserId];

    // Keep side effects out of the state updater. React may invoke an updater
    // more than once in development, which would otherwise send duplicate
    // settings requests and report success before the API has completed.
    setBlockedUserIds(nextBlockedUserIds);

    try {
      await updateChatSettingsService({ blockedUserIds: nextBlockedUserIds });

      if (!isBlocked) {
        setMessagesByChat((previous: Record<string, any[]>) =>
          Object.fromEntries(
            Object.entries(previous).map(([chatKey, messages]) => [
              chatKey,
              messages.filter((item) => String(item.authorId) !== normalizedUserId),
            ]),
          ),
        );
      }
      setSendError(isBlocked ? "User unblocked." : "User blocked.");
    } catch (error) {
      setBlockedUserIds(blockedUserIds);
      setSendError(normalizeChatError(error));
    }
  };

  return { handleBlockUser };
}
