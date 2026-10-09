import type { Room, RemoteParticipant } from "livekit-client";

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "accepted" | "ended" | string;

export interface ChatCall {
  id: string | number;
  chatId: string | number;
  type: CallType;
  status: CallStatus;
  startedBy?: { name?: string; avatarUrl?: string };
}

export interface ChatParticipant {
  id?: string | number;
  userId?: string | number;
  user_id?: string | number;
  email?: string;
  name?: string;
}

export interface SelectedChat {
  type?: string;
  title?: string;
  subtitle?: string;
  raw?: ChatParticipant & { participants?: ChatParticipant[] };
}

export type CurrentUser = ChatParticipant;

export interface CallPanelProps {
  activeCall: ChatCall | null;
  modal?: boolean;
  onMinimize?: () => void;
  onEnd: () => void;
}

export type RemoteCallParticipant = RemoteParticipant;
export type CallRoom = Room;
