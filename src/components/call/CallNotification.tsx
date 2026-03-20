import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, PhoneMissed } from "lucide-react";
import type { UseSocketReturn } from "@/hooks/useSocket";
import { useLocalStorage } from "@/hooks";
import { useControlCall, type PARTICIPANT_STATUSES } from "./apiCalls";

type IncomingCall = {
  open: boolean;
  call_id: number | null;
  caller_id?: number;
  caller_name?: string;
  call_type?: "audio" | "video";
};

const RING_TIMEOUT_MS = 30_000;
const MISSED_DISMISS_MS = 3_000;

function createRingtone(): { start: () => void; stop: () => void } {
  let ctx: AudioContext | null = null;
  let stopped = false;
  let stopCurrent: (() => void) | null = null;

  const playBurst = (
    audioCtx: AudioContext,
    f1: number,
    f2: number,
    duration: number,
    gap: number,
    onDone: () => void,
  ) => {
    if (stopped) return;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.connect(audioCtx.destination);
    const o1 = audioCtx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = f1;
    o1.connect(gain);
    const o2 = audioCtx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = f2;
    o2.connect(gain);
    const end = audioCtx.currentTime + duration / 1000;
    gain.gain.setValueAtTime(0.3, end - 0.02);
    gain.gain.linearRampToValueAtTime(0, end);
    o1.start();
    o2.start();
    o1.stop(end);
    o2.stop(end);
    const timer = setTimeout(onDone, duration + gap);
    stopCurrent = () => {
      clearTimeout(timer);
      gain.gain.cancelScheduledValues(audioCtx.currentTime);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      try {
        o1.stop();
      } catch {}
      try {
        o2.stop();
      } catch {}
    };
  };

  const cycle = (audioCtx: AudioContext) => {
    if (stopped) return;
    playBurst(audioCtx, 440, 480, 400, 200, () => {
      if (stopped) return;
      playBurst(audioCtx, 440, 480, 400, 2000, () => {
        if (stopped) return;
        cycle(audioCtx);
      });
    });
  };

  return {
    start() {
      stopped = false;
      ctx = new AudioContext();
      cycle(ctx);
    },
    stop() {
      stopped = true;
      stopCurrent?.();
      stopCurrent = null;
      ctx?.close().catch(() => {});
      ctx = null;
    },
  };
}

export async function requestNotificationPermission(): Promise<void> {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

export function CallNotification({
  socket,
}: {
  socket: UseSocketReturn<any> | undefined;
}) {
  const { getItem } = useLocalStorage("auth");
  const userDetail = getItem();
  const { mutate } = useControlCall();

  const [call, setCall] = useState<IncomingCall>({
    open: false,
    call_id: null,
  });
  const [cancelled, setCancelled] = useState(false);

  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);
  const browserNotifRef = useRef<Notification | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAll = () => {
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
    browserNotifRef.current?.close();
    browserNotifRef.current = null;
    clearTimeout(ringTimeoutRef.current ?? undefined);
    ringTimeoutRef.current = null;
  };

  useEffect(() => {
    if (!call.open) {
      stopAll();
      return;
    }

    ringtoneRef.current = createRingtone();
    ringtoneRef.current.start();

    const showNotif = () => {
      if (!("Notification" in window) || Notification.permission !== "granted")
        return;
      const notif = new Notification("Incoming call", {
        body: `${call.call_type ?? "audio"} call from ${call.caller_name ?? `User ${call.caller_id}`}`,
        tag: "incoming-call",
        requireInteraction: true,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      browserNotifRef.current = notif;
    };

    if (Notification.permission === "granted") {
      showNotif();
    } else if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") showNotif();
      });
    }

    ringTimeoutRef.current = setTimeout(() => {
      const call_id = call.call_id;
      if (!call_id) return;

      stopAll();

      mutate(
        {
          call_id,
          status: "rejected",
          reason: "timeout",
          token: userDetail?.token,
        },
        {
          onSuccess: () => setCall({ open: false, call_id: null }),
        },
      );
    }, RING_TIMEOUT_MS);

    return stopAll;
  }, [call.open]);

  useEffect(() => {
    if (!socket) return;
    const { listenToEvent, removeListener } = socket;

    listenToEvent(
      "call:incoming",
      (data: {
        call_id: number;
        caller_id: number;
        caller_name?: string;
        call_type: "audio" | "video";
      }) => {
        setCancelled(false);
        setCall({ open: true, ...data });
      },
    );

    listenToEvent("call:cancelled", (data: { call_id: number; by: number }) => {
      setCall((prev) => {
        if (!prev.open || prev.call_id !== data.call_id) return prev;

        stopAll();
        setCancelled(true);

        setTimeout(() => {
          setCall({ open: false, call_id: null });
          setCancelled(false);
        }, MISSED_DISMISS_MS);

        return prev;
      });
    });

    return () => {
      removeListener("call:incoming");
      removeListener("call:cancelled");
    };
  }, [socket]);

  const makeControl = ({
    call_id,
    status,
    reason = "manual",
  }: {
    call_id: number;
    status: PARTICIPANT_STATUSES;
    reason?: "manual" | "timeout";
  }) => {
    stopAll();
    mutate(
      { call_id, status, reason, token: userDetail?.token },
      { onSuccess: () => setCall({ open: false, call_id: null }) },
    );
  };

  const callerLabel =
    call.caller_name ?? (call.caller_id ? `User ${call.caller_id}` : "Someone");

  return (
    <Dialog open={call.open}>
      <DialogContent className="sm:max-w-[425px] text-center">
        {cancelled ? (
          <>
            <DialogHeader>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <PhoneMissed className="w-6 h-6 text-red-500" />
              </div>
              <DialogTitle className="text-lg font-semibold">
                Call cancelled
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {callerLabel} cancelled the call
              </p>
            </DialogHeader>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <DialogTitle className="text-lg font-semibold">
                Incoming {call.call_type ?? "audio"} call
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {callerLabel} is calling you
              </p>
            </DialogHeader>

            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  if (!call.call_id) return;
                  makeControl({
                    call_id: call.call_id,
                    status: "rejected",
                    reason: "manual",
                  });
                }}
              >
                <PhoneOff className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  if (!call.call_id) return;
                  makeControl({ call_id: call.call_id, status: "accepted" });
                }}
              >
                <Phone className="mr-2 h-4 w-4" /> Accept
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
