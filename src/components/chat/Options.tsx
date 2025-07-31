import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalStorage } from "@/hooks";
import { Menu } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { DeleteMessage } from "@/components/chat/DeleteMessage";
import { useState } from "react";
import { ChatSummary } from "@/components/chat/ChatSummary";

interface OptionsProps {
  data: {
    chat_id: number;
    disable_clear_all: boolean;
  };
}

export const Options = ({
  data: { chat_id, disable_clear_all },
}: OptionsProps) => {
  const { getItem, removeItem } = useLocalStorage("auth");
  const navigate = useNavigate();
  const userDetail = getItem();
  const [open, setOpen] = useState<"delete" | "summary" | "none">("none");
  if (!userDetail) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Menu />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                navigate({
                  to: "/user/$user_id",
                  params: {
                    user_id: userDetail.id.toString(),
                  },
                });
              }}
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setOpen("delete");
              }}
              disabled={disable_clear_all}
            >
              Clear All Messages
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setOpen("summary");
              }}
              disabled={disable_clear_all}
            >
              Generate Chat Summary
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                navigate({
                  to: "/$chat_id/schedule",
                  params: {
                    chat_id: chat_id?.toString(),
                  },
                });
              }}
            >
              Check Schedule Messages
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              removeItem();
              navigate({
                to: "/login",
                replace: true,
                reloadDocument: true,
              });
            }}
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteMessage
        data={{
          chat_id: chat_id,
          message_ids: [],
          open: open === "delete",
          sender_id: userDetail.id,
        }}
        onClose={() => {
          setOpen("none");
        }}
        action="default"
      />

      <ChatSummary
        open={open === "summary"}
        chat_id={chat_id}
        onClose={() => {
          setOpen("none");
        }}
      />
    </>
  );
};
