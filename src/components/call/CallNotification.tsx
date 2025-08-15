import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
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
        console.log("Incoming call", data);
        setCall({ open: true, ...data });
      }
    );

    return () => {
      removeListener("call:incoming");
    };
  }, [socket]);

  const makeControl = ({
    call_id,
    status,
  }: {
    call_id: number;
    status: PARTICIPANT_STATUSES;
  }) => {
    mutate(
      {
        call_id: call_id,
        status: status,
        token: userDetail?.token,
      },
      {
        onSuccess: () => {
          setCall({ open: false, call_id: null });
        },
      }
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
              const call_id = call.call_id;
              if (!call_id) return;
              makeControl({
                call_id,
                status: "rejected",
              });
            }}
          >
            <PhoneOff className="mr-2 h-4 w-4" /> Reject
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={() => {
              const call_id = call.call_id;
              if (!call_id) return;
              makeControl({
                call_id,
                status: "accepted",
              });
            }}
          >
            <Phone className="mr-2 h-4 w-4" /> Accept
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
