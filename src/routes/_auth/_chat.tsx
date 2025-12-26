import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { services } from "@/services";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useMatches,
} from "@tanstack/react-router";
import { useEffect, type JSX } from "react";
import { useMarkRead, usePinUnpinChat } from "@/components/chat/apiCalls";
import type { AttachmentType } from "./_chat/$chat_id.index";
import {
  Ellipsis,
  FileImage,
  MessageSquareDiff,
  PinOff,
  RadioTower,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import moment from "moment";

export interface ChatMember {
  id: number;
  name: string;
  email: string;
}

export interface LastMessage {
  message: string;
  attachments: AttachmentType[];
  created_at: string;
  message_id: number;
}

export interface ChatItem {
  chat_id: number;
  chat_name: string;
  chat_type: "single" | "group" | "broadcast";
  created_at: string;
  members: ChatMember[];
  last_message: LastMessage | null;
  unread_count: number;
  is_pinned: boolean;
}

const getTime = (time: string | null) => {
  if (!time) return "";
  const currentTime = moment();
  const msgTime = moment(time);
  if (msgTime) {
    if (msgTime.isSame(currentTime, "day")) {
      return msgTime.format("LT");
    } else if (msgTime.isSame(currentTime.clone().subtract(1, "days"), "day")) {
      return "Yesterday";
    } else {
      return msgTime.format("MMM DD, YYYY");
    }
  }
};

export interface ChatListPageParam {
  limit: number;
  offset: number;
}

export const chatListQueryFn =
  (token?: string) =>
  async ({
    pageParam,
  }: {
    pageParam: ChatListPageParam;
  }): Promise<ChatItem[]> => {
    const res = await services.chatServices.chatList({
      token,
      query: `?limit=${pageParam.limit}&offset=${pageParam.offset}`,
    });

    if (res.status === 200) {
      return res.data.data as ChatItem[];
    }

    throw new Error(res.data?.message);
  };

export const Route = createFileRoute("/_auth/_chat")({
  beforeLoad: async (ctx) => {
    const { context } = ctx;
    await context.queryClient.prefetchInfiniteQuery({
      queryKey: ["chat_list"],
      queryFn: chatListQueryFn(context.userDetail?.token),
      initialPageParam: {
        limit: 10,
        offset: 0,
      },
      staleTime: Infinity,
      retry: false,
    });
  },
  component: RouteComponent,
});

export const fallbackIcon: Record<ChatItem["chat_type"], JSX.Element | null> = {
  single: null,
  broadcast: <RadioTower />,
  group: <Users />,
};

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { userDetail, queryClient, socket } = Route.useRouteContext();
  const matches = useMatches();
  const chatMatch = matches.at(-1);
  const chat_id = (chatMatch?.params as Record<"chat_id", string> | undefined)
    ?.chat_id;

  const { mutate } = useMarkRead();
  const { mutate: mutatePin } = usePinUnpinChat();
  const { data } = useSuspenseInfiniteQuery({
    queryKey: ["chat_list"],
    queryFn: chatListQueryFn(userDetail?.token),
    initialPageParam: {
      limit: 10,
      offset: 0,
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage && lastPage.length === 10
        ? { limit: 10, offset: allPages.length * 10 }
        : undefined;
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: false,
  });

  const updateCount = (chat_id: number) => {
    const updatedPages = data.pages.map((pageGroup) =>
      pageGroup.map((chatItem) => {
        if (chatItem.chat_id === chat_id) {
          return {
            ...chatItem,
            unread_count: "0",
          };
        }
        return chatItem;
      })
    );
    queryClient.setQueryData(["chat_list"], {
      ...data,
      pages: updatedPages,
    });
  };

  const updatePinChat = (chat_id: number) => {
    const updatedPages = data.pages.map((pageGroup) =>
      pageGroup.map((chatItem) => {
        if (chatItem.chat_id === chat_id) {
          return {
            ...chatItem,
            is_pinned: !chatItem.is_pinned,
          };
        }
        return chatItem;
      })
    );
    queryClient.setQueryData(["chat_list"], {
      ...data,
      pages: updatedPages,
    });
  };

  useEffect(() => {
    if (!socket) return;
    socket.listenToEvent(
      "markReadMessage",
      (eventData: { chat_id: number; seen_by: number }) => {
        if (userDetail?.id !== eventData.seen_by) return;
        updateCount(eventData.chat_id);
      }
    );
    socket?.listenToEvent("sendMessage", (eventdata) => {
      const updatedPages = data.pages.map((pageGroup) =>
        pageGroup.map((chatItem) => {
          if (chatItem.chat_id === eventdata.chat_id) {
            return {
              ...chatItem,
              last_message: {
                attachments: eventdata.attachments,
                created_at: eventdata.created_at,
                message: eventdata.message,
              },
              unread_count:
                userDetail?.id === eventdata.sender_id
                  ? chatItem.unread_count
                  : Number(chatItem.unread_count) + 1,
            };
          }
          return chatItem;
        })
      );

      queryClient.setQueryData(["chat_list"], {
        ...data,
        pages: updatedPages,
      });
    });
    socket.listenToEvent(
      "deleteMessage",
      (eventData: {
        action: "self" | "everyone" | "clear_chat";
        chat_id: number;
        deleted_by: number;
        messages_ids: number[];
      }) => {
        const updatedPages = data.pages.map((pages) => {
          return pages.map((el) => {
            if (
              eventData.chat_id === el.chat_id &&
              eventData.messages_ids.some(
                (ele) => el?.last_message?.message_id === ele
              )
            ) {
              return {
                ...el,
                last_message: {
                  ...el.last_message,
                  attachments: [],
                  message: "This message is deleted",
                },
              };
            }
            return el;
          });
        });
        queryClient.setQueryData(["chat_list"], {
          ...data,
          pages: updatedPages,
        });
      }
    );
  }, [socket?.listenToEvent, data]);

  return (
    <div className="flex justify-between w-screen h-screen">
      <div
        className={cn(
          "relative flex flex-col gap-2 border-r-1 p-4 h-screen overflow-y-auto",
          chat_id ? "hidden sm:flex sm:w-sm" : "w-full sm:w-sm"
        )}
      >
        {data.pages
          .flatMap((el) => el)
          .map((el) => {
            return (
              <Link
                key={el.chat_id}
                to="/$chat_id"
                params={{
                  chat_id: el.chat_id?.toString(),
                }}
                className="group cursor-pointer p-2 flex flex-row gap-2 justify-between items-center border-1 border-gray-300 rounded-xl hover:bg-blue-100"
                activeProps={{
                  className: "bg-blue-100",
                }}
                onClick={() => {
                  if (Number(el.unread_count) > 0) {
                    mutate({
                      chat_id: el.chat_id?.toString(),
                      token: userDetail?.token,
                    });
                  }
                }}
              >
                <div className="flex flex-row gap-2 items-center">
                  <UserAvatar
                    fallback={fallbackIcon[el.chat_type] ?? el.members[0].name}
                  />
                  <div className="flex flex-col gap-0.5">
                    <Label>
                      {el.chat_type !== "single"
                        ? el.chat_name
                        : el.members[0].name}
                    </Label>
                    {el.last_message && (
                      <>
                        {el.last_message?.attachments?.length > 0 ? (
                          <>
                            {el.last_message.attachments[0].resource_type ===
                            "image" ? (
                              <div className="flex flex-row gap-0.5 items-center">
                                <FileImage size={"0.95rem"} />
                                <Label className="text-[12px]">Image</Label>
                              </div>
                            ) : (
                              <Label className="w-20 truncate">
                                {el.last_message.attachments[0].url}
                              </Label>
                            )}
                          </>
                        ) : (
                          <Label className="text-[12px] text-ellipsis line-clamp-1">
                            {el.last_message.message}
                          </Label>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-0.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size={"sm"} className="h-auto">
                          {el.is_pinned ? (
                            <PinOff className="size-3 rotate-45" />
                          ) : (
                            <Ellipsis className="size-3" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="p-2 cursor-pointer">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            mutatePin(
                              {
                                token: userDetail?.token,
                                chat_id: el.chat_id,
                                pinned: !el.is_pinned,
                              },
                              {
                                onSuccess: () => {
                                  updatePinChat(el.chat_id);
                                },
                              }
                            );
                          }}
                        >
                          {el.is_pinned ? "Un-Pin" : "Pin"} Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {el.unread_count > 0 && el.unread_count && (
                      <Badge
                        variant={"success"}
                        className="rounded-4xl h-6 w-6"
                      >
                        {el.unread_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] whitespace-nowrap">
                    {getTime(el?.last_message?.created_at ?? null)}
                  </p>
                </div>
              </Link>
            );
          })}
        <Button
          className="absolute right-8 bottom-10"
          onClick={() => {
            navigate({
              to: "/create/conversation",
            });
          }}
        >
          <MessageSquareDiff />
        </Button>
      </div>
      <Outlet />
    </div>
  );
}
