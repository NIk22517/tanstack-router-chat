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
import { DeleteMessage } from "./(DeleteMessage)";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);
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
                setOpen(true);
              }}
              disabled={disable_clear_all}
            >
              Clear All Messages
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
          open: open,
          sender_id: userDetail.id,
        }}
        onClose={() => {
          setOpen(false);
        }}
        action="default"
      />
    </>
  );
};
