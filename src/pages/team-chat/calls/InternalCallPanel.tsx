import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, MonitorDown, PhoneOff, Video, VideoOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/api/client";
import { Room, RoomEvent, type RemoteParticipant } from "livekit-client";
import type { CallPanelProps } from "./callTypes";

export default function InternalCallPanel({
  activeCall,
  modal = false,
  onMinimize,
  onEnd,
}: CallPanelProps) {
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(true);
  const [status, setStatus] = useState("Connecting");
  const [error, setError] = useState("");
  const accepted = activeCall?.status === "accepted";
  const video = activeCall?.type === "video";
  useEffect(() => {
    if (!accepted || !activeCall?.chatId || !activeCall.id) return;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;
    const refresh = () => setParticipants(Array.from(room.remoteParticipants.values()));
    const connect = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL.replace(/\/$/, "")}/api/v1/chat/${activeCall.chatId}/calls/${activeCall.id}/livekit-token`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken() || ""}`, "X-App-Name": "chat" },
          },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Could not join the call");
        await room.connect(body.data.url, body.data.token);
        if (cancelled) return;
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(video);
        setStatus("Connected");
        refresh();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not connect to the call");
      }
    };
    room
      .on(RoomEvent.ParticipantConnected, refresh)
      .on(RoomEvent.ParticipantDisconnected, refresh)
      .on(RoomEvent.Reconnecting, () => setStatus("Reconnecting"))
      .on(RoomEvent.Reconnected, () => setStatus("Connected"))
      .on(RoomEvent.Disconnected, () => setStatus("Disconnected"));
    connect();
    return () => {
      cancelled = true;
      room.disconnect();
      roomRef.current = null;
      setParticipants([]);
    };
  }, [activeCall?.chatId, activeCall?.id, accepted, video]);
  const toggle = async (kind: "audio" | "video") => {
    const enabled = kind === "audio" ? !mic : !camera;
    if (kind === "audio") {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(enabled);
      setMic(enabled);
    } else {
      await roomRef.current?.localParticipant.setCameraEnabled(enabled);
      setCamera(enabled);
    }
  };
  if (!activeCall) return null;
  if (!accepted)
    return (
      <div className="flex items-center justify-between bg-orange-50 p-3 text-sm text-orange-900">
        Calling — waiting for an answer{" "}
        <Button size="sm" variant="outline" onClick={onEnd}>
          Cancel
        </Button>
      </div>
    );
  return (
    <div className={`overflow-hidden bg-slate-950 text-white ${modal ? "rounded-lg" : ""}`}>
      {video ? (
        <div
          className={`grid gap-2 p-2 ${modal ? "min-h-[420px]" : "min-h-[220px]"} grid-cols-[repeat(auto-fit,minmax(180px,1fr))]`}
        >
          <div className="relative min-h-[180px] overflow-hidden rounded bg-slate-900">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-2 left-2 text-xs">You</span>
          </div>
          {participants.map((p) => (
            <ParticipantTile key={p.identity} participant={p} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[110px] items-center justify-center gap-2">
          <Video className="h-10 w-10 text-blue-300" />
          <span>
            {participants.length + 1} connected · {status}
          </span>
        </div>
      )}
      {error && (
        <Alert variant="destructive" className="m-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-center gap-2 pb-3">
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={() => toggle("audio")}
        >
          {mic ? <Mic /> : <MicOff />}
        </Button>
        {video && (
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => toggle("video")}
          >
            {camera ? <Video /> : <VideoOff />}
          </Button>
        )}
        {modal && onMinimize && (
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={onMinimize}
          >
            <MonitorDown />
          </Button>
        )}
        <Button variant="destructive" onClick={onEnd}>
          <PhoneOff /> End
        </Button>
      </div>
    </div>
  );
}

function ParticipantTile({ participant }: { participant: RemoteParticipant }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const publication = Array.from(participant.videoTrackPublications.values()).find(
      (p) => p.isSubscribed && p.track,
    );
    if (publication?.track && ref.current) publication.track.attach(ref.current);
    return () => {
      if (publication?.track && ref.current) publication.track.detach(ref.current);
    };
  }, [participant]);
  return (
    <div className="relative min-h-[180px] overflow-hidden rounded bg-slate-900">
      <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
      <span className="absolute bottom-2 left-2 text-xs">
        {participant.name || participant.identity}
      </span>
    </div>
  );
}
