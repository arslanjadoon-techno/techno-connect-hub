import { useChatMessageUtilities } from "./useChatMessageUtilities";
import { useChatPin } from "./useChatPin";
import { useChatReactions } from "./useChatReactions";

type ChatRecord = Record<string, any>;

export function useChatMessageActions({
  currentUserId,
  messagesByChat,
  refreshSelectedChatMessages,
  selectedChat,
  setMessagesByChat,
  setSendError,
}: {
  currentUserId: string;
  messagesByChat: Record<string, ChatRecord[]>;
  refreshSelectedChatMessages: (chatId: string | number) => Promise<unknown>;
  selectedChat: ChatRecord | null;
  setMessagesByChat: (updater: any) => void;
  setSendError: (value: string) => void;
}) {
  const { handleCopyMessage, handleForwardMessage } = useChatMessageUtilities(setSendError);
  const { handleReaction } = useChatReactions({
    currentUserId,
    selectedChat,
    messagesByChat,
    setMessagesByChat,
    setSendError,
  });
  const { handlePinMessage } = useChatPin({
    selectedChat,
    currentUserId,
    setMessagesByChat,
    setSendError,
  });

  return { handleCopyMessage, handleForwardMessage, handlePinMessage, handleReaction };
}
