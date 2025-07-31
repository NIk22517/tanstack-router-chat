import { cn } from "@/lib/utils";
import { type ChatMessage } from "@/routes/_auth/_chat/$chat_id.index";
import { ActionTooltip } from "@/components/action-tooltip";
import { DeleteMessage } from "@/components/chat/DeleteMessage";
import { CheckCheck, Reply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useChatState, key } from "@/hooks/useChatState";
import { ReplyData } from "@/components/chat/ReplyData";

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
  const { setData } = useChatState(key);

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
                  <Button
                    onClick={() => {
                      setData({
                        reply: message,
                      });
                    }}
                  >
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
                <ReplyData message={message.reply_data as ChatMessage} />
                {message.attachments && message.attachments.length > 0 && (
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
                            <div
                              className="bg-white p-3 text-black rounded shadow flex items-center gap-3 cursor-pointer hover:bg-gray-100"
                              onClick={() =>
                                window.open(attachment.secure_url, "_blank")
                              }
                            >
                              <span
                                role="img"
                                aria-label="file"
                                className="text-xl"
                              >
                                📄
                              </span>

                              {/* File Name */}
                              <span className="truncate max-w-[200px]">
                                {attachment.original_filename}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {message.message && (
                  <p className="whitespace-pre-line">{message.message}</p>
                )}
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
