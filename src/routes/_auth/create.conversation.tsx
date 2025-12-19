import { ActionTooltip } from "@/components/action-tooltip";
import { useCreateChat } from "@/components/chat/apiCalls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { services } from "@/services";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { useState } from "react";

const getContactList = (token?: string) => async () => {
  const res = await services.chatServices.getConversationContact({ token });
  if (res.status === 200) {
    return res?.data?.data as {
      id: number;
      name: string;
    }[];
  }
  throw new Error(res?.data?.message);
};

export const Route = createFileRoute("/_auth/create/conversation")({
  component: RouteComponent,
  beforeLoad: async (ctx) => {
    const { context } = ctx;
    await context.queryClient.prefetchQuery({
      queryKey: ["conversation_contact_list"],
      queryFn: getContactList(context.userDetail?.token),
      staleTime: Infinity,
      retry: false,
    });
  },
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { userDetail } = Route.useRouteContext();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { mutate, isPending } = useCreateChat();

  const { data } = useSuspenseQuery({
    queryKey: ["conversation_contact_list"],
    queryFn: getContactList(userDetail?.token),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: false,
  });
  return (
    <div className="w-screen h-screen">
      {selected.size > 0 ? (
        <div className="flex justify-between p-2 gap-3">
          <ActionTooltip content="Close" align="end" side="right">
            <Button
              onClick={() => {
                setSelected(new Set());
              }}
            >
              <X />
            </Button>
          </ActionTooltip>
          <div>
            <Button
              disabled={isPending || selected.size <= 0}
              onClick={() => {
                mutate({
                  token: userDetail?.token,
                  user_ids: [...selected],
                });
              }}
            >
              Create Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex p-2 items-center gap-2">
          <Button
            variant={"ghost"}
            onClick={() => {
              navigate({
                to: "/",
              });
            }}
          >
            <ArrowLeft />
          </Button>
          <Label>Select User</Label>
        </div>
      )}

      <div className="flex flex-col p-2 gap-3">
        {data?.map((user) => {
          return (
            <div
              key={user.id}
              className={`flex items-center gap-3 px-5 py-2 border-1 border-gray-300 rounded-2xl cursor-pointer ${selected.has(user.id) && "bg-blue-200"}`}
              onClick={() => {
                setSelected((prev) => {
                  const newValue = new Set(prev);
                  if (newValue.has(user.id)) {
                    newValue.delete(user.id);
                  } else {
                    newValue.add(user.id);
                  }
                  return newValue;
                });
              }}
            >
              <Checkbox className="w-6 h-6" checked={selected.has(user.id)} />
              <UserAvatar fallback={user.name} className="w-10 h-10" />
              <Label className="text-2xl cursor-pointer">{user.name}</Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
