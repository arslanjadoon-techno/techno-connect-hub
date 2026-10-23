import { useEffect, useRef } from "react";
import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { getToken } from "@/lib/api/client";
import { CHAT_API_BASE_URL } from "@/lib/config";

// The token and app name travel in the query string because browsers cannot send
// custom headers on a WebSocket handshake. The server reads both from the query.
const getHubUrl = () => {
  const token = encodeURIComponent(
    getToken()
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "",
  );

  return `${CHAT_API_BASE_URL}/hubs/chat?appName=chat&token=${token}`;
};

type RealtimeHandler = (payload?: any) => void;
type RealtimePayload = Record<string, any> | string | number;

type RealtimeOptions = {
  enabled?: boolean;
  activeConversationId?: string | number | null;

  onMessage?: RealtimeHandler;
  onMessageAccepted?: RealtimeHandler;
  onMessageFailed?: RealtimeHandler;
  onReconnected?: RealtimeHandler;
  onMessageUpdated?: RealtimeHandler;
  onMessageDelivered?: RealtimeHandler;
  onTyping?: RealtimeHandler;
  onMessageRead?: RealtimeHandler;
  onMemberRemoved?: RealtimeHandler;
  onReactionAdded?: RealtimeHandler;
  onPresence?: RealtimeHandler;
  onAvatar?: RealtimeHandler;

  onCallStarted?: RealtimeHandler;
  onCallRinging?: RealtimeHandler;
  onCallAccepted?: RealtimeHandler;
  onCallDeclined?: RealtimeHandler;
  onCallCancelled?: RealtimeHandler;
  onCallEnded?: RealtimeHandler;
  onCallMissed?: RealtimeHandler;
  onCallPeerJoined?: RealtimeHandler;
  onCallPeerLeft?: RealtimeHandler;
  onCallSignal?: RealtimeHandler;
};

type ChatRealtimeClient = {
  emit: (event: string, payload?: RealtimePayload, acknowledge?: RealtimeHandler) => Promise<any>;
  on: (event: string, handler: RealtimeHandler) => void;
  off: (event: string, handler: RealtimeHandler) => void;
  readonly connected: boolean;
  disconnect: () => Promise<void>;
};

type JoinedCall = { chatId: string; callId: string };

const getPayloadObject = (payload: RealtimePayload | undefined): Record<string, any> =>
  payload && typeof payload === "object" ? payload : {};

