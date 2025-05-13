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
import { SelectFiles } from "./(SelectFiles)";
import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarImage, Avatar } from "@/components/ui/avatar";
import { key, useChatState } from "@/hooks/useChatState";
import { ReplyData } from "./(ReplyData)";

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
  const { data: stateData, resetData } = useChatState(key);

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
      if (message.trim().length === 0 && files.length === 0) {
        throw new Error("Message can not be empty");
      }
      const formData = new FormData();
      formData.append("chat_id", chat_id);
      formData.append("message", message);
      files?.forEach((file) => {
        formData.append("files", file);
      });

      if (stateData?.reply?.id) {
        formData.append("reply_message_id", stateData?.reply?.id?.toString());
      }
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
  const [files, setFiles] = useState<File[]>([]);
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
            setFiles([]);
            resetData();
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
      {files.length > 0 ? (
        <div className="w-full h-full py-2 px-4 flex justify-center items-center overflow-hidden">
          <Carousel className="w-full h-full flex items-center justify-center">
            <CarouselContent>
              {files.map((file, index) => (
                <CarouselItem key={`${index + 1}`} className="h-full w-full">
                  <div className="flex items-center justify-center h-[50vh] w-full">
                    <Card className="h-full w-full">
                      <CardContent className="h-full w-full">
                        {file.type.startsWith("image/") ? (
                          <Avatar className="h-full w-full rounded-none">
                            <AvatarImage
                              src={URL.createObjectURL(file)}
                              className="h-full w-full object-contain"
                            />
                          </Avatar>
                        ) : (
                          ""
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      ) : (
        <Outlet />
      )}

      <div className="w-full mt-auto border-1 border-gray-200 p-2">
        <ReplyData
          message={stateData?.reply}
          className="mb-2"
          handleClose={() => {
            resetData();
          }}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="flex items-center gap-2"
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
          <SelectFiles
            selectFiles={(files) => {
              setFiles(files);
            }}
          />
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
