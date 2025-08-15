import { useEffect, useRef, useCallback } from "react";
import type { UseSocketReturn } from "./useSocket";

type WebRTCAudioOptions = {
  socket: UseSocketReturn<any> | undefined;
  call_id: number;
  amCaller: boolean;
};

export const useWebRTCAudio = ({
  socket,
  call_id,
  amCaller,
}: WebRTCAudioOptions) => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isInitializedRef = useRef(false);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const audioPlaybackStartedRef = useRef(false);

  const cleanup = useCallback(() => {
    try {
      localStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
        console.log("🧹 Stopped local track:", track.kind);
      });
      pcRef.current?.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });
      pcRef.current?.close();
      console.log("🧹 Peer connection closed");
    } catch (error) {
      console.error("❌ Cleanup error:", error);
    }
    localStreamRef.current = null;
    pcRef.current = null;
    iceCandidatesQueueRef.current = [];
    isInitializedRef.current = false;
    audioPlaybackStartedRef.current = false;
  }, []);

  const forceAudioPlay = useCallback(async () => {
    if (remoteAudioRef.current && !audioPlaybackStartedRef.current) {
      try {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;

        await remoteAudioRef.current.play();
        audioPlaybackStartedRef.current = true;
        console.log("🔊 Audio playback started successfully");
        return true;
      } catch (error) {
        console.warn("⚠️ Audio autoplay blocked:", error);
        return false;
      }
    }
    return audioPlaybackStartedRef.current;
  }, []);

  const initPeerConnection = useCallback(() => {
    console.log("🔗 Initializing peer connection...");
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.ontrack = (event) => {
      console.log(
        "📥 Received remote track:",
        event.track.kind,
        event.track.enabled
      );
      const [remoteStream] = event.streams;

      if (remoteAudioRef.current && remoteStream) {
        console.log("🔗 Setting remote audio stream");
        remoteAudioRef.current.srcObject = remoteStream;

        const handleAudioPlayback = async () => {
          const playedImmediately = await forceAudioPlay();

          if (!playedImmediately) {
            console.log(
              "📢 Audio blocked - setting up user interaction handlers"
            );

            const enableAudioOnInteraction = async (eventType: string) => {
              console.log(
                `🖱️ User ${eventType} detected - attempting audio playback`
              );

              try {
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.muted = false;
                  await remoteAudioRef.current.play();
                  audioPlaybackStartedRef.current = true;
                  console.log("✅ Audio enabled after user interaction");
                  cleanup_listeners();
                }
              } catch (error) {
                console.error(
                  "❌ Failed to play audio even after user interaction:",
                  error
                );
              }
            };

            const clickHandler = () => enableAudioOnInteraction("click");
            const keyHandler = () => enableAudioOnInteraction("keypress");
            const touchHandler = () => enableAudioOnInteraction("touch");

            const cleanup_listeners = () => {
              document.removeEventListener("click", clickHandler);
              document.removeEventListener("keydown", keyHandler);
              document.removeEventListener("touchstart", touchHandler);
              window.removeEventListener("focus", clickHandler);
            };

            document.addEventListener("click", clickHandler, { once: true });
            document.addEventListener("keydown", keyHandler, { once: true });
            document.addEventListener("touchstart", touchHandler, {
              once: true,
            });
            window.addEventListener("focus", clickHandler, { once: true });

            setTimeout(cleanup_listeners, 30000);
          }
        };

        setTimeout(handleAudioPlayback, 100);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log("📤 Sending ICE candidate");
        socket.emitEvent("webrtc:ice-candidate", {
          call_id,
          candidate: event.candidate.toJSON(),
        });
      } else if (!event.candidate) {
        console.log("✅ ICE gathering complete");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("🔗 WebRTC Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        console.log("🎉 WebRTC connection established!");
        setTimeout(() => forceAudioPlay(), 500);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("🧊 ICE Connection state:", pc.iceConnectionState);
    };

    pcRef.current = pc;
    return pc;
  }, [call_id, socket, forceAudioPlay]);

  const addLocalTracks = useCallback(async () => {
    try {
      console.log("🎤 Requesting microphone access...");
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      console.log(
        "✅ Got local audio stream with tracks:",
        localStream.getTracks().length
      );
      localStreamRef.current = localStream;

      if (pcRef.current) {
        localStream.getTracks().forEach((track) => {
          console.log(
            "➕ Adding local track:",
            track.kind,
            "enabled:",
            track.enabled
          );
          pcRef.current!.addTrack(track, localStream);
        });
      }
    } catch (err) {
      console.error("❌ Microphone permission error:", err);
      throw err;
    }
  }, []);

  // UPDATED: Enhanced startCall with comprehensive debug logging
  const startCall = useCallback(async () => {
    console.log("🔥 startCall() INVOKED - amCaller:", amCaller);

    if (!socket) {
      console.log("❌ No socket available");
      return;
    }

    if (isInitializedRef.current) {
      console.log("❌ Call already initialized");
      return;
    }

    console.log("✅ Starting WebRTC call setup...");
    const { emitEvent, listenToEvent } = socket;

    isInitializedRef.current = true;
    const pc = initPeerConnection();

    try {
      console.log("🎤 Adding local tracks...");
      await addLocalTracks();
      console.log("✅ Local tracks added successfully");
    } catch (error) {
      console.error("❌ Failed to get local tracks:", error);
      return;
    }

    // UPDATED: Enhanced event handlers with debug logs
    const handleOffer = async ({ call_id: cid, sdp }: any) => {
      if (cid !== call_id) return;
      console.log("📥 RECEIVED OFFER from call:", cid);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("✅ Set remote description (offer)");

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("✅ Created and set local description (answer)");

        emitEvent("webrtc:answer", { call_id, sdp: answer });
        console.log("📤 Sent answer");

        const queuedCandidates = iceCandidatesQueueRef.current;
        if (queuedCandidates.length > 0) {
          console.log(
            `🔄 Processing ${queuedCandidates.length} queued ICE candidates`
          );
          for (const candidate of queuedCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("✅ Added queued ICE candidate");
            } catch (error) {
              console.error("❌ Error adding queued ICE candidate:", error);
            }
          }
          iceCandidatesQueueRef.current = [];
        }
      } catch (error) {
        console.error("❌ Error handling offer:", error);
      }
    };

    const handleAnswer = async ({ call_id: cid, sdp }: any) => {
      if (cid !== call_id) return;
      console.log("📥 RECEIVED ANSWER from call:", cid);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("✅ Set remote description (answer)");

        const queuedCandidates = iceCandidatesQueueRef.current;
        if (queuedCandidates.length > 0) {
          console.log(
            `🔄 Processing ${queuedCandidates.length} queued ICE candidates`
          );
          for (const candidate of queuedCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("✅ Added queued ICE candidate");
            } catch (error) {
              console.error("❌ Error adding queued ICE candidate:", error);
            }
          }
          iceCandidatesQueueRef.current = [];
        }
      } catch (error) {
        console.error("❌ Error handling answer:", error);
      }
    };

    const handleIceCandidate = async ({ call_id: cid, candidate }: any) => {
      if (cid !== call_id) return;
      console.log("📥 RECEIVED ICE CANDIDATE from call:", cid);

      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ Added ICE candidate");
        } else {
          console.log("📋 Queuing ICE candidate");
          iceCandidatesQueueRef.current.push(candidate);
        }
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error);
      }
    };

    console.log("🔗 Setting up WebRTC event listeners...");
    listenToEvent("webrtc:offer", handleOffer);
    listenToEvent("webrtc:answer", handleAnswer);
    listenToEvent("webrtc:ice-candidate", handleIceCandidate);

    if (amCaller) {
      console.log("👤 I am the caller - will create offer");
      setTimeout(async () => {
        try {
          console.log("📞 Creating WebRTC offer...");
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
          });
          await pc.setLocalDescription(offer);
          console.log("✅ Offer created and local description set");
          console.log("📤 Sending offer via socket...");

          emitEvent("webrtc:offer", { call_id, sdp: offer });
          console.log("✅ Offer sent successfully");
        } catch (error) {
          console.error("❌ Error creating/sending offer:", error);
        }
      }, 500);
    } else {
      console.log("👥 I am NOT the caller - waiting for offer");
    }
  }, [socket, call_id, amCaller, initPeerConnection, addLocalTracks]);

  const endCall = useCallback(() => {
    console.log("📞 Ending call");
    cleanup();
    if (socket) socket.emitEvent("call:leave", { call_id });
  }, [cleanup, socket, call_id]);

  const mute = useCallback(() => {
    console.log("🔇 Muting audio");
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = false));
  }, []);

  const unmute = useCallback(() => {
    console.log("🔊 Unmuting audio");
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = true));
  }, []);

  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting, cleaning up");
      if (socket) {
        socket.removeListener("webrtc:offer");
        socket.removeListener("webrtc:answer");
        socket.removeListener("webrtc:ice-candidate");
      }
      cleanup();
    };
  }, [cleanup, socket]);

  return { remoteAudioRef, startCall, endCall, mute, unmute, forceAudioPlay };
};
