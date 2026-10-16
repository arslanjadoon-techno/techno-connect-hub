import { useCallback, useState } from "react";
import { useChatBlockUser } from "./useChatBlockUser";

type ChatRecord = Record<string, any>;

export function useChatModeration({
  requestConfirmation,
  setMessagesByChat,
  setSendError,
}: {
  requestConfirmation: (options: ChatRecord) => Promise<boolean>;
  setMessagesByChat: (updater: any) => void;
  setSendError: (value: string) => void;
}) {
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const filterBlockedMessages = useCallback(
    (messages: ChatRecord[] = []) =>
      messages.filter((message: ChatRecord) => !blockedUserIds.includes(String(message.authorId))),
    [blockedUserIds],
  );
  const { handleBlockUser } = useChatBlockUser({
    blockedUserIds,
    requestConfirmation,
    setBlockedUserIds,
    setMessagesByChat,
    setSendError,
  });

  return { blockedUserIds, filterBlockedMessages, handleBlockUser, setBlockedUserIds };
}

