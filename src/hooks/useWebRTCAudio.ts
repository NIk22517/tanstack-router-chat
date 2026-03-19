import { useCallback, useEffect, useRef, useState } from "react";
import type { UseSocketReturn } from "./useSocket";

// ─── Public types ─────────────────────────────────────────────────────────────

export type CallState =
  | "idle"
  | "connecting"
  | "connected"
  | "failed"
  | "ended";

export type UseWebRTCAudioReturn = {
  callState: CallState;
  isMuted: boolean;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  mute: () => void;
  unmute: () => void;
  forceAudioPlay: () => Promise<boolean>;
};

type Options = {
  socket: UseSocketReturn<any> | undefined;
  call_id: number;
  amCaller: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 44100,
};

const OFFER_DELAY_MS = 600;
const AUTOPLAY_TTL_MS = 30_000;
const TRACK_FLUSH_MS = 120;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTCAudio({
  socket,
  call_id,
  amCaller,
}: Options): UseWebRTCAudioReturn {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const amCallerRef = useRef(amCaller);
  const isStartedRef = useRef(false);
  const audioPlayingRef = useRef(false);
  const unmountedRef = useRef(false);

  // Race-fix refs — see createPeerConnection for explanation.
  const streamReadyRef = useRef(false);
  const pcConnectedRef = useRef(false);

  // ── tracksReady promise ────────────────────────────────────────────────────
  //
  // ROOT CAUSE of missing audio on the caller:
  //
  // handleOffer (the socket listener) and startCall() run concurrently.
  // handleOffer is registered as soon as the socket connects. startCall() is
  // called when call:accepted fires. Between them is an async getUserMedia call.
  //
  // What was happening on the callee:
  //   1. startCall() begins — calls createPeerConnection() (pcRef.current set)
  //   2. getUserMedia starts (async — awaiting mic permission)
  //   3. handleOffer fires (offer arrived during getUserMedia await)
  //   4. handleOffer sees pcRef.current is non-null → proceeds
  //   5. handleOffer creates answer and sends it — but local tracks not yet added
  //   6. Caller receives answer with NO audio track in SDP
  //   7. Caller's ontrack never fires → caller hears nothing
  //   8. getUserMedia resolves, tracks added — too late, negotiation is over
  //
  // Fix: tracksReadyPromise is created at the top of startCall() and resolves
  // only after getUserMedia AND addTrack() have both completed. handleOffer
  // awaits this promise before creating the answer. If tracks are already
  // added when the offer arrives, the await resolves instantly. If not, it
  // waits until they are — guaranteeing the answer always includes audio.
  const tracksReadyPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const resolveTracksReadyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    amCallerRef.current = amCaller;
  }, [amCaller]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const safeSet = useCallback((s: CallState) => {
    if (!unmountedRef.current) setCallState(s);
  }, []);

  const forceAudioPlay = useCallback(async (): Promise<boolean> => {
    const el = remoteAudioRef.current;
    if (!el || audioPlayingRef.current) return audioPlayingRef.current;
    try {
      el.muted = true;
      el.volume = 1.0;
      await el.play();
      await new Promise<void>((r) => setTimeout(r, 80));
      el.muted = false;
      audioPlayingRef.current = true;
      console.log("[WebRTC] Audio playing");
      return true;
    } catch {
      el.muted = false;
      console.warn("[WebRTC] Autoplay blocked");
      return false;
    }
  }, []);

  const attachAutoplayFallback = useCallback((): (() => void) => {
    const cancel = () => {
      document.removeEventListener("click", tryPlay);
      document.removeEventListener("keydown", tryPlay);
      document.removeEventListener("touchstart", tryPlay);
      window.removeEventListener("focus", tryPlay);
      clearTimeout(ttl);
    };
    const tryPlay = async () => {
      const el = remoteAudioRef.current;
      if (!el) return;
      try {
        el.muted = true;
        await el.play();
        await new Promise<void>((r) => setTimeout(r, 80));
        el.muted = false;
        audioPlayingRef.current = true;
        cancel();
      } catch {
        /* still blocked */
      }
    };
    document.addEventListener("click", tryPlay, { once: true });
    document.addEventListener("keydown", tryPlay, { once: true });
    document.addEventListener("touchstart", tryPlay, { once: true });
    window.addEventListener("focus", tryPlay, { once: true });
    const ttl = setTimeout(cancel, AUTOPLAY_TTL_MS);
    return cancel;
  }, []);

  const flushIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const queued = iceCandidateQueue.current.splice(0);
    if (!queued.length) return;
    await Promise.all(
      queued.map((raw) =>
        pc.addIceCandidate(new RTCIceCandidate(raw)).catch((err) => {
          console.error("[WebRTC] Queued ICE candidate rejected:", err);
        }),
      ),
    );
  }, []);

  // ── createPeerConnection ────────────────────────────────────────────────────

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    let cancelAutoplay: (() => void) | null = null;

    const tryPlayWhenReady = () => {
      if (!streamReadyRef.current || !pcConnectedRef.current) return;
      forceAudioPlay().then((ok) => {
        if (!ok) cancelAutoplay = attachAutoplayFallback();
      });
    };

    pc.ontrack = ({ streams }) => {
      const [stream] = streams;
      const el = remoteAudioRef.current;
      if (!el || !stream) return;
      console.log("[WebRTC] ontrack — remote stream received");
      el.srcObject = null;
      el.srcObject = stream;
      streamReadyRef.current = true;
      tryPlayWhenReady();
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      switch (pc.connectionState) {
        case "new":
        case "connecting":
          safeSet("connecting");
          break;
        case "connected":
          safeSet("connected");
          pcConnectedRef.current = true;
          tryPlayWhenReady();
          break;
        case "failed":
          safeSet("failed");
          cancelAutoplay?.();
          break;
        case "closed":
          safeSet("ended");
          cancelAutoplay?.();
          break;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !socket) return;
      socket.emitEvent("webrtc:ice-candidate", {
        call_id,
        candidate: candidate.toJSON(),
      });
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") pc.restartIce();
    };

    pcRef.current = pc;
    return pc;
  }, [socket, call_id, forceAudioPlay, attachAutoplayFallback, safeSet]);

  const configureAudioSenders = useCallback((pc: RTCPeerConnection) => {
    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind !== "audio") return;
      try {
        const params = sender.getParameters();
        (params as any).suppressLocalAudioPlayback = true;
        sender.setParameters(params).catch(() => {});
      } catch {}
    });
  }, []);

  // ── Socket handlers ─────────────────────────────────────────────────────────

  const handleOffer = useCallback(
    async ({
      call_id: cid,
      sdp,
    }: {
      call_id: number;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (cid !== call_id) return;
      const pc = pcRef.current;
      if (!pc || !socket) {
        console.warn("[WebRTC] Offer arrived but PC not ready — ignoring");
        return;
      }

      console.log(
        "[WebRTC] Offer received — waiting for local tracks before answering",
      );

      // KEY FIX: wait until startCall() has finished getUserMedia + addTrack.
      // If tracks are already added this resolves immediately.
      // If getUserMedia is still in progress this waits for it to finish.
      // This guarantees the answer SDP always contains the local audio track,
      // which is what causes the caller's ontrack to fire.
      await tracksReadyPromiseRef.current;

      // Re-check PC after the await — endCall() may have been called while waiting.
      if (!pcRef.current) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emitEvent("webrtc:answer", { call_id, sdp: answer });
        console.log("[WebRTC] Answer sent (with local tracks)");
        await flushIceCandidates(pc);
      } catch (err) {
        console.error("[WebRTC] handleOffer:", err);
        safeSet("failed");
      }
    },
    [call_id, socket, flushIceCandidates, safeSet],
  );

  const handleAnswer = useCallback(
    async ({
      call_id: cid,
      sdp,
    }: {
      call_id: number;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (cid !== call_id) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushIceCandidates(pc);
      } catch (err) {
        console.error("[WebRTC] handleAnswer:", err);
        safeSet("failed");
      }
    },
    [call_id, flushIceCandidates, safeSet],
  );

  const handleIceCandidate = useCallback(
    async ({
      call_id: cid,
      candidate,
    }: {
      call_id: number;
      candidate: RTCIceCandidateInit;
    }) => {
      if (cid !== call_id) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (pc.remoteDescription) {
        await pc
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((err) => {
            console.error("[WebRTC] addIceCandidate:", err);
          });
      } else {
        iceCandidateQueue.current.push(candidate);
      }
    },
    [call_id],
  );

  useEffect(() => {
    if (!socket) return;
    const { listenToEvent, removeListener } = socket;
    listenToEvent("webrtc:offer", handleOffer);
    listenToEvent("webrtc:answer", handleAnswer);
    listenToEvent("webrtc:ice-candidate", handleIceCandidate);
    return () => {
      removeListener("webrtc:offer");
      removeListener("webrtc:answer");
      removeListener("webrtc:ice-candidate");
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate]);

  // ── startCall ───────────────────────────────────────────────────────────────

  const startCall = useCallback(async () => {
    if (isStartedRef.current) return;
    if (!socket) {
      console.error("[WebRTC] No socket");
      return;
    }

    isStartedRef.current = true;
    streamReadyRef.current = false;
    pcConnectedRef.current = false;
    audioPlayingRef.current = false;

    // Create the tracksReady promise BEFORE getUserMedia so that if handleOffer
    // fires during the await below, it suspends on this promise immediately.
    tracksReadyPromiseRef.current = new Promise<void>((resolve) => {
      resolveTracksReadyRef.current = resolve;
    });

    safeSet("connecting");

    // Create PC before getUserMedia — handleOffer needs pcRef.current to exist.
    const pc = createPeerConnection();

    let localStream: MediaStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
      });
    } catch (err) {
      console.error("[WebRTC] Mic denied:", err);
      // Resolve the promise so handleOffer doesn't hang forever, then bail.
      resolveTracksReadyRef.current?.();
      safeSet("failed");
      isStartedRef.current = false;
      pc.close();
      pcRef.current = null;
      return;
    }

    localStreamRef.current = localStream;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    configureAudioSenders(pc);

    // Tracks are now on the PC — unblock handleOffer if it is waiting.
    console.log("[WebRTC] Local tracks added — resolving tracksReady");
    resolveTracksReadyRef.current?.();

    if (amCallerRef.current) {
      console.log(
        "[WebRTC] I am caller — sending offer in",
        OFFER_DELAY_MS,
        "ms",
      );
      setTimeout(async () => {
        if (!pcRef.current) return;
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          socket.emitEvent("webrtc:offer", { call_id, sdp: offer });
        } catch (err) {
          console.error("[WebRTC] createOffer:", err);
          safeSet("failed");
        }
      }, OFFER_DELAY_MS);
    } else {
      console.log("[WebRTC] I am callee — waiting for offer");
    }
  }, [socket, call_id, createPeerConnection, configureAudioSenders, safeSet]);

  // ── endCall ─────────────────────────────────────────────────────────────────

  const endCall = useCallback(async () => {
    const el = remoteAudioRef.current;
    if (el) {
      el.muted = true;
      el.pause();
      el.srcObject = null;
    }

    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });
    await new Promise<void>((r) => setTimeout(r, TRACK_FLUSH_MS));

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // Resolve the promise so handleOffer doesn't hang if endCall races with it.
    resolveTracksReadyRef.current?.();
    tracksReadyPromiseRef.current = Promise.resolve();

    iceCandidateQueue.current = [];
    isStartedRef.current = false;
    audioPlayingRef.current = false;
    streamReadyRef.current = false;
    pcConnectedRef.current = false;

    safeSet("ended");
    setIsMuted(false);
  }, [safeSet]);

  // ── mute / unmute ────────────────────────────────────────────────────────────

  const mute = useCallback(() => {
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = false));
    setIsMuted(true);
  }, []);

  const unmute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
    setIsMuted(false);
  }, []);

  // ── Unmount cleanup ─────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      resolveTracksReadyRef.current?.(); // unblock any suspended handleOffer
      const el = remoteAudioRef.current;
      if (el) {
        el.muted = true;
        el.pause();
        el.srcObject = null;
      }
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (pcRef.current) {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, []);

  return {
    callState,
    isMuted,
    remoteAudioRef,
    startCall,
    endCall,
    mute,
    unmute,
    forceAudioPlay,
  };
}
