import { useEffect, useMemo } from "react";
import {
  getBuddyEmail,
  getBuddyName,
  getBuddySendId,
  getChannelId,
  getChannelName,
} from "./chatHealper";

type ChatRecord = Record<string, any>;

type ChatLifecycleOptions = {
  activeCall: ChatRecord | null;
  chatBoxRef: { current: HTMLDivElement | null };
  conversationItems: ChatRecord[];
  fetchChatData: () => Promise<unknown>;
  initialFetchStartedRef: { current: boolean };
  loadChannelHistory: (chat: ChatRecord) => Promise<unknown>;
  loadDirectChatHistory: (chat: ChatRecord) => Promise<unknown>;
  loadedChatHistoryRef: { current: Set<string> };
  messagesByChat: Record<string, ChatRecord[]>;
  searchTerm: string;
  selectedChat: ChatRecord | null;
  setCallMinimized: (value: boolean) => void;
  setEditingMessage: (value: ChatRecord | null) => void;
  setPendingFiles: (value: File[]) => void;
  setReplyToMessage: (value: ChatRecord | null) => void;
};

export function useChatLifecycle({
  activeCall,
  chatBoxRef,
  conversationItems,
  fetchChatData,
  initialFetchStartedRef,
  loadChannelHistory,
  loadDirectChatHistory,
  loadedChatHistoryRef,
  messagesByChat,
  searchTerm,
  selectedChat,
  setCallMinimized,
  setEditingMessage,
  setPendingFiles,
  setReplyToMessage,
}: ChatLifecycleOptions) {
  useEffect(() => {
    if (initialFetchStartedRef.current) return;

    initialFetchStartedRef.current = true;
    fetchChatData();
  }, [fetchChatData]);

  useEffect(() => {
    if (
      selectedChat?.type === "person" &&
      selectedChat.id &&
      !loadedChatHistoryRef.current.has(selectedChat.id)
    ) {
      loadDirectChatHistory(selectedChat);
    }
  }, [loadDirectChatHistory, selectedChat]);

  useEffect(() => {
    if (
      selectedChat?.type === "channel" &&
      selectedChat.id &&
      !loadedChatHistoryRef.current.has(selectedChat.id)
    ) {
      loadChannelHistory(selectedChat);
    }
  }, [loadChannelHistory, selectedChat]);

  useEffect(() => {
    const scrollToLatest = () => {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    };
    const frame = requestAnimationFrame(scrollToLatest);
    const timer = window.setTimeout(scrollToLatest, 50);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [messagesByChat, selectedChat]);

  useEffect(() => {
    setPendingFiles([]);
    setReplyToMessage(null);
    setEditingMessage(null);
  }, [selectedChat?.id]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return conversationItems.filter((item) => {
      const isChannel = item.__conversationType === "channel";
      const name = String(isChannel ? getChannelName(item) : getBuddyName(item));
      const secondary = String(isChannel ? getChannelId(item) : getBuddyEmail(item));
      return !term || name.toLowerCase().includes(term) || secondary.toLowerCase().includes(term);
    });
  }, [conversationItems, searchTerm]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.groupCollapsed("[Pingly chat] rendered conversation list");
    console.table(
      filteredItems.map((item) => ({
        tab: item.__conversationType === "channel" ? "Groups" : "Chats",
        name: item.__conversationType === "channel" ? getChannelName(item) : getBuddyName(item),
        id: item.__conversationType === "channel" ? getChannelId(item) : getBuddySendId(item),
        conversationId: item.directConversationId || item.chatId || item.chat_id || item.id,
        lastActivity:
          item.lastMessageAt || item.lastMessage?.createdAt || item.lastMessageTime || "",
      })),
    );
    console.groupEnd();
  }, [filteredItems]);

  const activeCallIsAccepted = activeCall?.status === "accepted";

  useEffect(() => {
    if (activeCall?.id) setCallMinimized(false);
  }, [activeCall?.id]);

  return { activeCallIsAccepted, filteredItems };
}
