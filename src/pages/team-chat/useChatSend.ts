import {
  getArrayPayload,
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  normalizeChatError,
} from "./chatHealper";
import { normalizeRealtimeMessage } from "./chatMessageNormalization";
import {
  dedupeConversationRecords,
  getConversationPreviewTimestamp,
  updateConversationPreview,
} from "./chatConversationKeys";
import {
  getConversationIdFromResponse,
  MENTION_ALL_LABEL,
  textContainsMention,
} from "./ChatSystemUtils";
import {
  createClientMessageId,
  createOptimisticMessage,
  getOptimisticMessageKeys,
  mergeChatMessages,
  updateMessageByClientId,
} from "./chatMessageState";
import {
  getPendingChatSend,
  saveCachedChatMessages,
  savePendingChatSend,
  updatePendingChatSend,
  type PendingChatAttachment,
  type PendingChatSend,
} from "./chatMessageIndexedDb";
import {
  isUnknownSendError,
  pendingChatSendErrorMessage,
  pendingChatSendMessageKeys,
  pendingChatSendStatusToMessageState,
  pendingChatSendToOptimisticMessage,
} from "./pendingChatSendUtils";
import { logChatTiming } from "./chatTiming";
import {
  editConversationMessageService,
  deleteConversationFileService,
  getChatConversationsService,
  openDirectChatService,
  sendConversationMessageService,
  sendDirectMessageService,
} from "@/services/Team-chat/chat.service";
import {
  CHAT_UPLOAD_CONCURRENCY,
  ChatUploadCancelledError,
  uploadChatAttachments,
  type ChatUploadFileState,
} from "./chatUploadQueue";
import { useRef, useState } from "react";

type ChatRecord = Record<string, any>;

const getReplyTargetId = (message: ChatRecord | null): string =>
  String(
    message?.id ??
      message?.messageId ??
      message?.message_id ??
      message?.publicId ??
      message?.public_id ??
      "",
  ).trim();

export type ActiveChatUploadState = ChatUploadFileState & {
  clientMessageId: string;
};

type PendingSendRetryRef = {
  current: ((clientMessageId: string) => Promise<void>) | null;
};

const activePendingSends = new Map<string, Promise<void>>();

const deliveryStatusRank = (status: unknown): number => {
  switch (String(status || "").toLowerCase()) {
    case "seen":
    case "read":
      return 3;
    case "delivered":
      return 2;
    case "sent":
      return 1;
    default:
      return 0;
  }
};

const preserveDeliveryStatus = (current: unknown, confirmed: unknown): string => {
  const next = String(confirmed || "sent");
  return deliveryStatusRank(current) > deliveryStatusRank(next) ? String(current) : next;
};

const updateDirectBuddyPreview = (
  buddies: ChatRecord[],
  selectedChat: ChatRecord,
  message: ChatRecord,
) => {
  const selectedIdentity = new Set(
    [
      selectedChat.id,
      selectedChat.chatId,
      selectedChat.chat_id,
      selectedChat.userId,
      selectedChat.user_id,
      selectedChat.appUserId,
      selectedChat.app_user_id,
      selectedChat.email,
      selectedChat.email_id,
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase()),
  );
  const matchesSelected = (buddy: ChatRecord) =>
    [
      buddy.id,
      buddy.chatId,
      buddy.chat_id,
      buddy.userId,
      buddy.user_id,
      buddy.appUserId,
      buddy.app_user_id,
      buddy.email,
      buddy.email_id,
    ]
      .filter(Boolean)
      .some((value) => selectedIdentity.has(String(value).trim().toLowerCase()));

  const selectedIndex = buddies.findIndex(matchesSelected);
  if (selectedIndex < 0) return buddies;

  const previewTimestamp = getConversationPreviewTimestamp(message, new Date().toISOString());
  const updated = {
    ...buddies[selectedIndex],
    lastMessage: message,
    last_message: message,
    lastMessageAt: previewTimestamp,
    last_message_at: previewTimestamp,
    lastMessageTime: previewTimestamp,
    last_message_time: previewTimestamp,
  };
  return [updated, ...buddies.filter((_, index) => index !== selectedIndex)];
};