const getConversationId = (payload: RealtimePayload | undefined): string => {
  if (typeof payload === "string" || typeof payload === "number") {
    return String(payload).trim();
  }

  const value = getPayloadObject(payload).chatId ?? getPayloadObject(payload).conversationId;
  return value === undefined || value === null ? "" : String(value).trim();
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "SignalR invocation failed";

export function useChatRealtime({
  enabled = true,
  activeConversationId,
  onMessage,
  onMessageAccepted,
  onMessageFailed,
  onReconnected,
  onMessageUpdated,
  onMessageDelivered,
  onTyping,
  onMessageRead,
  onMemberRemoved,
  onReactionAdded,
  onPresence,
  onAvatar,
  onCallStarted,
  onCallRinging,
  onCallAccepted,
  onCallDeclined,
  onCallCancelled,
  onCallEnded,
  onCallMissed,
  onCallPeerJoined,
  onCallPeerLeft,
  onCallSignal,
}: RealtimeOptions) {
  const ref = useRef<ChatRealtimeClient | null>(null);
  const active = useRef(activeConversationId);
  const handlers = useRef<Partial<Record<string, RealtimeHandler>>>({});

  // Preserve joined call rooms across automatic reconnects.
  const joinedCalls = useRef<Map<string, JoinedCall>>(new Map());

  active.current = activeConversationId;

  // Update callback references without rebuilding the SignalR connection.
  handlers.current = {
    onMessage,
    onMessageAccepted,
    onMessageFailed,
    onReconnected,
    onMessageUpdated,
    onMessageDelivered,
    onTyping,
    onMessageRead,
    onMemberRemoved,
    onReactionAdded,
    onPresence,
    onAvatar,
    onCallStarted,
    onCallRinging,
    onCallAccepted,
    onCallDeclined,
    onCallCancelled,
    onCallEnded,
    onCallMissed,
    onCallPeerJoined,
    onCallPeerLeft,
    onCallSignal,
  };

  useEffect(() => {
    if (!enabled || !getToken()) {
      ref.current = null;
      return undefined;
    }

    let disposed = false;

    const connection = new HubConnectionBuilder()
      .withUrl(getHubUrl(), {
        // Keep negotiation enabled for compatibility with the current
        // deployment and reverse-proxy configuration.
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    const events: Record<string, string> = {
      "message:new": "onMessage",
      "message:accepted": "onMessageAccepted",
      "message:failed": "onMessageFailed",
      "message:updated": "onMessageUpdated",
      "message:delivered": "onMessageDelivered",
      "typing:update": "onTyping",
      "message:read": "onMessageRead",
      "conversation:member-removed": "onMemberRemoved",
      "reaction:added": "onReactionAdded",
      "presence:update": "onPresence",
      "avatar:update": "onAvatar",
      "call:started": "onCallStarted",
      "call:ringing": "onCallRinging",
      "call:accepted": "onCallAccepted",
      "call:declined": "onCallDeclined",
      "call:cancelled": "onCallCancelled",
      "call:ended": "onCallEnded",
      "call:missed": "onCallMissed",
      "call:peer-joined": "onCallPeerJoined",
      "call:peer-left": "onCallPeerLeft",
      "call:signal": "onCallSignal",
    };

    const lifecycleEvents = new Set([
      "call:started",
      "call:ringing",
      "call:accepted",
      "call:declined",
      "call:cancelled",
      "call:ended",
      "call:missed",
    ]);

    Object.entries(events).forEach(([event, handlerName]) => {
      connection.on(event, (payload: any) => {
        const callback = handlers.current[handlerName];
        if (!callback) return;

        try {
          callback(lifecycleEvents.has(event) ? { call: payload } : payload);
        } catch (error) {
          console.error(`[Chat realtime] Handler failed for ${event}`, error);
        }
      });
    });

    const joinActiveConversation = async () => {
      const conversationId = active.current;
      if (
        conversationId === undefined ||
        conversationId === null ||
        String(conversationId).trim().length === 0
      ) {
        return;
      }

      // ChatHub.JoinConversation expects the conversation ID, not an object.
      try {
        await connection.invoke("JoinConversation", String(conversationId));
      } catch (error) {
        console.error("[Chat realtime] JoinConversation failed during connect/reconnect", {
          conversationId: String(conversationId),
          error,
        });
      }
    };

    connection.onreconnected(async () => {
      await joinActiveConversation();

      await Promise.all(
        Array.from(joinedCalls.current.values()).map(async (call) => {
          try {
            await connection.invoke("JoinCall", call);
          } catch (error) {
            console.warn("[Chat realtime] Failed to rejoin call room", call, error);
          }
        }),
      );

      handlers.current.onReconnected?.();
    });

    const methods: Record<string, string> = {
      "join:conversation": "JoinConversation",
      "leave:conversation": "LeaveConversation",
      "typing:update": "TypingUpdate",
      "join:call": "JoinCall",
      "leave:call": "LeaveCall",
      "call:signal": "CallSignal",
      // This requires an exact matching method on ChatHub.
      "message:delivered:ack": "AcknowledgeMessageDelivered",
    };

    const callKey = (payload: RealtimePayload | undefined) => {
      const value = getPayloadObject(payload);
      return `${value.chatId}:${value.callId}`;
    };

    const compat: ChatRealtimeClient = {
      emit: (event, payload = {}, acknowledge) => {
        const method = methods[event];
        if (!method) {
          const result = { ok: false, error: `Unsupported realtime event: ${event}` };
          acknowledge?.(result);
          return Promise.resolve(result);
        }

        if (connection.state !== HubConnectionState.Connected) {
          const result = { ok: false, error: "SignalR is not connected" };
          acknowledge?.(result);
          return Promise.resolve(result);
        }

        const payloadObject = getPayloadObject(payload);
        let invocation: Promise<any>;

        if (event === "join:conversation" || event === "leave:conversation") {
          const conversationId = getConversationId(payload);
          if (!conversationId) {
            const result = { ok: false, error: "conversationId is required" };
            acknowledge?.(result);
            return Promise.resolve(result);
          }

          // Important: pass the string ID positionally, matching the Hub method.
          invocation = connection.invoke(method, conversationId);
        } else if (event === "message:delivered:ack") {
          const chatId = payloadObject.chatId;
          const messageId = payloadObject.messageId;

          if (
            chatId === undefined ||
            chatId === null ||
            messageId === undefined ||
            messageId === null
          ) {
            const result = {
              ok: false,
              error: "chatId and messageId are required",
            };
            acknowledge?.(result);
            return Promise.resolve(result);
          }

          // Confirm this signature against ChatHub.cs before relying on it.
          invocation = connection.invoke(method, String(chatId), String(messageId));
        } else {
          // Other existing Hub methods use a single payload object.
          invocation = connection.invoke(method, payloadObject);
        }

        const trackedPromise = invocation
          .then((result) => {
            if (event === "join:call" && result?.ok) {
              joinedCalls.current.set(callKey(payload), {
                chatId: String(payloadObject.chatId),
                callId: String(payloadObject.callId),
              });
            }

            if (event === "leave:call") {
              joinedCalls.current.delete(callKey(payload));
            }

            return result ?? { ok: true };
          })
          .catch((error) => {
            const result = { ok: false, error: getErrorMessage(error) };
            console.error(`[Chat realtime] ${method} failed`, {
              event,
              payload,
              error,
            });
            return result;
          });

        if (typeof acknowledge === "function") {
          void trackedPromise.then((result) => acknowledge(result));
        }

        return trackedPromise;
      },

      on: (event, handler) => {
        if (event === "connect" || event === "reconnected") {
          connection.onreconnected(handler);
        } else {
          connection.on(event, handler);
        }
      },

      off: (event, handler) => {
        if (event === "connect" || event === "reconnected") {
          connection.off("reconnected", handler);
        } else {
          connection.off(event, handler);
        }
      },

      get connected() {
        return connection.state === HubConnectionState.Connected;
      },

      disconnect: async () => {
        await connection.stop();
      },
    };

    ref.current = compat;

    const startPromise = connection.start();
    startPromise
      .then(async () => {
        if (disposed) {
          await connection.stop();
          return;
        }

        await joinActiveConversation();
      })
      .catch((error) => {
        if (!disposed) {
          console.error("[Chat realtime] Unable to connect", error);
        }
      });

    return () => {
      disposed = true;
      if (ref.current === compat) ref.current = null;
      joinedCalls.current.clear();

      // Wait for start/negotiation to settle before stopping the connection.
      void startPromise.then(() => connection.stop()).catch(() => undefined);
    };
  }, [enabled]);

  useEffect(() => {
    const connection = ref.current;
    if (!connection) return undefined;

    if (
      activeConversationId === undefined ||
      activeConversationId === null ||
      String(activeConversationId).trim().length === 0
    ) {
      return undefined;
    }

    const conversationId = String(activeConversationId);

    void connection.emit("join:conversation", { chatId: conversationId }).then((result) => {
      if (result?.ok === false) {
        console.warn("[Chat realtime] Active conversation join did not complete", {
          conversationId,
          error: result.error,
        });
      }
    });

    return () => {
      void connection.emit("leave:conversation", { chatId: conversationId }).then((result) => {
        if (result?.ok === false) {
          console.warn("[Chat realtime] Active conversation leave did not complete", {
            conversationId,
            error: result.error,
          });
        }
      });
    };
  }, [activeConversationId, enabled]);

  return ref;
}
