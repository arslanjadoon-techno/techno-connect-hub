import { useEffect, useMemo, useRef } from "react";
import { getBuddyEmail, getBuddyName, getChannelId, getChannelName } from "./chatHealper";

type ChatRecord = Record<string, any>;

type ChatLifecycleOptions = {
  activeCall: ChatRecord | null;
  conversationItems: ChatRecord[];
  fetchChatData: () => Promise<unknown>;
  searchChatUsers: (search: string) => Promise<unknown>;
  initialFetchStartedRef: { current: boolean };
  loadChannelHistory: (chat: ChatRecord) => Promise<unknown>;
  loadDirectChatHistory: (chat: ChatRecord) => Promise<unknown>;
  loadedChatHistoryRef: { current: Set<string> };
  routeChatId?: string;
  searchTerm: string;
  selectedChat: ChatRecord | null;
  setCallMinimized: (value: boolean) => void;
  setEditingMessage: (value: ChatRecord | null) => void;
  setPendingFiles: (value: File[]) => void;
  setReplyToMessage: (value: ChatRecord | null) => void;
};

export function useChatLifecycle({
  activeCall,
  conversationItems,
  fetchChatData,
  searchChatUsers,
  initialFetchStartedRef,
  loadChannelHistory,
  loadDirectChatHistory,
  loadedChatHistoryRef,
  routeChatId,
  searchTerm,
  selectedChat,
  setCallMinimized,
  setEditingMessage,
  setPendingFiles,
  setReplyToMessage,
}: ChatLifecycleOptions) {
  const previousRouteChatIdRef = useRef<string | undefined>();
  const historySelectedChatRef = useRef(selectedChat);
  historySelectedChatRef.current = selectedChat;
  const historyChatId = String(selectedChat?.id ?? "");
  const historyConversationId = String(selectedChat?.chatId ?? "");
  const historyChatType = String(selectedChat?.type ?? "");

  useEffect(() => {
    const normalizedRouteChatId = routeChatId ? String(routeChatId) : "";
    const previousRouteChatId = previousRouteChatIdRef.current;
    previousRouteChatIdRef.current = normalizedRouteChatId;

    if (initialFetchStartedRef.current) {
      if (previousRouteChatId === normalizedRouteChatId || !normalizedRouteChatId) return;
      void fetchChatData();
      return;
    }

    initialFetchStartedRef.current = true;
    void fetchChatData();
  }, [fetchChatData, initialFetchStartedRef, routeChatId]);

  useEffect(() => {
    const query = searchTerm.trim();
    const timer = window.setTimeout(
      () => {
        searchChatUsers(query).catch(() => {
          // Keep the previous list visible when a search request fails.
        });
      },
      query ? 250 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [searchChatUsers, searchTerm]);

  useEffect(() => {
    const chat = historySelectedChatRef.current;
    if (!chat) return;
    if (
      historyChatType === "person" &&
      historyChatId &&
      !loadedChatHistoryRef.current.has(historyChatId)
    ) {
      loadDirectChatHistory(chat);
    }
  }, [
    historyChatId,
    historyChatType,
    historyConversationId,
    loadDirectChatHistory,
    loadedChatHistoryRef,
  ]);

  useEffect(() => {
    const chat = historySelectedChatRef.current;
    if (!chat) return;
    if (
      historyChatType === "channel" &&
      historyChatId &&
      !loadedChatHistoryRef.current.has(historyChatId)
    ) {
      loadChannelHistory(chat);
    }
  }, [historyChatId, historyChatType, loadChannelHistory, loadedChatHistoryRef]);

  useEffect(() => {
    setPendingFiles([]);
    setReplyToMessage(null);
    setEditingMessage(null);
  }, [selectedChat?.id, setEditingMessage, setPendingFiles, setReplyToMessage]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return conversationItems.filter((item) => {
      const isChannel = item.__conversationType === "channel";
      const name = String(isChannel ? getChannelName(item) : getBuddyName(item));
      const secondary = String(isChannel ? getChannelId(item) : getBuddyEmail(item));
      return !term || name.toLowerCase().includes(term) || secondary.toLowerCase().includes(term);
    });
  }, [conversationItems, searchTerm]);

  const activeCallIsAccepted = activeCall?.status === "accepted";

  useEffect(() => {
    if (activeCall?.id) setCallMinimized(false);
  }, [activeCall?.id, setCallMinimized]);

  return { activeCallIsAccepted, filteredItems };
}
