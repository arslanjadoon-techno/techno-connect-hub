import { useCallback } from "react";
import { getBuddySendId, getImageUrl } from "./chatHealper";
import { showChatNotification, playCallNotificationSound } from "./chatNotifications";
import { CHAT_APP_BASE_PATH } from "./chatRoutes";
import { PENDING_CALL_STORAGE_KEY, normalizeCall } from "./ChatSystemUtils";

export function useChatRealtimeCalls({
  activeCall,
  incomingCall,
  blockedUserIds,
  buddies,
  currentUserId,
  setActiveCall,
  setIncomingCall,
  setCallError,
  setCallNotice,
}: any) {
  const handleRealtimeCallRinging = useCallback(
    ({ call }: any) => {
      const normalizedCall = normalizeCall(call);
      if (!normalizedCall?.id || activeCall?.id || incomingCall?.id) return;
      const callerId =
        normalizedCall.startedBy?.id ||
        normalizedCall.startedBy?.userId ||
        normalizedCall.startedBy?.user_id;
      if (blockedUserIds.includes(String(callerId))) return;
      if (String(callerId) === currentUserId) {
        setActiveCall(normalizedCall);
        return;
      }

      const callerProfile = buddies.find(
        (buddy: any) => String(getBuddySendId(buddy)) === String(callerId),
      );
      setCallError("");
      setIncomingCall(normalizedCall);
      localStorage.setItem(PENDING_CALL_STORAGE_KEY, JSON.stringify(normalizedCall));
      showChatNotification({
        title: `Incoming ${normalizedCall.type === "video" ? "video" : "audio"} call`,
        body: `${normalizedCall.startedBy?.name || "A chat user"} is calling you`,
        icon: getImageUrl(callerProfile || normalizedCall.startedBy),
        tag: `chat-call-${normalizedCall.id}`,
        url: `${CHAT_APP_BASE_PATH}/${encodeURIComponent(normalizedCall.chatId || "")}`,
        preserveCall: true,
        requireInteraction: true,
      });
      playCallNotificationSound();
    },
    [
      activeCall?.id,
      blockedUserIds,
      buddies,
      currentUserId,
      incomingCall?.id,
      setActiveCall,
      setCallError,
      setIncomingCall,
    ],
  );

  const handleRealtimeCallAccepted = useCallback(
    ({ call }: any) => {
      if (!call?.id) return;
      const peerId = call.startedBy?.id || call.startedBy?.userId || call.startedBy?.user_id;
      if (blockedUserIds.includes(String(peerId)) && String(peerId) !== currentUserId) return;
      const acceptedById =
        call.acceptedBy?.id || call.acceptedBy?.userId || call.acceptedBy?.user_id;
      if (
        String(acceptedById) !== String(currentUserId) &&
        String(peerId) !== String(currentUserId)
      )
        return;
      setIncomingCall((previous: any) => (previous?.id === call.id ? null : previous));
      setActiveCall(call);
      showChatNotification({
        title: "Call accepted",
        body: "Your chat call is ready.",
        tag: `chat-call-${call.id}`,
      });
    },
    [blockedUserIds, currentUserId, setActiveCall, setIncomingCall],
  );

  const handleRealtimeCallClosed = useCallback(
    ({ call }: any) => {
      if (!call?.id) return;
      localStorage.removeItem(PENDING_CALL_STORAGE_KEY);
      setIncomingCall((previous: any) => (previous?.id === call.id ? null : previous));
      setActiveCall((previous: any) => (previous?.id === call.id ? null : previous));
    },
    [setActiveCall, setIncomingCall],
  );

  const handleRealtimeCallDeclined = useCallback(
    ({ call }: any) => {
      handleRealtimeCallClosed({ call });
      if (String(call?.startedBy?.id) === currentUserId) {
        showChatNotification({
          title: "Call declined",
          body: "The other user declined your call.",
          tag: `chat-call-${call?.id}`,
        });
      }
    },
    [currentUserId, handleRealtimeCallClosed],
  );

  const handleRealtimeCallCancelled = useCallback(
    ({ call }: any) => {
      handleRealtimeCallClosed({ call });
      if (String(call?.startedBy?.id) !== currentUserId) {
        showChatNotification({
          title: "Call cancelled",
          body: `${call?.startedBy?.name || "The caller"} cancelled the call.`,
          tag: `chat-call-${call?.id}`,
        });
      }
    },
    [currentUserId, handleRealtimeCallClosed],
  );

  const handleRealtimeCallEnded = useCallback(
    ({ call }: any) => {
      if (!call?.id) return;
      setActiveCall((previous: any) => (previous?.id === call.id ? null : previous));
    },
    [setActiveCall],
  );

  const handleRealtimeCallMissed = useCallback(
    ({ call }: any) => {
      if (!call?.id) return;
      setIncomingCall((previous: any) => (previous?.id === call.id ? null : previous));
      setActiveCall((previous: any) => (previous?.id === call.id ? null : previous));
      setCallNotice("The user is offline, busy, or in Do Not Disturb. A missed call was saved.");
    },
    [setActiveCall, setCallNotice, setIncomingCall],
  );

  return {
    handleRealtimeCallRinging,
    handleRealtimeCallAccepted,
    handleRealtimeCallClosed,
    handleRealtimeCallDeclined,
    handleRealtimeCallCancelled,
    handleRealtimeCallEnded,
    handleRealtimeCallMissed,
  };
}
