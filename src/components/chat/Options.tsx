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

  // control modal type
  const [modalOpen, setModalOpen] = useState<"delete" | "summary" | "none">(
    "none"
  );

  // control dropdown open state
  const [menuOpen, setMenuOpen] = useState(false);

  if (!userDetail) return null;

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
              onSelect={() => {
                navigate({
                  to: "/user/$user_id",
                  params: { user_id: userDetail.id.toString() },
                });
              }}
            >
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false); // close menu
                setModalOpen("delete");
              }}
              disabled={disable_clear_all}
            >
              Clear All Messages
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false);
                setModalOpen("summary");
              }}
              disabled={disable_clear_all}
            >
              Generate Chat Summary
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => {
                navigate({
                  to: "/$chat_id/schedule",
                  params: { chat_id: chat_id?.toString() },
                });
              }}
            >
              Check Schedule Messages
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
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
          chat_id,
          message_ids: [],
          open: modalOpen === "delete",
          sender_id: userDetail.id,
        }}
        onClose={() => setModalOpen("none")}
        action="default"
      />

      <ChatSummary
        open={modalOpen === "summary"}
        chat_id={chat_id}
        onClose={() => setModalOpen("none")}
      />
    </>
  );
};
