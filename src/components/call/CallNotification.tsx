import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import type { UseSocketReturn } from "@/hooks/useSocket";
import { useLocalStorage } from "@/hooks";
import { useControlCall, type PARTICIPANT_STATUSES } from "./apiCalls";

type IncomingCall = {
  open: boolean;
  call_id: number | null;
  caller_id?: number;
  call_type?: "audio" | "video";
};

export async function requestNotificationPermission(): Promise<void> {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function createRingtone(): { start: () => void; stop: () => void } {
  let ctx: AudioContext | null = null;
  let stopped = false;
  let stopCurrentRing: (() => void) | null = null;

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

    stopCurrentRing = () => {
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

  const playOneCycle = (audioCtx: AudioContext) => {
    if (stopped) return;
    playBurst(audioCtx, 440, 480, 400, 200, () => {
      if (stopped) return;
      playBurst(audioCtx, 440, 480, 400, 2000, () => {
        if (stopped) return;
        playOneCycle(audioCtx);
      });
    });
  };

  return {
    start() {
      stopped = false;
      ctx = new AudioContext();
      playOneCycle(ctx);
    },
    stop() {
      stopped = true;
      stopCurrentRing?.();
      stopCurrentRing = null;
      ctx?.close().catch(() => {});
      ctx = null;
    },
  };
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

  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);
  const browserNotifRef = useRef<Notification | null>(null);

  useEffect(() => {
    if (call.open) {
      ringtoneRef.current = createRingtone();
      ringtoneRef.current.start();

      const showBrowserNotif = () => {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;

        const notif = new Notification("Incoming call", {
          body: `${call.call_type ?? "audio"} call from user ${call.caller_id}`,
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
        showBrowserNotif();
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") showBrowserNotif();
        });
      }
    } else {
      ringtoneRef.current?.stop();
      ringtoneRef.current = null;

      browserNotifRef.current?.close();
      browserNotifRef.current = null;
    }

    return () => {
      ringtoneRef.current?.stop();
      ringtoneRef.current = null;
      browserNotifRef.current?.close();
      browserNotifRef.current = null;
    };
  }, [call.open, call.call_type, call.caller_id]);

  useEffect(() => {
    if (!socket) return;
    const { listenToEvent, removeListener } = socket;

    listenToEvent(
      "call:incoming",
      (data: {
        call_id: number;
        caller_id: number;
        call_type: "audio" | "video";
      }) => {
        setCall({ open: true, ...data });
      },
    );

    return () => removeListener("call:incoming");
  }, [socket]);

  const makeControl = ({
    call_id,
    status,
  }: {
    call_id: number;
    status: PARTICIPANT_STATUSES;
  }) => {
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
    browserNotifRef.current?.close();
    browserNotifRef.current = null;

    mutate(
      { call_id, status, token: userDetail?.token },
      { onSuccess: () => setCall({ open: false, call_id: null }) },
    );
  };

  return (
    <Dialog open={call.open}>
      <DialogContent className="sm:max-w-[425px] text-center">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Incoming {call.call_type} call
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            User {call.caller_id} is calling you
          </p>
        </DialogHeader>

        <div className="flex justify-center gap-4 mt-6">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              if (!call.call_id) return;
              makeControl({ call_id: call.call_id, status: "rejected" });
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
      </DialogContent>
    </Dialog>
  );
}
