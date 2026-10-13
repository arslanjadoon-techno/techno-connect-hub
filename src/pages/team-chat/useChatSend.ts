import {
  getArrayPayload,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  normalizeChatError,
} from "./chatHealper";
import { normalizeRealtimeMessage } from "./chatMessageNormalization";
import { getConversationIdFromResponse, textContainsMention } from "./ChatSystemUtils";
import {
  createClientMessageId,
  createOptimisticMessage,
  getOptimisticMessageKeys,
  updateMessageByClientId,
} from "./chatMessageState";
import { logChatTiming } from "./chatTiming";
import {
  editConversationMessageService,
  getChatConversationsService,
  openDirectChatService,
  sendConversationMessageService,
  sendDirectMessageService,
  shareConversationFileService,
} from "@/services/Team-chat/chat.service";

type ChatRecord = Record<string, any>;

type ChatSendOptions = {
  blockedUserIds: string[];
  currentUser: ChatRecord | null;
  currentUserId: string;
  editingMessage: ChatRecord | null;
  getArrayPayload?: typeof getArrayPayload;
  inputValue: string;
  pendingFiles: File[];
  refreshSelectedChatMessages: (chatId: string | number) => Promise<unknown>;
  replyToMessage: ChatRecord | null;
  selectedChat: ChatRecord | null;
  selectedMentionableUsers: ChatRecord[];
  sendClickLockRef: { current: boolean };
  setEditingMessage: (message: ChatRecord | null) => void;
  setInputValue: (value: string) => void;
  setMessagesByChat: (updater: any) => void;
  setPendingFiles: (files: File[]) => void;
  setReplyToMessage: (message: ChatRecord | null) => void;
  setSelectedChat: (updater: any) => void;
  setChannels: (updater: any) => void;
  setSendError: (value: string) => void;
  setSending: (value: boolean) => void;
  setUploading: (value: boolean) => void;
  textContainsMention?: typeof textContainsMention;
  uniqueUsersByIdentity: (users: ChatRecord[]) => ChatRecord[];
};

