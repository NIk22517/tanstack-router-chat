import { cn } from "@/lib/utils";
import { Route, type ChatMessage } from "./$chat_id.index";
import { ActionTooltip } from "@/components/action-tooltip";
import { DeleteMessage } from "./(DeleteMessage)";
import { CheckCheck, Reply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

interface MessageProps {
  message: ChatMessage;
  isYou: boolean;
}

enum MessageAction {
  DELETE = "delete",
  REPLY = "reply",
  DEFAULT = "default",
}

export interface MessageRouteState {
  message: ChatMessage;
}

export const SingleMessage = ({ message, isYou }: MessageProps) => {
  const [action, setAction] = useState<MessageAction>(MessageAction.DEFAULT);

  return (
    <div
      key={message.id}
      className={cn("w-full flex", isYou ? "justify-end" : "justify-start")}
    >
      {message.delete_text ? (
        <Label className="bg-gray-200 text-black px-4 py-2 italic">
          {message.delete_text}
        </Label>
      ) : (
        <>
          <div className="flex flex-col">
            <ActionTooltip
              content={
                <div>
                  <Button
                    onClick={() => {
                      setAction(MessageAction.DELETE);
                    }}
                  >
                    <Trash2 />
                  </Button>
                  <Button onClick={() => {}}>
                    <Reply />
                  </Button>
                </div>
              }
            >
              <div
                className={cn(
                  "max-w-md rounded px-4 py-2",
                  isYou ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
                )}
              >
                {message.attachments.length > 0 && (
                  <div
                    className="grid gap-2 mt-2"
                    style={{
                      gridTemplateColumns:
                        message.attachments.length === 1
                          ? "1fr"
                          : message.attachments.length === 2
                            ? "1fr 1fr"
                            : "1fr 1fr 1fr",
                    }}
                  >
                    {message.attachments.map((attachment) => {
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
                {message.message && <p className="mt-2">{message.message}</p>}
              </div>
            </ActionTooltip>
            <div
              className={cn(!isYou ? "hidden" : "flex items-end justify-end")}
            >
              <ActionTooltip content={message.read_status} side="left">
                <CheckCheck
                  size={"0.95rem"}
                  className={cn(
                    message.read_status === "read"
                      ? "text-blue-400 text-end"
                      : "text-gray-400"
                  )}
                />
              </ActionTooltip>
            </div>
          </div>

          <DeleteMessage
            data={{
              sender_id: message.sender_id,
              open: MessageAction.DELETE === action,
              chat_id: message.chat_id,
              message_ids: [message.id],
            }}
            onClose={() => {
              setAction(MessageAction.DEFAULT);
            }}
          />
        </>
      )}
    </div>
  );
};
