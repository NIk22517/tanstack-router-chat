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
import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Participant = {
  user_id: number;
  status: PARTICIPANT_STATUSES;
  name: string | null;
  email: string | null;
  call_id: number;
};

const TERMINAL_STATUSES: PARTICIPANT_STATUSES[] = ["left", "rejected"];

const fetchParticipants = async ({
  call_id,
  token,
}: {
  call_id: string;
  token: string | undefined;
}): Promise<Participant[]> => {
  const res = await services.callServices.getParticipants({ call_id, token });
  if (res.status === 200) return res.data.data as Participant[];
  throw new Error(res?.data?.message);
};

export const Route = createFileRoute("/_auth/call/$call_id")({
  beforeLoad: async ({ context, params }) => {
    await context.queryClient.prefetchQuery({
      queryKey: ["participants", params.call_id],
      queryFn: () =>
        fetchParticipants({
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
  const { mutate: controlCall } = useControlCall();

  const { data: participants } = useSuspenseQuery({
    queryKey: ["participants", call_id],
    queryFn: () => fetchParticipants({ call_id, token: userDetail?.token }),
  });

  const myParticipant = participants.find((p) => p.user_id === userDetail?.id);
  const isAlreadyEnded = myParticipant
    ? TERMINAL_STATUSES.includes(myParticipant.status)
    : false;
  const [callEnded, setCallEnded] = useState(isAlreadyEnded);

  const amCaller = participants[0]?.user_id === userDetail?.id;

  const {
    callState,
    isMuted,
    remoteAudioRef,
    startCall,
    endCall,
    mute,
    unmute,
    forceAudioPlay,
  } = useWebRTCAudio({ amCaller, call_id: Number(call_id), socket });

  const [participantsInRoom, setParticipantsInRoom] = useState<number[]>(() =>
    participants
      .filter((p) => !TERMINAL_STATUSES.includes(p.status))
      .map((p) => p.user_id),
  );

  // ── Coordination refs ────────────────────────────────────────────────────────
  const hasStartedRef = useRef(false);
  const hasEmittedReadyRef = useRef(false);
  const startCallRef = useRef(startCall);
  useEffect(() => {
    startCallRef.current = startCall;
  }, [startCall]);

  // ── Socket lifecycle ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (callEnded || !socket) return;

    const { emitEvent, listenToEvent, removeListener } = socket;

    emitEvent("call:join-room", { call_id: Number(call_id) });

    const handleRoomReady = ({
      call_id: cid,
      participants: inRoom,
    }: {
      call_id: number;
      participants: number[];
    }) => {
      if (cid.toString() !== call_id) return;

      setParticipantsInRoom(inRoom);

      queryClient.invalidateQueries({ queryKey: ["participants", call_id] });

      const bothPresent =
        inRoom.length >= 2 && inRoom.includes(userDetail?.id ?? -1);

      if (bothPresent && !hasEmittedReadyRef.current) {
        hasEmittedReadyRef.current = true;
        emitEvent("call:ready-for-webrtc", { call_id: Number(call_id) });
      }
    };

    const handleCallAccepted = ({
      call_id: cid,
    }: {
      call_id: number;
      by: number;
    }) => {
      if (cid.toString() !== call_id) return;
      queryClient.invalidateQueries({ queryKey: ["participants", call_id] });
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        startCallRef.current();
      }
    };

    const handleCallEnded = ({
      call_id: cid,
    }: {
      call_id: number;
      ended_by: number;
    }) => {
      if (cid.toString() !== call_id) return;
      endCall().then(() => setCallEnded(true));
    };

    listenToEvent("call:room-ready", handleRoomReady);
    listenToEvent("call:accepted", handleCallAccepted);
    listenToEvent("call:ended", handleCallEnded);

    return () => {
      removeListener("call:room-ready");
      removeListener("call:accepted");
      removeListener("call:ended");
      emitEvent("call:leave", { call_id: Number(call_id) });
    };
  }, [socket, call_id, callEnded, userDetail?.id, queryClient, endCall]);

  const handleEndCall = useCallback(async () => {
    await endCall();
    setCallEnded(true);
    socket?.emitEvent("call:leave", { call_id: Number(call_id) });
    controlCall({
      call_id: Number(call_id),
      status: "left",
      token: userDetail?.token,
    });
  }, [endCall, socket, call_id, userDetail?.token, controlCall]);

  const activeParticipants = participants.filter((p) =>
    participantsInRoom.includes(p.user_id),
  );

  if (callEnded) {
    return (
      <div className="min-h-screen bg-[#f3f2f1] flex items-center justify-center">
        <div className="text-center p-6 space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <PhoneOffIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-semibold">Call ended</h2>
          <p className="text-muted-foreground">You can close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f2f1] p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">Call participants</h2>

          <div className="flex gap-2 flex-wrap">
            {callState === "idle" && <Badge variant="outline">Waiting…</Badge>}
            {callState === "connecting" && (
              <Badge className="bg-yellow-500">Connecting…</Badge>
            )}
            {callState === "connected" && (
              <Badge className="bg-green-500">Connected</Badge>
            )}
            {callState === "failed" && (
              <Badge className="bg-red-500">Connection failed</Badge>
            )}
            {participantsInRoom.length > 0 && (
              <Badge variant="outline">
                {participantsInRoom.length} in room
              </Badge>
            )}
          </div>

          {callState === "connected" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={isMuted ? unmute : mute}
              >
                {isMuted ? (
                  <>
                    <MicOffIcon className="w-4 h-4 mr-2" />
                    Unmute
                  </>
                ) : (
                  <>
                    <MicIcon className="w-4 h-4 mr-2" />
                    Mute
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={forceAudioPlay}>
                Enable audio
              </Button>
            </div>
          )}
        </div>

        <Button variant="destructive" onClick={handleEndCall}>
          <PhoneOffIcon className="w-4 h-4 mr-2" />
          End call
        </Button>
      </div>

      {/* Participants grid — only shows people currently in the socket room */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {activeParticipants.map((p) => (
          <Card key={p.user_id} className="rounded-xl shadow-sm">
            <CardContent className="flex items-center p-4 gap-4">
              <div className="relative">
                <UserAvatar
                  fallback={p.name ?? "?"}
                  className="w-12 h-12 bg-[#6264A7] text-blue-600"
                />
                {/* Green dot — always shown since we only render in-room participants */}
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.name ?? "Unknown"}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {p.email ?? "No email"}
                </p>
              </div>

              <Badge
                className={cn(
                  "capitalize shrink-0",
                  p.status === "accepted" && "bg-green-500 hover:bg-green-500",
                  p.status === "invited" && "bg-yellow-500 hover:bg-yellow-500",
                  (p.status === "rejected" || p.status === "left") &&
                    "bg-red-500 hover:bg-red-500",
                )}
              >
                {p.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <audio ref={remoteAudioRef} preload="auto" style={{ display: "none" }} />

      {callState === "connected" && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Live
        </div>
      )}
    </div>
  );
}
