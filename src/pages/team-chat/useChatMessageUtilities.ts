import {
  sendConversationMessageService,
  sendDirectMessageService,
} from "@/services/Team-chat/chat.service";
import { getBuddySendId, getChannelId, normalizeChatError } from "./chatHealper";

export function useChatMessageUtilities(setSendError: (message: string) => void) {
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
      if (isChannelTarget) {
        await sendConversationMessageService(targetChatId, forwardedText, {
          metadata: { forwardedFrom: message.id },
        });
      } else {
        const recipientId = getBuddySendId(target);
        if (!recipientId) throw new Error("The selected recipient is missing an identity ID.");
        await sendDirectMessageService(recipientId, forwardedText, {
          metadata: { forwardedFrom: message.id },
        });
      }
      setSendError("");
    } catch (error) {
      setSendError(normalizeChatError(error));
    }
  };

  return { handleCopyMessage, handleForwardMessage };
}
