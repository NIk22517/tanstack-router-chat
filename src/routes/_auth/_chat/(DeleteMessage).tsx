import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocalStorage } from "@/hooks";
import { useDeleteMessage } from "./(apiCalls)";

const allActions = ["delete_for_me", "delete_for_everyone"] as const;

type AllActions = (typeof allActions)[number];

interface DeleteMessageProps {
  data: {
    sender_id: number;
    open: boolean;
    message_ids: number[];
    chat_id: number;
  };
  onClose: () => void;
}

export const DeleteMessage = ({
  data: { open, sender_id, message_ids, chat_id },
  onClose,
}: DeleteMessageProps) => {
  const { getItem } = useLocalStorage("auth");
  const userDetail = getItem();
  const { mutate, isPending } = useDeleteMessage();
  const handleDelete = (action: AllActions) => {
    mutate({
      action,
      chat_id,
      message_ids,
      token: userDetail?.token,
    });
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-1xl">
        <DialogHeader>
          <DialogTitle>Delete Message</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this message?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          {userDetail?.id !== sender_id ? (
            <>
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
              <Button
                disabled={isPending}
                variant={"outline"}
                onClick={() => handleDelete("delete_for_me")}
              >
                Delete for me
              </Button>
            </>
          ) : (
            <div className="w-full flex flex-col gap-2 justify-start">
              {allActions.map((action) => {
                return (
                  <Button
                    disabled={isPending}
                    key={action}
                    onClick={() => handleDelete(action)}
                  >
                    {action}
                  </Button>
                );
              })}
              <DialogClose asChild>
                <Button variant={"outline"}>Cancel</Button>
              </DialogClose>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
