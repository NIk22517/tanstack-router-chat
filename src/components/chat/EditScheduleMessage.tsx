import { Pencil } from "lucide-react";
import { ActionTooltip } from "../action-tooltip";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { DateTimePicker24h } from "../ui/dateTimePicker";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { useEditSchedule } from "./apiCalls";
import { useLocalStorage } from "@/hooks";

export const EditScheduleMessge = ({
  data,
}: {
  data: {
    message: string;
    scheduled_at: string;
    schedule_id: number;
    chat_id: number;
  };
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(data.message);
  const { mutate } = useEditSchedule();
  const { getItem } = useLocalStorage("auth");

  return (
    <>
      <ActionTooltip content="Edit Schedule">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Pencil className="w-4 h-4" />
        </Button>
      </ActionTooltip>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full flex flex-col items-center pb-10">
          <SheetHeader>
            <SheetTitle>Edit Schedule Message</SheetTitle>
            <SheetDescription>addd some description</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col items-center gap-2">
            <Input
              placeholder="Add message that you want to schedule"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <DateTimePicker24h
              data={new Date(data.scheduled_at)}
              onSchedule={(date) => {
                mutate(
                  {
                    scheduled_at: date.toISOString(),
                    schedule_id: data.schedule_id,
                    message: message,
                    token: getItem()?.token,
                    chat_id: data.chat_id?.toString(),
                  },
                  {
                    onSuccess: () => {
                      setOpen(false);
                    },
                  }
                );
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
