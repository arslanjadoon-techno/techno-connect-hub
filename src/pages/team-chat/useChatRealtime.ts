import { useEffect, useRef } from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { getToken } from "@/lib/api/client";
import { CHAT_API_BASE_URL } from "@/lib/config";

// The token and app name travel in the query string because browsers cannot send
// custom headers on a WebSocket handshake. The server reads both from the query
// (JwtBearer OnMessageReceived and ChatHub.GetCurrentAppName).
const getHubUrl = () => {
  const token = encodeURIComponent(
    getToken()
      ?.replace(/^Bearer\s+/i, "")
      .trim() || "",
  );
  return `${CHAT_API_BASE_URL}/hubs/chat?appName=chat&token=${token}`;
};

type RealtimeHandler = (payload?: any) => void;

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
  const ref = useRef<any>(null);
  const active = useRef(activeConversationId);
  const handlers = useRef<Partial<Record<string, RealtimeHandler>>>({});
  // Calls this client has joined. The server drops a connection from its call rooms when it
  // disconnects, so after an automatic reconnect we must join them again.
  const joinedCalls = useRef<Map<string, { chatId: string; callId: string }>>(new Map());
  active.current = activeConversationId;
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
    if (!enabled || !getToken()) return undefined;
    let disposed = false;
    const connection = new HubConnectionBuilder()
      .withUrl(getHubUrl(), {
        // Latency: connect straight over a WebSocket. This skips the extra "negotiate" HTTP
        // round trip and avoids falling back to slow long-polling.
        // NOTE: with skipNegotiation there is no fallback, so the server and any proxy or
        // load balancer in front of it must allow WebSockets. If that cannot be guaranteed,
        // remove `skipNegotiation` and keep only `transport`.
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
        // Authenticate SignalR with the Bearer token, not cookies.
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
    const events = {
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
    Object.entries(events).forEach(([event, handler]) =>
      connection.on(event, (payload: any) =>
        handlers.current[handler]?.(lifecycleEvents.has(event) ? { call: payload } : payload),
      ),
    );
    connection.onreconnected(async () => {
      try {
        if (active.current) await connection.invoke("JoinConversation", String(active.current));
        // The server removed this connection from its call rooms when it dropped, so without
        // this, CallSignal would fail with CHAT_CALL_NOT_JOINED for the rest of the call.
        await Promise.all(
          Array.from(joinedCalls.current.values()).map((call) =>
            connection.invoke("JoinCall", call).catch(() => undefined),
          ),
        );
      } catch {
        // Rejoin is best effort; the onReconnected handler below still runs.
      } finally {
        handlers.current.onReconnected?.();
      }
    });
    const methods: Record<string, string> = {
      "join:conversation": "JoinConversation",
      "leave:conversation": "LeaveConversation",
      "typing:update": "TypingUpdate",
      "join:call": "JoinCall",
      "leave:call": "LeaveCall",
      "call:signal": "CallSignal",
    };
    const callKey = (payload: any) => `${payload?.chatId}:${payload?.callId}`;
    const compat = {
      emit: (event: string, payload?: any, acknowledge?: RealtimeHandler) => {
        const method = methods[event];
        // Invoking before start() finishes (or while reconnecting) makes SignalR reject.
        // Fail softly instead, and let the start()/reconnect handlers do the joining.
        if (!method || connection.state !== HubConnectionState.Connected) {
          acknowledge?.({ ok: false });
          return Promise.resolve({ ok: false });
        }
        const promise = connection.invoke(method, payload).then((result) => {
          // Remember joined calls so they can be rejoined after a reconnect.
          if (event === "join:call" && result?.ok) {
            joinedCalls.current.set(callKey(payload), {
              chatId: payload?.chatId,
              callId: payload?.callId,
            });
          }
          if (event === "leave:call") joinedCalls.current.delete(callKey(payload));
          return result;
        });
        if (typeof acknowledge === "function")
          promise
            .then((result) => acknowledge(result ?? { ok: true }))
            .catch(() => acknowledge({ ok: false }));
        return promise;
      },
      on: (event: string, handler: RealtimeHandler) => {
        if (event === "connect") connection.onreconnected(handler);
        else if (event === "reconnected") connection.onreconnected(handler);
        else connection.on(event, handler);
      },
      off: (event: string, handler: RealtimeHandler) => {
        if (event === "connect" || event === "reconnected") connection.off("reconnected", handler);
        else connection.off(event, handler);
      },
      get connected() {
        return connection.state === HubConnectionState.Connected;
      },
      disconnect: () => connection.stop(),
    };
    ref.current = compat;
    const startPromise = connection.start();
    startPromise
      .then(() => {
        if (disposed) return connection.stop();
        if (active.current) return connection.invoke("JoinConversation", String(active.current));
        return undefined;
      })
      .catch((error) => {
        // React can dispose this effect while SignalR is negotiating. That is expected.
        if (!disposed) console.error("[Chat realtime] Unable to connect", error);
      });
    return () => {
      disposed = true;
      ref.current = null;
      joinedCalls.current.clear();
      // Do not stop while SignalR is negotiating; that produces a misleading
      // "connection was stopped during negotiation" error in React StrictMode.
      void startPromise.then(() => connection.stop()).catch(() => undefined);
    };
  }, [enabled]);
  useEffect(() => {
    const connection = ref.current;
    if (!connection || !activeConversationId) return undefined;
    // If the connection is not ready yet, emit() fails softly and the start()/reconnect
    // handlers above join the active conversation once it is connected.
    void connection.emit("join:conversation", String(activeConversationId));
    return () => {
      void connection.emit("leave:conversation", String(activeConversationId));
    };
  }, [activeConversationId, enabled]);
  return ref;
}
