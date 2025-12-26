import { services } from "@/services";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { fallbackIcon, type ChatItem } from "../_chat";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { Phone, Search, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { SelectFiles } from "@/components/chat/SelectFiles";
import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarImage, Avatar } from "@/components/ui/avatar";
import { key, useChatState } from "@/hooks/useChatState";
import { ReplyData } from "@/components/chat/ReplyData";
import { Options } from "@/components/chat/Options";
import { useLongPress } from "@/hooks/useLongPress";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { DateTimePicker24h } from "@/components/ui/dateTimePicker";
import { useScheduleMessage } from "@/components/chat/apiCalls";
import moment from "moment";
import { useCreateCall } from "@/components/call/apiCalls";
import { RecordPreview } from "@/components/chat/RecordPreview";

export const getChatHeader = async (chat_id: string, token?: string) => {
  const res = await services.chatServices.singleChatList({ chat_id, token });
  if (res.status === 200) {
    return res.data.data as ChatItem;
  }
  throw new Error(res?.data?.message);
};

type SuggetionsType = {
  suggestions: string[];
};

export const getAiSuggestionReply = async ({
  chat_id,
  token,
}: {
  chat_id: string;
  token?: string;
}) => {
  const res = await services.aiServices.aiSuggestion({ chat_id, token });
  if (res.status === 200) {
    return res.data as SuggetionsType;
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
  validateSearch: (
    search: Record<string, unknown>
  ): { search_panel: boolean } => {
    return {
      search_panel: Boolean(search.search_panel) ?? false,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { chat_id } = Route.useParams();
  const { search_panel } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { userDetail } = Route.useRouteContext();
  const { data: stateData, resetData } = useChatState(key);
  const { mutate: mutateSchedule } = useScheduleMessage();
  const { mutate: createCall } = useCreateCall();

  const { data } = useSuspenseQuery({
    queryKey: ["get_chat_header", chat_id],
    queryFn: () => getChatHeader(chat_id, userDetail?.token),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // const { data: suggestions } = useQuery({
  //   queryKey: ["get_last_message_suggestion_reply", chat_id],
  //   queryFn: () =>
  //     getAiSuggestionReply({
  //       chat_id: chat_id,
  //       token: userDetail?.token,
  //     }),
  //   staleTime: Infinity,
  //   retry: false,
  //   refetchOnWindowFocus: false,
  // });

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
      if (message.trim().length === 0 && files.length === 0 && !recordedAudio) {
        throw new Error("Message can not be empty");
      }
      const formData = new FormData();
      formData.append("chat_id", chat_id);
      formData.append("message", message);
      files?.forEach((file) => {
        formData.append("files", file);
      });

      if (recordedAudio) {
        formData.append("files", recordedAudio);
      }

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
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
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
            setRecordedAudio(null);
            resetData();
          },
        }
      );
    },
  });

  return (
    <div className="w-full flex flex-col items-start">
      <div className="w-full p-2 border-b-1 border-gray-200 flex justify-between">
        {data.chat_type !== "single" ? (
          <div className="flex flex-row gap-2">
            <UserAvatar
              fallback={fallbackIcon[data.chat_type] ?? "Not Found"}
              className="w-10 h-10"
            />
            <div className="flex flex-col gap-1">
              <Label>{data.chat_name}</Label>
              <Label className="text-ellipsis line-clamp-1">
                {data.members.map((el) => el.name).join(", ")}
              </Label>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant={search_panel ? "secondary" : "ghost"}
            onClick={() => {
              navigate({
                search: (prev) => {
                  return {
                    ...prev,
                    search_panel: !prev.search_panel,
                  };
                },
              });
            }}
          >
            <Search />
          </Button>
          <Button
            variant={"ghost"}
            onClick={() => {
              createCall({
                chat_id,
                token: userDetail?.token,
              });
            }}
          >
            <Phone />
          </Button>
          <Options
            data={{
              chat_id: Number(chat_id),
              disable_clear_all: data?.last_message === null,
            }}
          />
        </div>
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

      {/* {suggestions && suggestions?.suggestions?.length > 0 && (
        <div className="flex flex-row gap-2 flex-nowrap items-center pb-2 scrollbar-hide">
          {suggestions.suggestions?.map((suggestion, i) => {
            return (
              <Button
                key={`${i + 1}`}
                size={"sm"}
                onClick={() => {
                  form.setFieldValue("message", suggestion);
                }}
                variant={"outline"}
              >
                {suggestion}
              </Button>
            );
          })}
        </div>
      )} */}

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
          <RecordPreview
            disabled={false}
            onAudioReady={(audio) => {
              setRecordedAudio(audio);
            }}
            recordedAudio={recordedAudio}
          />
          <SelectFiles
            selectFiles={(files) => {
              setFiles(files);
            }}
          />
          <form.Subscribe selector={(state) => [state.canSubmit]}>
            {([canSubmit]) => {
              const [popoverOpen, setPopoverOpen] = useState(false);
              const [longPressHandlers, wasLongPressed] = useLongPress({
                onLongPress: () => {
                  setPopoverOpen(true);
                },
              });

              const handleClick = (e: React.MouseEvent) => {
                if (wasLongPressed()) {
                  e.preventDefault();
                  return;
                }
                form.handleSubmit();
              };

              const handleSchedule = (date: Date) => {
                const utcDateTime = moment(date).utc().toISOString();

                console.log("📅 Schedule this message for:", utcDateTime);

                if (!form.state.values.message.trim().length) {
                  console.error(
                    "Please add messages to schedule can not schedule attachment"
                  );
                }

                mutateSchedule(
                  {
                    chat_id,
                    message: form.state.values.message,
                    scheduled_at: utcDateTime,
                    token: userDetail?.token,
                  },
                  {
                    onSuccess: () => {
                      setPopoverOpen(false);
                      form.reset({
                        message: "",
                      });
                    },
                  }
                );
              };

              return (
                <Drawer open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <Button
                    onClick={handleClick}
                    {...longPressHandlers}
                    disabled={!canSubmit}
                  >
                    <SendHorizontal />
                  </Button>

                  <DrawerContent className="w-full flex flex-col items-center pb-10">
                    <h2 className="text-lg font-semibold mb-4">
                      Schedule Message
                    </h2>
                    <DateTimePicker24h
                      onSchedule={(date) => {
                        handleSchedule(date);
                      }}
                    />
                  </DrawerContent>
                </Drawer>
              );
            }}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