type ChatSendOptions = {
  blockedUserIds: string[];
  currentUser: ChatRecord | null;
  currentUserId: string;
  editingMessage: ChatRecord | null;
  getArrayPayload?: typeof getArrayPayload;
  inputValueRef: { current: string };
  pendingFilesRef: { current: File[] };
  refreshSelectedChatMessages: (chatId: string | number) => Promise<unknown>;
  replyToMessage: ChatRecord | null;
  selectedChat: ChatRecord | null;
  selectedMentionableUsers: ChatRecord[];
  setEditingMessage: (message: ChatRecord | null) => void;
  setEditingSaving: (value: boolean) => void;
  setInputValue: (value: string) => void;
  setMessagesByChat: (updater: any) => void;
  setPendingFiles: (files: File[]) => void;
  setReplyToMessage: (message: ChatRecord | null) => void;
  setSelectedChat: (updater: any) => void;
  setChannels: (updater: any) => void;
  setBuddies: (updater: any) => void;
  setSendError: (value: string) => void;
  pendingSendRetryRef?: PendingSendRetryRef;
  textContainsMention?: typeof textContainsMention;
  uniqueUsersByIdentity: (users: ChatRecord[]) => ChatRecord[];
};

export function useChatSend({
  blockedUserIds,
  currentUser,
  currentUserId,
  editingMessage,
  inputValueRef,
  pendingFilesRef,
  refreshSelectedChatMessages,
  replyToMessage,
  selectedChat,
  selectedMentionableUsers,
  setEditingMessage,
  setEditingSaving,
  setInputValue,
  setMessagesByChat,
  setPendingFiles,
  setReplyToMessage,
  setSelectedChat,
  setChannels,
  setBuddies,
  setSendError,
  pendingSendRetryRef,
  uniqueUsersByIdentity,
}: ChatSendOptions) {
  // Use a wall-clock component so persisted ordering metadata from a previous
  // page session remains older than messages submitted in this session.
  const clientSequenceRef = useRef(Date.now() * 1000);
  const [uploadProgress, setUploadProgress] = useState<ActiveChatUploadState[]>([]);
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  const latestUploadClientMessageIdRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef(new Set<string>());

  const updatePendingMessageState = (
    pending: PendingChatSend,
    status: PendingChatSend["status"],
    errorMessage?: string,
    selectedChatSnapshot?: ChatRecord | null,
  ) => {
    const keys = pendingChatSendMessageKeys(pending, selectedChatSnapshot);
    const state = pendingChatSendStatusToMessageState(status);
    setMessagesByChat((previous: Record<string, ChatRecord[]>) =>
      updateMessageByClientId(previous, keys, pending.clientMessageId, (message: ChatRecord) => ({
        ...message,
        ...state,
        sendError: errorMessage,
      })),
    );
  };

  const persistPendingUpdate = async (
    clientMessageId: string,
    update: Partial<PendingChatSend>,
  ): Promise<PendingChatSend | undefined> => {
    try {
      return await updatePendingChatSend(clientMessageId, update);
    } catch (error) {
      console.warn("Could not update pending chat send", error);
      return undefined;
    }
  };

  const cancelUpload = () => {
    const clientMessageId = latestUploadClientMessageIdRef.current;
    if (!clientMessageId) return;

    const controller = uploadControllersRef.current.get(clientMessageId);
    if (!controller) return;

    cancelRequestedRef.current.add(clientMessageId);
    controller.abort();
  };

  const sendPendingRecord = async (
    initialPending: PendingChatSend,
    optimisticMessage: ChatRecord,
    selectedChatSnapshot: ChatRecord,
    hadConversationId: boolean,
  ): Promise<{
    success: boolean;
    chatId?: string;
    confirmed?: ChatRecord | null;
    hadConversationId: boolean;
  }> => {
    let pending = initialPending;
    let chatId = pending.chatId || undefined;
    const attachments = pending.attachments.map((attachment) => ({ ...attachment }));
    const uploadController = new AbortController();
    const hasAttachments = attachments.length > 0;
    let messageAccepted = false;

    uploadControllersRef.current.set(pending.clientMessageId, uploadController);
    latestUploadClientMessageIdRef.current = pending.clientMessageId;
    if (hasAttachments) {
      setUploadProgress(
        attachments.map((attachment) => ({
          key: attachment.key,
          name: attachment.name,
          size: attachment.size,
          status: attachment.attachmentId ? "completed" : "queued",
          loaded: attachment.attachmentId ? attachment.size : 0,
          total: attachment.size,
          percent: attachment.attachmentId ? 100 : 0,
          attachmentId: attachment.attachmentId,
          clientMessageId: pending.clientMessageId,
        })),
      );
    } else {
      setUploadProgress([]);
    }

    try {
      const retrying = await persistPendingUpdate(pending.clientMessageId, {
        status: "retrying",
        attempts: pending.attempts + 1,
        lastAttemptAt: Date.now(),
        error: undefined,
        unknownOutcome: false,
        nextRetryAt: undefined,
      });
      pending = retrying || {
        ...pending,
        status: "retrying",
        attempts: pending.attempts + 1,
        lastAttemptAt: Date.now(),
      };
      updatePendingMessageState(pending, "retrying", undefined, selectedChatSnapshot);

      if (pending.targetType === "direct" && !chatId && pending.attachments.length > 0) {
        const openResponse: any = await openDirectChatService(pending.targetId);
        const openedChatId = getConversationIdFromResponse(openResponse);
        chatId = openedChatId ? String(openedChatId) : undefined;
        if (!chatId) throw new Error("The direct conversation could not be opened.");
        if (uploadController.signal.aborted) throw new ChatUploadCancelledError([]);
        pending = (await persistPendingUpdate(pending.clientMessageId, { chatId })) || {
          ...pending,
          chatId,
        };
        setSelectedChat((previous: ChatRecord | null) =>
          previous?.id === selectedChatSnapshot.id ? { ...previous, chatId } : previous,
        );
      }

      if (hasAttachments && !chatId) {
        throw new Error("An attachment requires an active conversation.");
      }

      if (hasAttachments) {
        await uploadChatAttachments({
          chatId: chatId!,
          attachments,
          concurrency: CHAT_UPLOAD_CONCURRENCY,
          signal: uploadController.signal,
          onStateChange: (states) =>
            setUploadProgress(
              states.map((state) => ({ ...state, clientMessageId: pending.clientMessageId })),
            ),
          onAttachmentUploaded: async (attachmentKey, attachmentId) => {
            const attachment = attachments.find((item) => item.key === attachmentKey);
            if (attachment) attachment.attachmentId = attachmentId;
            await updatePendingChatSend(pending.clientMessageId, (current) => ({
              ...current,
              ...(chatId ? { chatId } : {}),
              attachments: current.attachments.map((item) =>
                item.key === attachmentKey ? { ...item, attachmentId } : item,
              ),
            }));
          },
        });
      }

      if (uploadController.signal.aborted) throw new ChatUploadCancelledError([]);
      const attachmentIds = attachments
        .map((attachment) => attachment.attachmentId)
        .filter(Boolean) as string[];
      if (attachmentIds.length !== attachments.length) {
        throw new Error("Every attachment must finish uploading before the message is sent.");
      }
      pending = (await persistPendingUpdate(pending.clientMessageId, {
        attachments,
        ...(chatId ? { chatId } : {}),
      })) || { ...pending, attachments, ...(chatId ? { chatId } : {}) };

      const sendOptions = {
        metadata: pending.metadata,
        ...(pending.replyTo ? { replyTo: pending.replyTo } : {}),
        ...(attachmentIds.length ? { attachmentIds } : {}),
        clientMessageId: pending.clientMessageId,
      };
      const messageText = pending.text || (attachmentIds.length ? "[Attachment]" : "");
      if (!messageText) throw new Error("Message was not sent");

      let response: any;
      if (pending.targetType === "channel") {
        response = await sendConversationMessageService(
          pending.chatId || pending.targetId,
          messageText,
          sendOptions,
        );
        chatId = pending.chatId || pending.targetId;
      } else {
        response = chatId
          ? await sendConversationMessageService(chatId, messageText, sendOptions)
          : await sendDirectMessageService(pending.targetId, messageText, sendOptions);
        const data = response?.data?.data || response?.data || {};
        chatId =
          String(
            data?.chatId ||
              data?.chat_id ||
              data?.conversationId ||
              data?.conversation_id ||
              data?.chat?.chat_id ||
              data?.chat?.data?.chat_id ||
              chatId ||
              "",
          ) || undefined;
      }

      if (!response) throw new Error("Message was not sent");
      messageAccepted = true;

      if (chatId && chatId !== pending.chatId) {
        pending = (await persistPendingUpdate(pending.clientMessageId, { chatId })) || {
          ...pending,
          chatId,
        };
      }
      if (chatId) {
        setSelectedChat((previous: ChatRecord | null) =>
          previous?.id === selectedChatSnapshot.id ? { ...previous, chatId } : previous,
        );
      }

      const confirmedPayload = response?.data?.data || response?.data;
      const confirmed = confirmedPayload
        ? normalizeRealtimeMessage(confirmedPayload, {
            ...selectedChatSnapshot,
            chatId,
            currentUserId,
          })
        : null;
      const serverMessageId = confirmed?.id ? String(confirmed.id) : undefined;
      const confirmedWithClientId = confirmed
        ? { ...confirmed, clientMessageId: confirmed.clientMessageId || pending.clientMessageId }
        : null;
      const confirmedKeys = pendingChatSendMessageKeys(
        { ...pending, chatId },
        selectedChatSnapshot,
      );

      setMessagesByChat((previous: Record<string, ChatRecord[]>) =>
        updateMessageByClientId(
          previous,
          confirmedKeys,
          pending.clientMessageId,
          (message: ChatRecord) => ({
            ...message,
            ...(confirmedWithClientId || {}),
            clientMessageId:
              confirmedWithClientId?.clientMessageId ||
              message.clientMessageId ||
              pending.clientMessageId,
            id: confirmedWithClientId?.id || message.id,
            sendState: "accepted",
            deliveryStatus: preserveDeliveryStatus(
              message.deliveryStatus,
              (confirmedWithClientId as ChatRecord | null)?.deliveryStatus,
            ),
          }),
        ),
      );

      if (confirmedWithClientId) {
        await Promise.all(
          confirmedKeys.map((key) => saveCachedChatMessages(key, [confirmedWithClientId])),
        );
      }

      await persistPendingUpdate(pending.clientMessageId, {
        ...(chatId ? { chatId } : {}),
        ...(serverMessageId ? { serverMessageId } : {}),
        status: "accepted",
        error: undefined,
        unknownOutcome: false,
        nextRetryAt: undefined,
      });

      const previewMessage = confirmedWithClientId || {
        ...optimisticMessage,
        chatId,
        chat_id: chatId,
        sendState: "accepted",
        deliveryStatus: "sent",
      };
      if (chatId) {
        const confirmedChatId = chatId;
        setChannels((previous: ChatRecord[]) =>
          updateConversationPreview(previous, {
            chatId: confirmedChatId,
            message: previewMessage,
            createConversation:
              selectedChatSnapshot.type === "person" && !hadConversationId
                ? () => {
                    const peer = selectedChatSnapshot.raw || selectedChatSnapshot;
                    const previewTimestamp = getConversationPreviewTimestamp(
                      previewMessage,
                      new Date().toISOString(),
                    );
                    return {
                      id: confirmedChatId,
                      chat_id: confirmedChatId,
                      chatId: confirmedChatId,
                      type: "direct",
                      isDirect: true,
                      participants: [currentUser, peer].filter(Boolean),
                      lastMessage: previewMessage,
                      last_message: previewMessage,
                      lastMessageAt: previewTimestamp,
                      last_message_at: previewTimestamp,
                      unreadCount: 0,
                      unread_count: 0,
                    };
                  }
                : undefined,
          }),
        );
        setBuddies((previous: ChatRecord[]) =>
          updateDirectBuddyPreview(previous, selectedChatSnapshot, previewMessage),
        );
      }

      return { success: true, chatId, confirmed: confirmedWithClientId, hadConversationId };
    } catch (error) {
      const cancelled =
        uploadController.signal.aborted || cancelRequestedRef.current.has(pending.clientMessageId);
      if (cancelled) {
        const uploadedIds = attachments
          .map((attachment) => attachment.attachmentId)
          .filter(Boolean) as string[];
        if (chatId && uploadedIds.length > 0) {
          await Promise.allSettled(
            uploadedIds.map((attachmentId) =>
              deleteConversationFileService(chatId!, attachmentId).catch(() => undefined),
            ),
          );
        }

        const cancelledAttachments = attachments.map((attachment) => ({
          ...attachment,
          attachmentId: undefined,
        }));
        await persistPendingUpdate(pending.clientMessageId, {
          status: "cancelled",
          error: "Upload cancelled.",
          unknownOutcome: false,
          nextRetryAt: undefined,
          attachments: cancelledAttachments,
          ...(chatId ? { chatId } : {}),
        });
        updatePendingMessageState(
          { ...pending, attachments: cancelledAttachments, ...(chatId ? { chatId } : {}) },
          "cancelled",
          "Upload cancelled.",
          selectedChatSnapshot,
        );
        return { success: false, hadConversationId };
      }

      const unknownOutcome = isUnknownSendError(error);
      const errorMessage = pendingChatSendErrorMessage(error);
      const failureStatus = unknownOutcome ? "retrying" : "failed";
      const failedAttachments = attachments.map((attachment) => ({
        ...attachment,
        attachmentId: undefined,
      }));

      // A terminal validation/upload failure must not leave successfully
      // uploaded files orphaned on the server. Unknown outcomes keep the
      // uploaded IDs because the idempotent retry may still complete the send.
      if (!unknownOutcome) {
        const uploadedIds = attachments
          .map((attachment) => attachment.attachmentId)
          .filter(Boolean) as string[];
        if (chatId && uploadedIds.length > 0) {
          await Promise.allSettled(
            uploadedIds.map((attachmentId) =>
              deleteConversationFileService(chatId!, attachmentId).catch(() => undefined),
            ),
          );
        }
      }

      await persistPendingUpdate(pending.clientMessageId, {
        status: failureStatus,
        error: errorMessage,
        unknownOutcome,
        ...(!unknownOutcome ? { attachments: failedAttachments } : {}),
        ...(unknownOutcome
          ? {
              nextRetryAt:
                Date.now() + Math.min(60_000, 2_000 * 2 ** Math.min(pending.attempts, 5)),
            }
          : { nextRetryAt: undefined }),
      });
      updatePendingMessageState(
        pending,
        failureStatus,
        unknownOutcome ? undefined : errorMessage,
        selectedChatSnapshot,
      );
      if (!unknownOutcome) setSendError(normalizeChatError(error));
      if (unknownOutcome && typeof window !== "undefined") {
        const delay = Math.min(60_000, 2_000 * 2 ** Math.min(pending.attempts, 5));
        window.setTimeout(() => {
          void pendingSendRetryRef?.current?.(pending.clientMessageId);
        }, delay);
      }
      return { success: false, hadConversationId };
    } finally {
      uploadControllersRef.current.delete(pending.clientMessageId);
      cancelRequestedRef.current.delete(pending.clientMessageId);
      if (latestUploadClientMessageIdRef.current === pending.clientMessageId) {
        latestUploadClientMessageIdRef.current = null;
      }
      if (messageAccepted) setUploadProgress([]);
    }
  };

  const retryPendingSend = async (clientMessageId: string): Promise<void> => {
    const existingAttempt = activePendingSends.get(clientMessageId);
    if (existingAttempt) return existingAttempt;

    const attempt = (async () => {
      const pending = await getPendingChatSend(clientMessageId);
      if (!pending || pending.ownerUserId !== currentUserId) return;
      if (pending.status === "accepted" || pending.status === "cancelled") return;

      const optimisticMessage = pendingChatSendToOptimisticMessage(pending, currentUser);
      const chatSnapshot = {
        id: pending.localChatKey,
        chatId: pending.chatId,
        type: pending.targetType === "channel" ? "channel" : "person",
        userId: pending.targetId,
      };
      const keys = pendingChatSendMessageKeys(pending, selectedChat);
      setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
        const next = { ...previous };
        keys.forEach((key) => {
          next[key] = mergeChatMessages(previous[key] || [], [optimisticMessage]);
        });
        return next;
      });
      await sendPendingRecord(pending, optimisticMessage, chatSnapshot, Boolean(pending.chatId));
    })().finally(() => {
      activePendingSends.delete(clientMessageId);
    });
    activePendingSends.set(clientMessageId, attempt);
    return attempt;
  };

  if (pendingSendRetryRef) pendingSendRetryRef.current = retryPendingSend;

  const handleSend = async (messageOverride?: string) => {
    const hasMessageOverride = typeof messageOverride === "string";
    const text = (hasMessageOverride ? messageOverride : inputValueRef.current).trim();
    const filesToSend = pendingFilesRef.current.slice();
    if ((!text && filesToSend.length === 0) || !selectedChat) return;

    if (selectedChat.type === "person" && blockedUserIds.includes(String(selectedChat.id))) {
      setSendError("Unblock this user before sending messages.");
      return;
    }
    const clientSequence = ++clientSequenceRef.current;
    const mentionedUsers = textContainsMention(text, MENTION_ALL_LABEL)
      ? [{ userId: "*", displayName: MENTION_ALL_LABEL, email: "" }]
      : uniqueUsersByIdentity(selectedMentionableUsers)
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
    const replyTargetId = getReplyTargetId(replyToMessage);
    const messageOptions = {
      metadata: {
        ...(mentionedUsers.length ? { mentions: mentionedUsers } : {}),
        clientSequence,
      },
      ...(replyTargetId ? { replyTo: replyTargetId } : {}),
    };

    const clientMessageId = createClientMessageId();
    const sendStartedAt = performance.now();
    logChatTiming("send_started", {
      clientMessageId,
      chatType: selectedChat.type || "unknown",
      hasAttachments: filesToSend.length > 0,
    });
    const optimisticKeys = getOptimisticMessageKeys(selectedChat);
    const optimisticMessage = {
      ...createOptimisticMessage({
        selectedChat,
        currentUser,
        currentUserId,
        text,
        hasFiles: filesToSend.length > 0,
        clientMessageId,
        clientSequence,
        metadata: messageOptions.metadata,
      }),
      ...(replyTargetId ? { replyTo: replyTargetId, replyToMessageId: replyTargetId } : {}),
    };

    const pendingSend: PendingChatSend = {
      clientMessageId,
      ownerUserId: currentUserId,
      localChatKey: String(selectedChat.id || selectedChat.chatId || ""),
      ...(selectedChat.type === "channel"
        ? { chatId: String(selectedChat.id) }
        : selectedChat.chatId
          ? { chatId: String(selectedChat.chatId) }
          : {}),
      targetType: selectedChat.type === "channel" ? "channel" : "direct",
      targetId: String(selectedChat.type === "channel" ? selectedChat.id : selectedChat.id),
      text,
      metadata: messageOptions.metadata,
      ...(messageOptions.replyTo ? { replyTo: String(messageOptions.replyTo) } : {}),
      clientSequence,
      createdAt: String(optimisticMessage.createdAt),
      updatedAt: Date.now(),
      attempts: 0,
      status: "pending",
      attachments: filesToSend.map((file, index): PendingChatAttachment => ({
        key: `${index}-${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified,
        blob: file.slice(0, file.size, file.type || "application/octet-stream"),
      })),
    };

    setEditingSaving(Boolean(editingMessage));
    setSendError("");
    if (!editingMessage) {
      // Claim this client ID before the persistence await. Startup/reconnect
      // recovery can observe the record as soon as it is written and must not
      // launch a second in-flight attempt from this tab.
      activePendingSends.set(clientMessageId, Promise.resolve());
      try {
        // This write completes before any network request, so a refresh or
        // timeout cannot lose the original clientMessageId or file payload.
        await savePendingChatSend(pendingSend);
      } catch (error) {
        // IndexedDB is a reliability enhancement. A private-mode/browser
        // storage failure must not prevent the current send from proceeding.
        console.warn("Could not persist pending chat send", error);
      }

      setMessagesByChat((prev: Record<string, ChatRecord[]>) => {
        const next = { ...prev };
        optimisticKeys.forEach((key) => {
          next[key] = mergeChatMessages(prev[key] || [], [optimisticMessage]);
        });
        return next;
      });

      // Clear only the draft that was just queued. Do not clear the composer
      // again when this request resolves; the user may already be typing the
      // next message by then.
      if (!hasMessageOverride) setInputValue("");
      setPendingFiles([]);
      setReplyToMessage(null);

      const optimisticChatId =
        selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId || selectedChat.id;
      if (optimisticChatId) {
        setChannels((previous: ChatRecord[]) =>
          updateConversationPreview(previous, {
            chatId: optimisticChatId,
            message: optimisticMessage,
          }),
        );
        setBuddies((previous: ChatRecord[]) =>
          updateDirectBuddyPreview(previous, selectedChat, optimisticMessage),
        );
      }
    }
    logChatTiming("optimistic_queued", {
      clientMessageId,
      elapsedMs: Math.round(performance.now() - sendStartedAt),
    });
    try {
      const chatId = selectedChat.type === "channel" ? selectedChat.id : selectedChat.chatId;
      const hadConversationId = Boolean(chatId);

      if (editingMessage) {
        if (!chatId || !text || filesToSend.length > 0) return;
        const response: any = await editConversationMessageService(
          chatId,
          editingMessage.id,
          text,
          {
            metadata: { mentions: mentionedUsers },
          },
        );
        const responsePayload = response?.data?.data || response?.data;
        const updatedMessage = responsePayload
          ? normalizeRealtimeMessage(responsePayload, { ...selectedChat, currentUserId })
          : null;
        const editedAt = new Date().toISOString();

        setMessagesByChat((previous: Record<string, ChatRecord[]>) => {
          const next = { ...previous };
          Object.keys(next).forEach((key) => {
            next[key] = (next[key] || []).map((message) =>
              String(message.id) === String(editingMessage.id)
                ? {
                    ...message,
                    ...(updatedMessage || {}),
                    text,
                    edited: true,
                    editedAt: updatedMessage?.editedAt || editedAt,
                    metadata: {
                      ...(message.metadata || {}),
                      ...(updatedMessage?.metadata || {}),
                      edited: true,
                    },
                  }
                : message,
            );
          });
          return next;
        });
        await refreshSelectedChatMessages(chatId);
        setInputValue("");
        setPendingFiles([]);
        setEditingMessage(null);
        setReplyToMessage(null);
        return;
      }

      const requestStartedAt = performance.now();
      const attempt = sendPendingRecord(
        pendingSend,
        optimisticMessage,
        selectedChat,
        hadConversationId,
      );
      const trackedAttempt = attempt.then(
        () => undefined,
        () => undefined,
      );
      activePendingSends.set(clientMessageId, trackedAttempt);
      const result = await attempt;
      if (activePendingSends.get(clientMessageId) === trackedAttempt) {
        activePendingSends.delete(clientMessageId);
      }
      const sentChatId = result.chatId;
      if (!result.success) return;
      logChatTiming("send_request_completed", {
        clientMessageId,
        requestMs: Math.round(performance.now() - requestStartedAt),
        endToEndMs: Math.round(performance.now() - sendStartedAt),
      });
      console.log(
        `[CHAT PERFORMANCE] Full API duration: ${Math.round(
          performance.now() - requestStartedAt,
        )} ms`,
      );

      logChatTiming("optimistic_reconciled", {
        clientMessageId,
        elapsedMs: Math.round(performance.now() - sendStartedAt),
      });

      if (sentChatId) {
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
                const conversations = dedupeConversationRecords(refreshedConversations);
                if (selectedChat.type !== "person") return conversations;

                const conversationKey = String(sentChatId);
                const alreadyPresent = conversations.some((conversation) =>
                  [
                    conversation?.id,
                    conversation?.conversationId,
                    conversation?.conversation_id,
                    conversation?.chatId,
                    conversation?.chat_id,
                  ]
                    .filter(Boolean)
                    .map(String)
                    .includes(conversationKey),
                );
                if (alreadyPresent) return conversations;

                const peer = selectedChat.raw || selectedChat;
                conversations.push({
                  id: sentChatId,
                  chat_id: sentChatId,
                  chatId: sentChatId,
                  type: "direct",
                  isDirect: true,
                  participants: [currentUser, peer].filter(Boolean),
                  lastMessageAt: new Date().toISOString(),
                  lastMessage: {
                    id: `local-${Date.now()}`,
                    conversationId: sentChatId,
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
      if (!editingMessage) activePendingSends.delete(clientMessageId);
      setEditingSaving(false);
    }
  };

  return { handleSend, uploadProgress, cancelUpload };
}
