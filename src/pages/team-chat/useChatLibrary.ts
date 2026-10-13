import { useEffect } from "react";
import { searchChatMessagesService } from "@/services/Team-chat/chat.service";
import { normalizeChatMessages } from "./chatMessageNormalization";

export function useChatLibrary({ bodyView, currentUserId, setLibraryLoading, setLibraryError, setLibraryMessages }: any) {
  useEffect(() => {
    if (bodyView !== "calls" && bodyView !== "media") return undefined;
    let cancelled = false;
    setLibraryLoading(true);
    setLibraryError("");

    searchChatMessagesService({ type: bodyView, limit: 100 })
      .then((response: any) => {
        if (cancelled) return;
        const messages =
          response.data?.data?.messages || response.data?.data?.data || response.data?.data || [];
        setLibraryMessages(normalizeChatMessages(messages, { currentUserId }));
      })
      .catch((error) => {
        if (!cancelled) setLibraryError(error instanceof Error ? error.message : "Unable to load chat library.");
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bodyView, currentUserId, setLibraryError, setLibraryLoading, setLibraryMessages]);
}
