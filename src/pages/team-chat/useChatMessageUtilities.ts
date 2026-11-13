import {
  sendConversationMessageService,
  sendDirectMessageService,
} from "@/services/Team-chat/chat.service";
import { getBuddySendId, getChannelId, normalizeChatError } from "./chatHealper";
import { mergeChatMessages } from "./chatMessageState";

export function useChatMessageUtilities(
  setSendError: (message: string) => void,
  setMessagesByChat?: (updater: any) => void,
) {
  const handleCopyMessage = async (message: any) => {
    const text = String(message?.text || "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setSendError("Message copied.");
    } catch {
      setSendError("Unable to copy message.");
    }
  };

  const handleForwardMessage = async (message: any, target: any) => {
    const text = String(message?.text || "").trim();
    const hasAttachments = Array.isArray(message?.attachments) && message.attachments.length > 0;
    if ((!text && !hasAttachments) || !target) return;

    const isChannelTarget = target.__conversationType === "channel";
    const targetChatId = isChannelTarget ? getChannelId(target) : target.directConversationId;
    try {
      const forwardedText = text || "[Attachment]";
      let response: any;
      if (isChannelTarget) {
        response = await sendConversationMessageService(targetChatId, forwardedText, {
          metadata: { forwardedFrom: message.id },
        });
      } else {
        const recipientId = getBuddySendId(target);
        if (!recipientId) throw new Error("The selected recipient is missing an identity ID.");
        response = await sendDirectMessageService(recipientId, forwardedText, {
          metadata: { forwardedFrom: message.id },
        });
      }

      const payload = response?.data?.data ?? response?.data ?? {};
      const forwardedMessage = payload?.SentMessage ?? payload?.sentMessage ?? payload?.message ?? payload;
      const conversationId = String(
        payload?.chatId ?? payload?.chat_id ?? payload?.conversationId ?? payload?.conversation_id ?? targetChatId ?? "",
      );

      if (setMessagesByChat && conversationId && forwardedMessage?.id) {
        setMessagesByChat((previous: Record<string, any[]>) => {
          const existing = previous[conversationId] || [];
          if (existing.some((item) => String(item.id) === String(forwardedMessage.id))) return previous;
          return {
            ...previous,
            [conversationId]: mergeChatMessages(existing, [
              { ...forwardedMessage, sendState: "sent" },
            ]),
          };
        });
      }
      setSendError("");
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  return { handleCopyMessage, handleForwardMessage };
}
