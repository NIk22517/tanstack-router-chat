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
import { useDeleteMessage } from "@/components/chat/apiCalls";

const allActions = [
  "delete_for_me",
  "delete_for_everyone",
  "clear_all_chat",
] as const;

type AllActions = (typeof allActions)[number];

interface DeleteMessageProps {
  data: {
    sender_id: number;
    open: boolean;
    message_ids: number[];
    chat_id: number;
  };
  onClose: () => void;
  action?: "default" | "user";
}

export const DeleteMessage = ({
  data: { open, sender_id, message_ids, chat_id },
  onClose,
  action = "user",
}: DeleteMessageProps) => {
  const { getItem } = useLocalStorage("auth");
  const userDetail = getItem();
  const { mutate, isPending } = useDeleteMessage();
  const handleDelete = (action: AllActions) => {
    mutate(
      {
        action,
        chat_id,
        message_ids,
        token: userDetail?.token,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-1xl">
        <DialogHeader>
          <DialogTitle>
            {action === "default" ? "Clear All Messages" : "Delete Message"}
          </DialogTitle>
          <DialogDescription>
            {action === "default"
              ? " Are you sure you want to claer all message? once deleted can not be recovered"
              : " Are you sure you want to delete this message?"}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          {action === "default" ? (
            <>
              <DialogClose asChild>
                <Button>Cancel</Button>
              </DialogClose>
              <Button
                disabled={isPending}
                variant={"outline"}
                onClick={() => handleDelete("clear_all_chat")}
              >
                Clear All Chat
              </Button>
            </>
          ) : (
            <>
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
                  {allActions
                    .filter((el) => el !== "clear_all_chat")
                    .map((action) => {
                      return (
                        <Button
                          disabled={isPending}
                          key={action}
                          onClick={() => handleDelete(action)}
                          className="capitalize"
                        >
                          {action.replaceAll("_", " ")}
                        </Button>
                      );
                    })}
                  <DialogClose asChild>
                    <Button variant={"outline"}>Cancel</Button>
                  </DialogClose>
                </div>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
