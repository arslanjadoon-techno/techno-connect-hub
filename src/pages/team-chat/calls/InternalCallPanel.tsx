import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, MonitorDown, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  MeetingSessionStatusCode,
  type AudioVideoFacade,
  type AudioVideoObserver,
  type VideoTileState,
} from "amazon-chime-sdk-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/api/client";
import type { CallPanelProps } from "./callTypes";

interface ChimeMeeting {
  MeetingId: string;
  ExternalMeetingId?: string;
  MediaRegion?: string;
  MediaPlacement: Record<string, string | undefined>;
}

interface ChimeAttendee {
  AttendeeId: string;
  ExternalUserId?: string;
  JoinToken: string;
}

interface ChimeCredentialsResponse {
  success?: boolean;
  data?: {
    provider?: string;
    meeting?: ChimeMeeting;
    attendee?: ChimeAttendee;
  };
  error?: string;
  message?: string;
}

export default function InternalCallPanel({
  activeCall,
  modal = false,
  onMinimize,
  onEnd,
}: CallPanelProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sessionRef = useRef<DefaultMeetingSession | null>(null);
  const [tiles, setTiles] = useState<Record<number, VideoTileState>>({});
  const [mic, setMic] = useState(true);
  const [camera, setCamera] = useState(activeCall?.type === "video");
  const [status, setStatus] = useState("Connecting");
  const [error, setError] = useState("");
  const accepted = activeCall?.status === "accepted";
  const video = activeCall?.type === "video";

  useEffect(() => {
    if (!accepted || !activeCall?.chatId || !activeCall.id) return undefined;

    let disposed = false;
    let session: DefaultMeetingSession | null = null;
    let deviceController: DefaultDeviceController | null = null;
    let observer: AudioVideoObserver | null = null;
    let videoInputReady = false;

    const connect = async () => {
      setStatus("Connecting");
      setError("");
      setTiles({});
      setMic(true);
      setCamera(Boolean(video));

      try {
        const response = await fetch(
          `${API_BASE_URL.replace(/\/$/, "")}/api/v1/chat/${encodeURIComponent(
            String(activeCall.chatId),
          )}/calls/${encodeURIComponent(String(activeCall.id))}/chime-credentials`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getToken() || ""}`,
              "X-App-Name": "chat",
              Accept: "application/json",
            },
          },
        );
        const body = (await response.json().catch(() => ({}))) as ChimeCredentialsResponse;
        const credentials = body.data;
        if (!response.ok || !credentials?.meeting || !credentials.attendee) {
          throw new Error(body.error || body.message || "Could not join the call");
        }

        if (credentials.provider && credentials.provider !== "amazon_chime") {
          throw new Error("This call is not configured for Amazon Chime.");
        }

        const logger = new ConsoleLogger(`TechnoCommCall-${activeCall.id}`, LogLevel.WARN);
        deviceController = new DefaultDeviceController(logger);
        const configuration = new MeetingSessionConfiguration(
          credentials.meeting,
          credentials.attendee,
        );
        session = new DefaultMeetingSession(configuration, logger, deviceController);
        sessionRef.current = session;

        observer = {
          audioVideoDidStartConnecting: (reconnecting) => {
            if (!disposed) setStatus(reconnecting ? "Reconnecting" : "Connecting");
          },
          audioVideoDidStart: () => {
            if (!disposed) setStatus("Connected");
          },
          audioVideoDidStop: (sessionStatus) => {
            if (disposed) return;
            const code = sessionStatus.statusCode();
            if (code === MeetingSessionStatusCode.Left) {
              setStatus("Disconnected");
            } else if (sessionStatus.isFailure()) {
              setStatus("Disconnected");
              setError("The call connection was lost.");
            }
          },
          videoTileDidUpdate: (tileState) => {
            if (disposed || tileState.tileId === null) return;
            setTiles((previous) => ({ ...previous, [tileState.tileId as number]: tileState }));
          },
          videoTileWasRemoved: (tileId) => {
            setTiles((previous) => {
              const next = { ...previous };
              delete next[tileId];
              return next;
            });
          },
        };

        session.audioVideo.addObserver(observer);

        if (audioRef.current) {
          await session.audioVideo.bindAudioElement(audioRef.current);
        }

        const audioInputs = await session.audioVideo.listAudioInputDevices();
        if (audioInputs[0]) await session.audioVideo.startAudioInput(audioInputs[0]);

        if (video) {
          try {
            const videoInputs = await session.audioVideo.listVideoInputDevices();
            if (!videoInputs[0]) throw new Error("No camera was found.");
            await session.audioVideo.startVideoInput(videoInputs[0]);
            videoInputReady = true;
          } catch {
            setCamera(false);
            setError("Camera access is unavailable. Continuing with audio.");
          }
        }

        if (disposed) return;
        session.audioVideo.start();
        session.audioVideo.realtimeUnmuteLocalAudio();
        if (video && videoInputReady) session.audioVideo.startLocalVideoTile();
      } catch (connectionError) {
        if (!disposed) {
          setStatus("Disconnected");
          setError(
            connectionError instanceof Error
              ? connectionError.message
              : "Could not connect to the call",
          );
        }
      }
    };

    void connect();

    return () => {
      disposed = true;
      if (sessionRef.current === session) sessionRef.current = null;
      if (session) {
        if (observer) session.audioVideo.removeObserver(observer);
        session.audioVideo.stop();
        void session.destroy();
      } else if (deviceController) {
        void deviceController.destroy();
      }
      setTiles({});
    };
  }, [accepted, activeCall?.chatId, activeCall?.id, video]);

  const toggle = useCallback(
    async (kind: "audio" | "video") => {
      const audioVideo = sessionRef.current?.audioVideo;
      if (!audioVideo) return;

      try {
        if (kind === "audio") {
          if (mic) {
            audioVideo.realtimeMuteLocalAudio();
            setMic(false);
          } else {
            setMic(audioVideo.realtimeUnmuteLocalAudio());
          }
        } else if (audioVideo.hasStartedLocalVideoTile()) {
          audioVideo.stopLocalVideoTile();
          setCamera(false);
        } else {
          audioVideo.startLocalVideoTile();
          setCamera(true);
        }
      } catch (toggleError) {
        setError(
          toggleError instanceof Error ? toggleError.message : "Unable to change media state",
        );
      }
    },
    [mic],
  );

  const visibleTiles = useMemo(
    () => Object.values(tiles).filter((tile) => tile.tileId !== null && tile.active),
    [tiles],
  );

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
      <audio ref={audioRef} autoPlay />
      {video ? (
        <div
          className={`grid gap-2 p-2 ${modal ? "min-h-[420px]" : "min-h-[220px]"} grid-cols-[repeat(auto-fit,minmax(180px,1fr))]`}
        >
          {visibleTiles.length > 0 ? (
            visibleTiles.map((tile) => (
              <ChimeVideoTile
                key={tile.tileId}
                audioVideo={sessionRef.current?.audioVideo}
                tile={tile}
              />
            ))
          ) : (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-300">
              Waiting for video…
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-[140px] items-center justify-center gap-3">
          <Phone className="h-10 w-10 text-blue-300" />
          <span>{status}</span>
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
          onClick={() => void toggle("audio")}
        >
          {mic ? <Mic /> : <MicOff />}
        </Button>
        {video && (
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => void toggle("video")}
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

function ChimeVideoTile({
  audioVideo,
  tile,
}: {
  audioVideo: AudioVideoFacade | undefined;
  tile: VideoTileState;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!audioVideo || tile.tileId === null || !videoRef.current) return undefined;
    audioVideo.bindVideoElement(tile.tileId, videoRef.current);
    return () => audioVideo.unbindVideoElement(tile.tileId as number);
  }, [audioVideo, tile.tileId]);

  return (
    <div className="relative min-h-[180px] overflow-hidden rounded bg-slate-900">
      <video
        ref={videoRef}
        autoPlay
        muted={tile.localTile}
        playsInline
        className="h-full w-full object-cover"
      />
      <span className="absolute bottom-2 left-2 text-xs">
        {tile.localTile ? "You" : tile.boundExternalUserId || "Participant"}
      </span>
    </div>
  );
}
