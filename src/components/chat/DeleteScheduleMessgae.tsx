import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { ActionTooltip } from "@/components/action-tooltip";
import { useDeleteScheduleMessage } from "./apiCalls";
import { useLocalStorage } from "@/hooks";
import { useState } from "react";

export const DeleteScheduleMessage = ({
  schedule_id,
  chat_id,
}: {
  schedule_id: number;
  chat_id: number;
}) => {
  const { getItem } = useLocalStorage("auth");
  const [open, setOpen] = useState(false);

  const { mutate, isPending } = useDeleteScheduleMessage();

  return (
    <>
      <ActionTooltip content="Delete Schedule">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </ActionTooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Schedule Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this schedule message? Once
              deleted, it cannot be recovered.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isPending}>Cancel</Button>
            </DialogClose>
            <Button
              disabled={isPending}
              variant="destructive"
              onClick={() => {
                mutate(
                  {
                    schedule_id,
                    token: getItem()?.token ?? undefined,
                    chat_id: chat_id?.toString(),
                  },
                  {
                    onSuccess: () => {
                      setOpen(false);
                    },
                  }
                );
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
