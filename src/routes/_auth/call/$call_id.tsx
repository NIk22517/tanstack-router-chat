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

// ─── Types ────────────────────────────────────────────────────────────────────

type Participant = {
  user_id: number;
  status: PARTICIPANT_STATUSES;
  name: string | null;
  email: string | null;
  call_id: number;
};

// How the call ended — drives the ended screen copy
type EndReason =
  | "ended" // someone left a connected call
  | "rejected" // callee(s) manually rejected
  | "missed" // callee(s) never answered (timeout)
  | "cancelled" // caller cancelled before anyone joined
  | "participant-left"; // one person left but call continues (not used for ended screen)

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

function endedCopy(reason: EndReason) {
  switch (reason) {
    case "rejected":
      return {
        title: "Call declined",
        body: "The call was declined.",
      };
    case "missed":
      return {
        title: "No answer",
        body: "Nobody answered.",
      };
    case "cancelled":
      return {
        title: "Call cancelled",
        body: "The caller cancelled before anyone joined.",
      };
    case "ended":
    default:
      return {
        title: "Call ended",
        body: null,
      };
  }
}

function RouteComponent() {
  const { socket, userDetail } = Route.useRouteContext();
  const { call_id } = Route.useParams();
  const queryClient = useQueryClient();
  const { mutate: controlCall } = useControlCall();

  const { data: participants } = useSuspenseQuery({
    queryKey: ["participants", call_id],
    queryFn: () => fetchParticipants({ call_id, token: userDetail?.token }),
  });

  // Derive ended from DB — survives page refresh
  const myParticipant = participants.find((p) => p.user_id === userDetail?.id);
  const isAlreadyEnded = myParticipant
    ? TERMINAL_STATUSES.includes(myParticipant.status)
    : false;

  const [callEnded, setCallEnded] = useState(isAlreadyEnded);
  const [endReason, setEndReason] = useState<EndReason>("ended");
  const [endedByName, setEndedByName] = useState<string | null>(null);

  // Toasts for mid-call events (someone left, declined, missed)
  const [toasts, setToasts] = useState<string[]>([]);

  const addToast = (msg: string) => {
    setToasts((prev) => [...prev, msg]);
    setTimeout(() => setToasts((prev) => prev.slice(1)), 4_000);
  };

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

  // ── Refs ──────────────────────────────────────────────────────────────────

  const hasStartedRef = useRef(false);
  const hasEmittedReadyRef = useRef(false);
  const startCallRef = useRef(startCall);
  const callStateRef = useRef(callState);
  useEffect(() => {
    startCallRef.current = startCall;
  }, [startCall]);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ── Shared end trigger ────────────────────────────────────────────────────

  const triggerEnd = useCallback(
    async (reason: EndReason, byName?: string | null) => {
      setEndReason(reason);
      setEndedByName(byName ?? null);
      await endCall();
      setCallEnded(true);
    },
    [endCall],
  );

  // ── Socket lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    if (callEnded || !socket) return;
    const { emitEvent, listenToEvent, removeListener } = socket;

    emitEvent("call:join-room", { call_id: Number(call_id) });

    // ── call:room-ready ──────────────────────────────────────────────────────
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

      // Backup end: we were connected but room dropped below 2
      if (
        callStateRef.current === "connected" &&
        inRoom.length < 2 &&
        inRoom.includes(userDetail?.id ?? -1)
      ) {
        triggerEnd("ended");
      }
    };

    // ── call:accepted ────────────────────────────────────────────────────────
    // Someone joined — start WebRTC once, show toast for subsequent joiners
    const handleCallAccepted = ({
      call_id: cid,
      by,
      by_name,
    }: {
      call_id: number;
      by: number;
      by_name: string;
    }) => {
      if (cid.toString() !== call_id) return;
      queryClient.invalidateQueries({ queryKey: ["participants", call_id] });

      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        startCallRef.current();
      } else {
        // Already in a call — another person just joined
        addToast(`${by_name || "Someone"} joined the call`);
      }
    };

    // ── call:rejected ────────────────────────────────────────────────────────
    // One callee declined — if others are still in the call show a toast,
    // otherwise the call is effectively over
    const handleCallRejected = ({
      call_id: cid,
      by,
      by_name,
    }: {
      call_id: number;
      by: number;
      by_name: string;
    }) => {
      if (cid.toString() !== call_id) return;
      queryClient.invalidateQueries({ queryKey: ["participants", call_id] });

      if (callStateRef.current === "connected") {
        // Others still in the call — just a toast
        addToast(`${by_name || "Someone"} declined`);
      } else {
        // Nobody ever joined — call is dead
        triggerEnd("rejected", by_name);
      }
    };

    // ── call:missed ──────────────────────────────────────────────────────────
    // One callee's ring timed out without answering
    const handleCallMissed = ({
      call_id: cid,
      user_id: missedUserId,
    }: {
      call_id: number;
      user_id: number;
    }) => {
      if (cid.toString() !== call_id) return;
      queryClient.invalidateQueries({ queryKey: ["participants", call_id] });

      const missedName = participants.find(
        (p) => p.user_id === missedUserId,
      )?.name;

      if (callStateRef.current === "connected") {
        addToast(`${missedName || "Someone"} didn't answer`);
      } else {
        triggerEnd("missed", missedName);
      }
    };

    // ── call:cancelled ───────────────────────────────────────────────────────
    // Caller left before anyone joined
    const handleCallCancelled = ({
      call_id: cid,
    }: {
      call_id: number;
      by: number;
    }) => {
      if (cid.toString() !== call_id) return;
      triggerEnd("cancelled");
    };

    // ── call:participant-left ────────────────────────────────────────────────
    // Someone left but others remain — show a toast, call continues
    const handleParticipantLeft = ({
      call_id: cid,
      user_id: leftUserId,
      user_name,
    }: {
      call_id: number;
      user_id: number;
      user_name: string;
    }) => {
      if (cid.toString() !== call_id) return;
      queryClient.invalidateQueries({ queryKey: ["participants", call_id] });
      addToast(`${user_name || "Someone"} left the call`);
    };

    // ── call:ended ───────────────────────────────────────────────────────────
    // Call is fully over — last person left or caller ended it
    const handleCallEnded = ({
      call_id: cid,
    }: {
      call_id: number;
      ended_by: number;
    }) => {
      if (cid.toString() !== call_id) return;
      triggerEnd("ended");
    };

    listenToEvent("call:room-ready", handleRoomReady);
    listenToEvent("call:accepted", handleCallAccepted);
    listenToEvent("call:rejected", handleCallRejected);
    listenToEvent("call:missed", handleCallMissed);
    listenToEvent("call:cancelled", handleCallCancelled);
    listenToEvent("call:participant-left", handleParticipantLeft);
    listenToEvent("call:ended", handleCallEnded);

    return () => {
      removeListener("call:room-ready");
      removeListener("call:accepted");
      removeListener("call:rejected");
      removeListener("call:missed");
      removeListener("call:cancelled");
      removeListener("call:participant-left");
      removeListener("call:ended");
      emitEvent("call:leave", { call_id: Number(call_id) });
    };
  }, [
    socket,
    call_id,
    callEnded,
    userDetail?.id,
    queryClient,
    triggerEnd,
    participants,
  ]);

  // ── User-initiated end ────────────────────────────────────────────────────

  const handleEndCall = useCallback(async () => {
    await endCall();
    setCallEnded(true);
    setEndReason("ended");
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

  // ── Ended screen ──────────────────────────────────────────────────────────

  if (callEnded) {
    const { title, body } = endedCopy(endReason);
    return (
      <div className="min-h-screen bg-[#f3f2f1] flex items-center justify-center">
        <div className="text-center p-6 space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <PhoneOffIcon className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          {body && <p className="text-muted-foreground">{body}</p>}
          <p className="text-muted-foreground text-sm">
            You can close this window.
          </p>
        </div>
      </div>
    );
  }

  // ── Active UI ─────────────────────────────────────────────────────────────

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

      {/* Participants grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {activeParticipants.map((p) => (
          <Card key={p.user_id} className="rounded-xl shadow-sm">
            <CardContent className="flex items-center p-4 gap-4">
              <div className="relative">
                <UserAvatar
                  fallback={p.name ?? "?"}
                  className="w-12 h-12 bg-[#6264A7] text-blue-600"
                />
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

      {/* Live indicator */}
      {callState === "connected" && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Live
        </div>
      )}

      {/* Mid-call toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none">
          {toasts.map((msg, i) => (
            <div
              key={i}
              className="bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2"
            >
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
