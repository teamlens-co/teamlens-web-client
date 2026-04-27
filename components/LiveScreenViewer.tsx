"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MonitorUp, Square, WifiOff } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";

type LiveScreenViewerProps = {
  employeeId: string;
  disabled?: boolean;
};

type SignalAck = {
  ok: boolean;
  sessionId?: string;
  iceServers?: RTCIceServer[];
  error?: string;
};

const defaultIceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

const configuredIceServers = (): RTCIceServer[] => {
  const raw = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS;
  if (!raw) return defaultIceServers;

  try {
    const parsed = JSON.parse(raw) as RTCIceServer[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultIceServers;
  } catch {
    return defaultIceServers;
  }
};

export default function LiveScreenViewer({ employeeId, disabled }: LiveScreenViewerProps) {
  const { apiBase, user } = useAuth();
  const [socketState, setSocketState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [viewState, setViewState] = useState<"idle" | "requesting" | "waiting" | "live" | "ended">("idle");
  const [message, setMessage] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const iceServers = useMemo(() => configuredIceServers(), []);
  const sessionIceServersRef = useRef<RTCIceServer[]>(iceServers);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const canView = user?.role === "MANAGER" && employeeId && employeeId !== user.id && !disabled;

  const cleanupPeer = useCallback(() => {
    peerRef.current?.getReceivers().forEach((receiver) => receiver.track?.stop());
    peerRef.current?.close();
    peerRef.current = null;
    pendingIceCandidatesRef.current = [];
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
  }, []);

  const attachVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && remoteStreamRef.current) {
      node.srcObject = remoteStreamRef.current;
      void node.play().catch(() => {
        setMessage("Live stream connected. Press play if the browser paused video playback.");
      });
    }
  }, []);

  const stopViewing = useCallback(
    (reason = "ended") => {
      const activeSessionId = sessionIdRef.current;
      if (activeSessionId) {
        socketRef.current?.emit("live:view-ended", { sessionId: activeSessionId, reason });
      }
      cleanupPeer();
      sessionIdRef.current = null;
      sessionIceServersRef.current = iceServers;
      setSessionId(null);
      setViewState(reason === "ended" ? "ended" : "idle");
      setMessage(reason === "ended" ? "Live viewing stopped." : "");
    },
    [cleanupPeer, iceServers],
  );

  useEffect(() => {
    if (!user) return;

    setSocketState("connecting");
    const socket = io(apiBase, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketState("connected");
      setMessage("");
    });

    socket.on("connect_error", (error) => {
      setSocketState("error");
      setMessage(error.message || "Live signaling connection failed.");
    });

    socket.on("disconnect", () => {
      setSocketState("idle");
      cleanupPeer();
      setViewState((current) => (current === "live" || current === "waiting" ? "ended" : current));
      setMessage("Live signaling disconnected.");
    });

    socket.on("live:view-accepted", (payload: { sessionId: string }) => {
      if (payload.sessionId === sessionIdRef.current) {
        setViewState("waiting");
        setMessage("Employee accepted. Connecting video...");
      }
    });

    socket.on("live:view-ended", (payload: { sessionId: string; reason?: string }) => {
      if (!sessionIdRef.current || payload.sessionId !== sessionIdRef.current) return;
      cleanupPeer();
      sessionIdRef.current = null;
      setSessionId(null);
      setViewState("ended");
      setMessage(payload.reason === "disconnect" ? "Live view ended because a peer disconnected." : "Live view ended.");
    });

    socket.on("webrtc:offer", async (payload: { sessionId: string; offer: RTCSessionDescriptionInit }) => {
      if (!payload.sessionId || payload.sessionId !== sessionIdRef.current) return;

      try {
        cleanupPeer();
        const remoteStream = new MediaStream();
        remoteStreamRef.current = remoteStream;
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
        }

        const peer = new RTCPeerConnection({ iceServers: sessionIceServersRef.current });
        peerRef.current = peer;

        peer.ontrack = (event) => {
          event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
            void videoRef.current.play().catch(() => {
              setMessage("Live stream connected. Press play if the browser paused video playback.");
            });
          }
          setViewState("live");
          setMessage("");
        };

        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("webrtc:ice-candidate", { sessionId: payload.sessionId, candidate: event.candidate });
          }
        };

        peer.onconnectionstatechange = () => {
          if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
            setMessage(`WebRTC connection ${peer.connectionState}.`);
          }
        };

        await peer.setRemoteDescription(payload.offer);

        const pendingCandidates = pendingIceCandidatesRef.current.splice(0);
        for (const candidate of pendingCandidates) {
          try {
            await peer.addIceCandidate(candidate);
          } catch (error) {
            console.warn("Unable to add queued remote ICE candidate", error);
          }
        }

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("webrtc:answer", { sessionId: payload.sessionId, answer });
      } catch (error) {
        console.error("Failed to answer live screen offer", error);
        setMessage("Unable to connect to the employee screen.");
        stopViewing("error");
      }
    });

    socket.on("webrtc:ice-candidate", async (payload: { sessionId: string; candidate: RTCIceCandidateInit }) => {
      if (payload.sessionId !== sessionIdRef.current || !payload.candidate) return;

      const peer = peerRef.current;
      if (!peer || !peer.remoteDescription) {
        pendingIceCandidatesRef.current.push(payload.candidate);
        return;
      }

      try {
        await peer.addIceCandidate(payload.candidate);
      } catch (error) {
        console.warn("Unable to add remote ICE candidate", error);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      cleanupPeer();
    };
  }, [apiBase, cleanupPeer, iceServers, stopViewing, user]);

  const requestLiveView = () => {
    if (!canView || !socketRef.current || socketState !== "connected") return;

    cleanupPeer();
    sessionIdRef.current = null;
    sessionIceServersRef.current = iceServers;
    setViewState("requesting");
    setMessage("Requesting live screen...");
    socketRef.current.timeout(10000).emit("live:view-request", { employeeId }, (error: Error | null, response: SignalAck) => {
      if (error || !response?.ok || !response.sessionId) {
        setViewState("idle");
        setMessage(response?.error || "Live view request timed out.");
        return;
      }

      sessionIceServersRef.current = response.iceServers?.length ? response.iceServers : iceServers;
      setSessionId(response.sessionId);
      sessionIdRef.current = response.sessionId;
      setViewState("waiting");
      setMessage("Waiting for the employee agent to start streaming...");
    });
  };

  return (
    <section className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Live Screen</h2>
          <p className="text-sm text-slate-500">
            {socketState === "connected" ? "Peer-to-peer WebRTC stream" : "Connecting live signaling"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewState === "live" || viewState === "waiting" || viewState === "requesting" ? (
            <button
              type="button"
              onClick={() => stopViewing("ended")}
              className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={requestLiveView}
              disabled={!canView || socketState !== "connected"}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:bg-slate-300"
            >
              <MonitorUp className="mr-2 h-4 w-4" />
              View Live Screen
            </button>
          )}
        </div>
      </div>

      {message ? (
        <div className="mt-4 flex items-center rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {socketState === "error" ? <WifiOff className="mr-2 h-4 w-4 text-red-500" /> : null}
          {message}
        </div>
      ) : null}

      {(viewState === "live" || viewState === "waiting") && (
        <div className="mt-4 overflow-hidden rounded-md bg-slate-950">
          <video ref={attachVideoRef} autoPlay playsInline muted controls className="aspect-video w-full bg-slate-950 object-contain" />
        </div>
      )}
    </section>
  );
}
