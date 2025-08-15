import {
  useControlCall,
  type PARTICIPANT_STATUSES,
} from "@/components/call/apiCalls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { useWebRTCAudio } from "@/hooks/useWebRTCAudio";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";

type ParticipantsType = {
  user_id: number;
  status: PARTICIPANT_STATUSES;
  name: string | null;
  email: string | null;
  call_id: number;
};

const getParticipants = async ({
  call_id,
  token,
}: {
  call_id: string;
  token: string | undefined;
}) => {
  const res = await services.callServices.getParticipants({ call_id, token });
  if (res.status === 200) {
    return res.data.data as ParticipantsType[];
  }
  throw new Error(res?.data?.message);
};

export const Route = createFileRoute("/_auth/call/$call_id")({
  beforeLoad: async (ctx) => {
    const { context, params } = ctx;
    await context.queryClient.prefetchQuery({
      queryKey: ["get_participants", params.call_id],
      queryFn: () =>
        getParticipants({
          call_id: params.call_id,
          token: context.userDetail?.token,
        }),
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { socket, userDetail } = Route.useRouteContext();
  const { call_id } = Route.useParams();
  const queryClient = useQueryClient();
  const { mutate } = useControlCall();

  // State management
  const [callEnded, setCallEnded] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const [participantsInRoom, setParticipantsInRoom] = useState<number[]>([]);
  const [webrtcStarted, setWebrtcStarted] = useState(false);

  // CRITICAL FIX: Use refs to avoid stale closure
  const roomReadyRef = useRef(false);
  const participantsInRoomRef = useRef<number[]>([]);
  const webrtcStartedRef = useRef(false);
  const initializedRef = useRef(false);

  // Update refs whenever state changes
  useEffect(() => {
    roomReadyRef.current = roomReady;
  }, [roomReady]);

  useEffect(() => {
    participantsInRoomRef.current = participantsInRoom;
  }, [participantsInRoom]);

  useEffect(() => {
    webrtcStartedRef.current = webrtcStarted;
  }, [webrtcStarted]);

  const { data: participants } = useSuspenseQuery({
    queryKey: ["get_participants", call_id],
    queryFn: () =>
      getParticipants({
        call_id,
        token: userDetail?.token,
      }),
  });

  const amCaller =
    userDetail?.id ===
    participants.find((p) => p.status === "accepted")?.user_id;

  const { endCall, remoteAudioRef, startCall, mute, unmute, forceAudioPlay } =
    useWebRTCAudio({
      amCaller,
      call_id: Number(call_id),
      socket,
    });

  const enableAudio = useCallback(async () => {
    try {
      const success = await forceAudioPlay();
      if (success) {
        console.log("🔊 Audio enabled successfully");
      } else {
        console.log("⚠️ Please interact with the page to enable audio");
      }
    } catch (error) {
      console.error("❌ Failed to enable audio:", error);
    }
  }, [forceAudioPlay]);

  // FIXED: Simplified useEffect that properly handles state updates
  useEffect(() => {
    if (!socket || initializedRef.current) {
      return;
    }

    console.log("🔧 ONCE: Setting up socket listeners and joining room");
    initializedRef.current = true;

    const { listenToEvent, removeListener, emitEvent } = socket;

    // Join the call room
    console.log("🚪 Joining call room:", call_id);
    emitEvent("call:join-room", { call_id: Number(call_id) });

    // Handle room readiness
    const handleRoomReady = (data: {
      call_id: number;
      participants: number[];
    }) => {
      if (call_id !== data.call_id?.toString()) return;

      console.log("🏠 Room ready with participants:", data.participants);
      setRoomReady(true);
      setParticipantsInRoom(data.participants);

      // Check if current user should signal readiness
      const currentParticipants = participants || [];
      const userParticipant = currentParticipants.find(
        (p) => p.user_id === userDetail?.id
      );
      const isUserInRoom = data.participants.includes(userDetail?.id || 0);

      console.log("👤 User participant status:", userParticipant?.status);
      console.log("🏠 User in room:", isUserInRoom);

      if (userParticipant?.status === "accepted" && isUserInRoom) {
        console.log("✅ Signaling WebRTC readiness");
        setTimeout(() => {
          console.log("📡 Emitting call:ready-for-webrtc");
          emitEvent("call:ready-for-webrtc", { call_id: Number(call_id) });
        }, 300);
      }
    };

    // FIXED: Handle call acceptance using refs to get current values
    const handleCallAccepted = async (data: {
      by: number;
      call_id: number;
    }) => {
      if (call_id !== data.call_id?.toString()) return;

      console.log("📞 Call accepted by:", data.by);

      // CRITICAL: Use refs to get current values instead of stale closure values
      const currentRoomReady = roomReadyRef.current;
      const currentParticipants = participantsInRoomRef.current;
      const currentWebrtcStarted = webrtcStartedRef.current;

      console.log("🔍 CURRENT roomReady (ref):", currentRoomReady);
      console.log("🔍 CURRENT webrtcStarted (ref):", currentWebrtcStarted);
      console.log(
        "🔍 CURRENT participantsInRoom (ref):",
        currentParticipants.length
      );

      // Update participant data
      queryClient.invalidateQueries({
        queryKey: ["get_participants", call_id],
      });

      // SIMPLIFIED: Start WebRTC if not already started (ignore other conditions for now)
      if (!currentWebrtcStarted) {
        console.log("🚀 Starting WebRTC connection...");
        setWebrtcStarted(true);
        setIsCallActive(true);

        setTimeout(() => {
          console.log("🔥 Calling startCall()");
          startCall();
        }, 200);
      } else {
        console.log("❌ WebRTC already started");
      }
    };

    // Handle call end
    const handleCallEnded = (data: { ended_by: number; call_id: number }) => {
      if (call_id !== data.call_id?.toString()) return;

      console.log("☎️ Call ended by:", data.ended_by);
      setCallEnded(true);
      setIsCallActive(false);
      setRoomReady(false);
      setParticipantsInRoom([]);
      setWebrtcStarted(false);
      endCall();
    };

    // Set up listeners
    listenToEvent("call:room-ready", handleRoomReady);
    listenToEvent("call:accepted", handleCallAccepted);
    listenToEvent("call:ended", handleCallEnded);

    // Cleanup function
    return () => {
      console.log("🧹 Component cleanup - leaving call room");
      emitEvent("call:leave", { call_id: Number(call_id) });
      removeListener("call:room-ready");
      removeListener("call:accepted");
      removeListener("call:ended");

      initializedRef.current = false;
    };
  }, [socket, call_id]); // Minimal dependencies

  const handleEndCall = useCallback(() => {
    console.log("🔚 User ending call");
    endCall();
    setIsCallActive(false);
    setWebrtcStarted(false);
    mutate({
      call_id: Number(call_id),
      status: "left",
      token: userDetail?.token,
    });
  }, [endCall, mutate, call_id, userDetail?.token]);

  if (callEnded) {
    return (
      <div className="min-h-screen bg-[#f3f2f1] flex items-center justify-center">
        <div className="text-center p-6">
          <h2 className="text-2xl font-semibold mb-4">📞 Call has ended</h2>
          <p className="text-muted-foreground">You can close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f2f1] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">📞 Call Participants</h2>

          {/* Status indicators */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {roomReady && (
              <Badge className="bg-blue-500">
                🏠 Room Ready ({participantsInRoom.length} participants)
              </Badge>
            )}
            {isCallActive && (
              <Badge className="bg-green-500">📞 Call Active</Badge>
            )}
            {webrtcStarted && (
              <Badge className="bg-purple-500">🔗 WebRTC Connected</Badge>
            )}
          </div>

          {/* Debug info */}
          <div className="flex gap-2 mb-4 flex-wrap text-xs">
            <Badge variant="outline">
              Room Ready: {roomReady ? "✅" : "❌"}
            </Badge>
            <Badge variant="outline">
              WebRTC: {webrtcStarted ? "✅" : "❌"}
            </Badge>
            <Badge variant="outline">
              Participants: {participantsInRoom.length}
            </Badge>
            <Badge variant="outline">Caller: {amCaller ? "✅" : "❌"}</Badge>
          </div>

          {/* Audio controls */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button onClick={enableAudio} variant="outline" size="sm">
              🔊 Enable Audio
            </Button>
            <Button onClick={mute} variant="outline" size="sm">
              🔇 Mute
            </Button>
            <Button onClick={unmute} variant="outline" size="sm">
              🎤 Unmute
            </Button>
            {/* DEBUG: Force start button */}
            <Button
              onClick={() => {
                console.log("🧪 FORCE STARTING CALL");
                setWebrtcStarted(true);
                setIsCallActive(true);
                startCall();
              }}
              variant="outline"
              size="sm"
              className="bg-red-100"
            >
              🧪 FORCE START
            </Button>
          </div>
        </div>
        <Button variant="destructive" onClick={handleEndCall}>
          <LogOutIcon className="w-4 h-4 mr-2" />
          End Call
        </Button>
      </div>

      {/* Participants grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {participants.map((p) => (
          <Card key={p.user_id} className="rounded-xl shadow-sm">
            <CardContent className="flex items-center p-4 gap-4">
              <div className="relative">
                <UserAvatar
                  fallback={p.name ?? "?"}
                  className="w-12 h-12 bg-[#6264A7] text-blue-600"
                />
                {participantsInRoom.includes(p.user_id) && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{p.name ?? "Unknown User"}</div>
                <div className="text-sm text-muted-foreground">
                  {p.email ?? "No email"}
                </div>
                {participantsInRoom.includes(p.user_id) && (
                  <div className="text-xs text-green-600 font-medium">
                    🟢 In call room
                  </div>
                )}
              </div>
              <Badge
                className={cn(
                  "capitalize",
                  p.status === "accepted" && "bg-green-500 hover:bg-green-500",
                  p.status === "invited" && "bg-yellow-500 hover:bg-yellow-500",
                  (p.status === "rejected" || p.status === "left") &&
                    "bg-red-500 hover:bg-red-500"
                )}
              >
                {p.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audio element */}
      <audio
        ref={remoteAudioRef}
        autoPlay={true}
        controls={false}
        preload="auto"
        muted={false}
        style={{ display: "none" }}
        onLoadedData={() => console.log("🎵 Audio data loaded")}
        onPlay={() => console.log("▶️ Audio started playing")}
        onPause={() => console.log("⏸️ Audio paused")}
        onError={(e) => console.error("🚫 Audio error:", e)}
        onCanPlay={() => {
          console.log("✅ Audio can play");
          forceAudioPlay();
        }}
      />

      {/* Status indicators */}
      {isCallActive && (
        <div className="fixed bottom-4 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          📞 Call Active
        </div>
      )}

      {roomReady && !isCallActive && (
        <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          🏠 Room Ready • Waiting for call to start...
        </div>
      )}
    </div>
  );
}
