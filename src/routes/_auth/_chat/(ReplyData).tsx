import { Avatar, AvatarImage } from "@/components/ui/avatar";
import type { ChatMessage } from "./$chat_id.index";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CircleX } from "lucide-react";
import { ActionTooltip } from "@/components/action-tooltip";

interface ReplyProps {
  message: ChatMessage | null | undefined;
  className?: string;
  handleClose?: () => void;
}

export const ReplyData = ({ message, className, handleClose }: ReplyProps) => {
  if (!message) return null;
  return (
    <div
      className={cn(
        "bg-white rounded-sm border-l-5 border-yellow-400 flex justify-between",
        className
      )}
    >
      <div className="pl-2 pr-2">
        <p className="text-purple-500">{message?.sender_name}</p>
        {message.attachments.length > 0 && (
          <div
            className="grid gap-2 mt-2 mb-2"
            style={{
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
            }}
          >
            {message.attachments.slice(0, 6).map((attachment) => {
              return (
                <div
                  key={attachment.asset_id}
                  className="overflow-hidden rounded-2xl"
                >
                  {attachment.resource_type === "image" ? (
                    <Avatar className="w-full h-auto rounded-2xl">
                      <AvatarImage
                        src={attachment.secure_url}
                        className="object-cover w-full h-full"
                      />
                    </Avatar>
                  ) : (
                    <div className="bg-white p-2 text-black rounded shadow">
                      {JSON.stringify(attachment)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {message.message && (
          <p className="text-black text-ellipsis line-clamp-6">
            {message.message}
          </p>
        )}
      </div>

      {handleClose && (
        <ActionTooltip content={"Cancel Reply"} side="left">
          <Button onClick={handleClose} variant={"ghost"}>
            <CircleX />
          </Button>
        </ActionTooltip>
      )}
    </div>
  );
};
