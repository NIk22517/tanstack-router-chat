import { services } from "@/services";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import type { ChatItem } from "../_chat";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";

export const getChatHeader = async (chat_id: string, token?: string) => {
  const res = await services.chatServices.singleChatList({ chat_id, token });
  if (res.status === 200) {
    return res.data.data as ChatItem;
  }
  throw new Error(res?.data?.message);
};

export const Route = createFileRoute("/_auth/_chat/$chat_id")({
  beforeLoad: async (ctx) => {
    const { context, params } = ctx;
    await context.queryClient.prefetchQuery({
      queryKey: ["get_chat_header", params.chat_id],
      queryFn: () => getChatHeader(params.chat_id, context.userDetail?.token),
      staleTime: Infinity,
      retry: false,
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { chat_id } = Route.useParams();
  const { userDetail } = Route.useRouteContext();
  const { data } = useSuspenseQuery({
    queryKey: ["get_chat_header", chat_id],
    queryFn: () => getChatHeader(chat_id, userDetail?.token),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { mutate } = useMutation({
    mutationFn: async ({
      message,
      chat_id,
      token,
    }: {
      message: string;
      chat_id: string;
      token?: string;
    }) => {
      const formData = new FormData();
      formData.append("chat_id", chat_id);
      formData.append("message", message);
      const res = await services.chatServices.sendMessages({
        token,
        data: formData,
      });
      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
  });
  const form = useForm({
    defaultValues: {
      message: "",
    },
    onSubmit: (props) => {
      mutate(
        {
          chat_id,
          message: props.value.message,
          token: userDetail?.token,
        },
        {
          onSuccess: () => {
            form.reset({
              message: "",
            });
          },
        }
      );
    },
  });

  return (
    <div className="w-full flex flex-col items-start">
      <div className="w-full p-2 border-b-1 border-gray-200">
        {data.members.map((el) => {
          if (userDetail?.id === el.id) return null;
          return (
            <div key={el.id} className="flex flex-row gap-2">
              <UserAvatar fallback={el.name} className="w-10 h-10" />
              <div className="flex flex-col gap-1">
                <Label>{el.name}</Label>
                <Label>{el.email}</Label>
              </div>
            </div>
          );
        })}
      </div>
      <Outlet />

      <div className="w-full mt-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="flex items-center gap-2 p-2 border-1 border-gray-200"
        >
          <form.Field name="message">
            {({ state, handleChange, form }) => {
              return (
                <Textarea
                  value={state.value}
                  onChange={(e) => handleChange(e.target.value)}
                  className="resize-none text-xl min-h-2 max-h-20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      form.handleSubmit();
                    }
                  }}
                />
              );
            }}
          </form.Field>
          <form.Subscribe selector={(state) => [state.canSubmit]}>
            {([canSubmit]) => {
              return (
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  onClick={form.handleSubmit}
                >
                  <SendHorizontal />
                </Button>
              );
            }}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
