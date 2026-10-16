import {
  endConversationCallService,
  respondConversationCallService,
  startCallService,
} from "@/services/Team-chat/chat.service";
import { normalizeChatError } from "./chatHealper";
import { normalizeCall, PENDING_CALL_STORAGE_KEY } from "./ChatSystemUtils";

type ChatRecord = Record<string, any>;

type ChatCallActionsOptions = {
  activeCall: ChatRecord | null;
  blockedUserIds: string[];
  callResponding: boolean;
  callStarting: boolean;
  callsEnabled: boolean;
  incomingCall: ChatRecord | null;
  selectedChat: ChatRecord | null;
  setActiveCall: (value: any) => void;
  setCallError: (value: string) => void;
  setCallMinimized: (value: boolean) => void;
  setCallNotice: (value: string) => void;
  setCallResponding: (value: boolean) => void;
  setCallStarting: (value: boolean) => void;
  setIncomingCall: (value: any) => void;
  setSendError: (value: string) => void;
};

export function useChatCallActions({
  activeCall,
  blockedUserIds,
  callResponding,
  callStarting,
  callsEnabled,
  incomingCall,
  selectedChat,
  setActiveCall,
  setCallError,
  setCallMinimized,
  setCallNotice,
  setCallResponding,
  setCallStarting,
  setIncomingCall,
  setSendError,
}: ChatCallActionsOptions) {
  const handleStartConversationCall = async (type: "audio" | "video", options: ChatRecord = {}) => {
    if (!callsEnabled) return;
    if ((!selectedChat && !options.chatId) || callStarting) return;
    if (selectedChat?.type === "person" && blockedUserIds.includes(String(selectedChat.id))) {
      setCallNotice("Unblock this user before starting a call.");
      return;
    }

    setCallStarting(true);
    setSendError("");
    setCallError("");

    try {
      let chatId =
        options.chatId ||
        (selectedChat?.type === "channel" ? selectedChat.id : selectedChat?.chatId);
      // For person calls, resolve by the selected User Management/chat user ID.
      // This avoids stale conversation IDs after identity migrations. The
      // backend finds the existing direct conversation or creates one in the
      // same transactional call flow.
      const userId = selectedChat?.type === "person" ? selectedChat.id : undefined;
      const conversationId = selectedChat?.type === "person" ? undefined : chatId;
      if (!conversationId && !userId) {
        setSendError("Select a conversation or user before starting a call.");
        return;
      }

      let response: any;
      try {
        response = await startCallService({ conversationId, userId, type });
      } catch (error: any) {
        // A stale conversation ID or legacy participant mapping can return 404.
        // Retry by User Management ID so the backend can resolve/reuse the
        // canonical direct conversation before starting the call.
        if (conversationId && userId && error?.response?.status === 404) {
          response = await startCallService({ userId, type });
        } else {
          throw error;
        }
      }
      const call = response?.data?.data || response?.data || response;
      if (call?.status === "missed") {
        setActiveCall(null);
        setCallNotice("The user is offline, busy, or in Do Not Disturb. A missed call was saved.");
      } else {
        setActiveCall(call);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || normalizeChatError(error);
      const existingCall = error?.response?.data?.details?.call;
      if (existingCall?.id) setActiveCall(existingCall);
      setCallNotice(message);
    } finally {
      setCallStarting(false);
    }
  };

  const handleRespondToCall = async (action: "accept" | "decline") => {
    const chatId =
      incomingCall?.chatId ||
      incomingCall?.chat_id ||
      incomingCall?.conversationId ||
      incomingCall?.conversation_id;
    if (!incomingCall?.id || !chatId || callResponding) return;
    setCallResponding(true);
    setSendError("");
    setCallError("");
    try {
      const response: any = await respondConversationCallService(chatId, incomingCall.id, action);
      const call = normalizeCall(response?.data?.data || response?.data || response);
      setIncomingCall(null);
      localStorage.removeItem(PENDING_CALL_STORAGE_KEY);
      if (action === "accept") {
        setActiveCall(call);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || normalizeChatError(error);
      setCallError(message);
      setCallNotice(message);
      const code = error?.response?.data?.code;
      if (code === "CHAT_CALL_ALREADY_ANSWERED" || code === "CHAT_CALL_NOT_FOUND") {
        setIncomingCall(null);
      }
    } finally {
      setCallResponding(false);
    }
  };

  const handleEndActiveCall = async () => {
    if (!activeCall?.id || !activeCall?.chatId) {
      setActiveCall(null);
      setCallMinimized(false);
      return;
    }

    try {
      await endConversationCallService(activeCall.chatId, activeCall.id);
    } catch (error) {
      setCallNotice(normalizeChatError(error));
    } finally {
      setActiveCall(null);
      setCallMinimized(false);
    }
  };

  return { handleEndActiveCall, handleRespondToCall, handleStartConversationCall };
}