export function useChatSend({
  blockedUserIds,
  currentUser,
  currentUserId,
  editingMessage,
  inputValue,
  pendingFiles,
  refreshSelectedChatMessages,
  replyToMessage,
  selectedChat,
  selectedMentionableUsers,
  sendClickLockRef,
  setEditingMessage,
  setInputValue,
  setMessagesByChat,
  setPendingFiles,
  setReplyToMessage,
  setSelectedChat,
  setChannels,
  setSendError,
  setSending,
  setUploading,
  uniqueUsersByIdentity,
}: ChatSendOptions) {
  const handleSend = async () => {
    const text = inputValue.trim();
    const filesToSend = pendingFiles;
    if ((!text && filesToSend.length === 0) || !selectedChat || sendClickLockRef.current) return;
    // React state updates are asynchronous; use a short synchronous guard to
    // prevent double-click/Enter races without locking the composer while the
    // network request is being persisted.
    sendClickLockRef.current = true;
    queueMicrotask(() => {
      sendClickLockRef.current = false;
    });
    if (selectedChat.type === "person" && blockedUserIds.includes(String(selectedChat.id))) {
      setSendError("Unblock this user before sending messages.");
      return;
    }
    const mentionedUsers = uniqueUsersByIdentity(selectedMentionableUsers)
      .filter((buddy) => {
        const name = getBuddyName(buddy);
        const email = getBuddyEmail(buddy);
        return textContainsMention(text, name) || textContainsMention(text, email);
      })
      .map((buddy) => ({
        userId: String(getBuddySendId(buddy)),
        displayName: getBuddyName(buddy),
        email: getBuddyEmail(buddy),
      }));
    const messageOptions = {
      ...(mentionedUsers.length ? { metadata: { mentions: mentionedUsers } } : {}),
      ...(replyToMessage?.id ? { replyTo: replyToMessage.id } : {}),
    };

    const clientMessageId = createClientMessageId();
    const sendStartedAt = performance.now();
    logChatTiming("send_started", {
      clientMessageId,
      chatType: selectedChat.type || "unknown",
      hasAttachments: filesToSend.length > 0,
    });
    const optimisticKeys = getOptimisticMessageKeys(selectedChat);
    const optimisticMessage = createOptimisticMessage({
      selectedChat,
      currentUser,
      currentUserId,
      text,
      hasFiles: filesToSend.length > 0,
      clientMessageId,
      metadata: messageOptions.metadata || {},
    });

    setSending(true);
    setUploading(filesToSend.length > 0);
    setSendError("");
    if (!editingMessage) {
      setMessagesByChat((prev: Record<string, ChatRecord[]>) => {
        const next = { ...prev };
        optimisticKeys.forEach((key) => {
          next[key] = [...(prev[key] || []), optimisticMessage];
        });
        return next;
      });
    }
    logChatTiming("optimistic_queued", {
      clientMessageId,
      elapsedMs: Math.round(performance.now() - sendStartedAt),
    });
    if (!editingMessage) {
      setInputValue("");
      setPendingFiles([]);
      setReplyToMessage(null);
    }
    // Text sends are now represented locally. Release the composer immediately;
    // the request continues and reconciles this row when the server responds.
    if (filesToSend.length === 0 && !editingMessage) setSending(false);

    try {
      let chatId = selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;
      const hadConversationId = Boolean(chatId);

      if (editingMessage) {
        if (!chatId || !text || filesToSend.length > 0) return;
        await editConversationMessageService(chatId, editingMessage.id, text);
        await refreshSelectedChatMessages(chatId);
        setInputValue("");
        setEditingMessage(null);
        setReplyToMessage(null);
        return;
      }

      // Attachments must be uploaded against a conversation first. Text-only
      // first messages use the combined direct-send endpoint and skip this
      // extra round trip.
      if (selectedChat.type !== "channel" && !chatId && filesToSend.length > 0) {
        const openResponse: any = await openDirectChatService(selectedChat.id);
        chatId = getConversationIdFromResponse(openResponse);
        if (chatId) {
          setSelectedChat((previous: ChatRecord | null) =>
            previous?.id === selectedChat.id ? { ...previous, chatId } : previous,
          );
        }
      }

      let attachmentIds: string[] = [];
      if (filesToSend.length > 0 && chatId) {
        const uploaded = await Promise.all(
          filesToSend.map((file) => shareConversationFileService(chatId, file)),
        );
        attachmentIds = uploaded
          .map(
            (response: any) =>
              response?.attachmentId ||
              response?.data?.attachmentId ||
              response?.data?.data?.attachmentId,
          )
          .filter(Boolean);
      }
      const sendOptions = {
        ...(attachmentIds.length ? { ...messageOptions, attachmentIds } : messageOptions),
        clientMessageId,
      };
      const messageText = text || (attachmentIds.length ? "[Attachment]" : "");
      let response: any;
      const requestStartedAt = performance.now();

      if (selectedChat.type === "channel") {
        if (messageText)
          response = await sendConversationMessageService(
            selectedChat.id,
            messageText,
            sendOptions,
          );
      } else if (messageText) {
        response = chatId
          ? await sendConversationMessageService(chatId, messageText, sendOptions)
          : await sendDirectMessageService(selectedChat.id, messageText, sendOptions);
        const data = response.data?.data || {};
        chatId = data?.chatId || data?.chat?.chat_id || data?.chat?.data?.chat_id || chatId || null;

        if (chatId) {
          setSelectedChat((prev: ChatRecord | null) =>
            prev?.id === selectedChat.id ? { ...prev, chatId } : prev,
          );
        }
      }
      if (!response) throw new Error("Message was not sent");
      logChatTiming("send_request_completed", {
        clientMessageId,
        requestMs: Math.round(performance.now() - requestStartedAt),
        endToEndMs: Math.round(performance.now() - sendStartedAt),
      });

      const confirmedPayload = response?.data?.data || response?.data;
      const confirmed = confirmedPayload
        ? normalizeRealtimeMessage(confirmedPayload, { ...selectedChat, currentUserId })
        : null;
      setMessagesByChat((prev: Record<string, ChatRecord[]>) =>
        updateMessageByClientId(prev, optimisticKeys, clientMessageId, (message: ChatRecord) => ({
          ...message,
          ...(confirmed || {}),
          id: confirmed?.id || message.id,
          sendState: "sent",
          deliveryStatus: confirmed?.deliveryStatus || "sent",
        })),
      );
      logChatTiming("optimistic_reconciled", {
        clientMessageId,
        elapsedMs: Math.round(performance.now() - sendStartedAt),
      });

      // Clear the composer as soon as the upload/message request succeeds.
      // Message and sidebar reconciliation can happen in the background and
      // should not make the sender wait before seeing the updated composer.
      setInputValue("");
      setPendingFiles([]);
      setReplyToMessage(null);
      setEditingMessage(null);

      if (chatId) {
        // The persisted response and SignalR event reconcile the active list. Avoid
        // a second full history request on every send; refresh remains available
        // on conversation open/reconnect for recovery.
        const refreshTasks: Promise<unknown>[] = [];

        // A newly created direct conversation is not present in the initial
        // sidebar snapshot. Reconcile the conversation list after the first
        // message, without blocking the composer update above.
        if (selectedChat.type !== "channel" && !hadConversationId) {
          refreshTasks.push(
            getChatConversationsService().then((conversationResponse: any) => {
              const refreshedConversations = getArrayPayload(
                conversationResponse.data?.data ?? conversationResponse.data,
              );
              setChannels(() => {
                const conversations = [...refreshedConversations];
                if (selectedChat.type !== "person") return conversations;

                const conversationKey = String(chatId);
                const alreadyPresent = conversations.some(
                  (conversation) =>
                    String(
                      conversation?.id || conversation?.chatId || conversation?.chat_id || "",
                    ) === conversationKey,
                );
                if (alreadyPresent) return conversations;

                const peer = selectedChat.raw || selectedChat;
                conversations.push({
                  id: chatId,
                  chat_id: chatId,
                  chatId,
                  type: "direct",
                  isDirect: true,
                  participants: [currentUser, peer].filter(Boolean),
                  lastMessageAt: new Date().toISOString(),
                  lastMessage: {
                    id: `local-${Date.now()}`,
                    conversationId: chatId,
                    text,
                    createdAt: new Date().toISOString(),
                    sender: currentUser,
                  },
                });
                return conversations;
              });
            }),
          );
        }

        Promise.allSettled(refreshTasks).catch(() => {
          // The send already succeeded; a stale refresh must not show an
          // upload failure or put the sent files back in the composer.
        });
      }
    } catch (error) {
      setSendError(normalizeChatError(error));
      setMessagesByChat((prev: Record<string, ChatRecord[]>) =>
        updateMessageByClientId(prev, optimisticKeys, clientMessageId, (message: ChatRecord) => ({
          ...message,
          sendState: "failed",
          deliveryStatus: "failed",
        })),
      );
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  return handleSend;
}
