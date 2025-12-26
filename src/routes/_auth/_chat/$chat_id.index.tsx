import { createFileRoute } from "@tanstack/react-router";
import { services } from "@/services";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useMessageProcessor } from "@/hooks/useMessagesProcess";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SingleMessage } from "@/components/chat/SingleMessage";
import { useMarkRead } from "@/components/chat/apiCalls";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import { ChevronsDown, Cross, MessageCircleX } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ActionTooltip } from "@/components/action-tooltip";

export type AttachmentType = {
  asset_id: string;
  public_id: string;
  version: number;
  version_id: string;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: "image" | "video";
  created_at: string;
  tags: string[];
  pages: number;
  bytes: number;
  type: "upload";
  etag: string;
  placeholder: false;
  url: string;
  secure_url: string;
  original_filename: string;
  audio?: {
    codec: string;
    frequency: number;
    channels: number;
    channel_layout: string;
  };
  duration?: number;
};

type SystemEventType =
  | "group_created"
  | "users_added"
  | "user_removed"
  | "user_left"
  | "group_name_changed"
  | "group_avatar_changed"
  | "message_pinned";

export interface ChatMessage {
  chat_id: number;
  id: number;
  message: string;
  attachments: AttachmentType[] | null;
  sender_id: number;
  created_at: string;
  read_status: "read" | "unread";
  message_type: "user" | "system";
  sender_name: string;
  delete_action: string | null;
  delete_text: string | null;
  reply_data?: {
    id: number;
    message: string;
    attachments: AttachmentType[] | null;
    sender_id: number;
    created_at: string;
    sender_name: string;
  };
  system_data: {
    event: SystemEventType;
    actor: {
      id: number;
      name: string;
    };
    targets?: {
      id: number;
      name: string;
    }[];
  } | null;
}

const systemRenderers: Record<
  SystemEventType,
  (m: ChatMessage) => React.ReactNode | null
> = {
  group_created: (m: ChatMessage) => {
    const actor = m.system_data?.actor;
    return (
      <span className="text-sm text-muted-foreground">
        <strong>{actor?.name}</strong> created the group
      </span>
    );
  },
  group_avatar_changed: () => null,
  group_name_changed: () => null,
  message_pinned: () => null,
  user_left: () => null,
  user_removed: () => null,
  users_added: () => null,
};

export type ChatMessagesParam = {
  limit: number;
  before_id?: number;
  after_id?: number;
  around_id?: number;
};

type ChatResponse = {
  data: ChatMessage[];
  paging: {
    has_older: boolean;
    has_newer: boolean;
    oldest_id: number;
    newest_id: number;
    limit: number;
  };
};

export const chatMessagesQueryFn =
  (chat_id: string, token?: string) =>
  async ({
    pageParam,
  }: {
    pageParam: ChatMessagesParam;
  }): Promise<ChatResponse> => {
    const params = new URLSearchParams();
    params.set("limit", String(pageParam.limit));

    if (pageParam.before_id) {
      params.set("before_id", String(pageParam.before_id));
    }

    if (pageParam.after_id) {
      params.set("after_id", String(pageParam.after_id));
    }

    if (pageParam.around_id) {
      params.set("around_id", String(pageParam.around_id));
    }

    console.log(pageParam, "pageParam");

    const res = await services.chatServices.getMessages({
      token,
      query: `?${params.toString()}`,
      chat_id,
    });

    if (res.status === 200) {
      return res.data.data;
    }

    throw new Error(res.data?.message);
  };

export const Route = createFileRoute("/_auth/_chat/$chat_id/")({
  beforeLoad: async (ctx) => {
    const { context, params, search } = ctx;
    await context.queryClient.prefetchInfiniteQuery({
      queryKey: [
        "get_chat_messages",
        params.chat_id,
        { around_id: search?.message_search_id },
      ],
      queryFn: chatMessagesQueryFn(params.chat_id, context.userDetail?.token),
      initialPageParam: {
        limit: 10,
        around_id: search?.message_search_id,
      } as ChatMessagesParam,
      staleTime: Infinity,
      retry: false,
    });
  },
  validateSearch: (
    search: Record<string, unknown>
  ): { message_search_id?: number | null } => {
    return {
      message_search_id: search?.message_search_id
        ? Number(search.message_search_id)
        : null,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { chat_id } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });
  const { message_search_id } = Route.useSearch();
  const { userDetail, queryClient, socket } = Route.useRouteContext();
  const { mutate: mutateReadMsg } = useMarkRead();
  const { scrollContainerRef, isAtBottom, scrollToBottom } =
    useScrollToBottom();

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    hasPreviousPage,
    fetchPreviousPage,
    isFetchingPreviousPage,
  } = useSuspenseInfiniteQuery({
    queryKey: ["get_chat_messages", chat_id, { around_id: message_search_id }],
    queryFn: chatMessagesQueryFn(chat_id, userDetail?.token),
    initialPageParam: {
      limit: 10,
      ...(message_search_id ? { around_id: message_search_id } : {}),
    } as ChatMessagesParam,
    getNextPageParam: (lastPage) => {
      if (!lastPage.paging.has_older) return undefined;
      return {
        limit: lastPage.paging.limit,
        before_id: lastPage.paging.oldest_id!,
      };
    },
    getPreviousPageParam: (firstPage) => {
      if (!firstPage.paging.has_newer) return undefined;
      return {
        limit: firstPage.paging.limit,
        after_id: firstPage.paging.newest_id!,
      };
    },
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (!socket) return;

    socket.listenToEvent(
      "deleteMessage",
      (eventData: {
        action: "self" | "everyone" | "clear_chat";
        chat_id: number;
        deleted_by: number;
        messages_ids: number[];
      }) => {
        if (Number(chat_id) !== eventData.chat_id) return;
        const msg_id = new Set(eventData.messages_ids);
        queryClient.setQueryData(
          ["get_chat_messages", eventData.chat_id?.toString()],
          (
            old:
              | {
                  pageParams: (ChatMessagesParam | undefined)[];
                  pages: ChatResponse[];
                }
              | undefined
          ) => {
            if (eventData.action === "clear_chat") {
              return {
                pageParams: [undefined],
                pages: [
                  {
                    data: [],
                    paging: {
                      has_newer: false,
                      has_older: false,
                      oldest_id: null,
                      newest_id: null,
                      limit: 0,
                    },
                  },
                ],
              };
            }
            if (old && Array.isArray(old.pages)) {
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.map((el) => {
                    if (msg_id.has(el.id)) {
                      return {
                        ...el,
                        delete_action: eventData.action,
                        delete_text:
                          userDetail?.id === eventData.deleted_by
                            ? `You deleted this message ${eventData.action === "self" ? "" : "for everyone"}`
                            : "This message is deleted by sender",
                      };
                    }
                    return el;
                  }),
                })),
              };
            }
          }
        );
      }
    );

    socket.listenToEvent(
      "markReadMessage",
      (eventData: { chat_id: number; seen_by: number }) => {
        if (
          userDetail?.id === eventData.seen_by ||
          Number(chat_id) !== eventData.chat_id
        )
          return;

        queryClient.setQueryData(
          ["get_chat_messages", eventData.chat_id?.toString()],
          (
            old:
              | {
                  pageParams: (ChatMessagesParam | undefined)[];
                  pages: ChatResponse[];
                }
              | undefined
          ) => {
            if (old && Array.isArray(old.pages)) {
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.map((el) => {
                    return {
                      ...el,
                      read_status: "read",
                    };
                  }),
                })),
              };
            }
          }
        );
      }
    );
    socket?.listenToEvent("sendMessage", (eventdata) => {
      if (Number(chat_id) !== eventdata.chat_id) return;
      queryClient.setQueryData(
        ["get_chat_messages", eventdata.chat_id?.toString()],
        (
          old:
            | {
                pageParams: (ChatMessagesParam | undefined)[];
                pages: ChatResponse[];
              }
            | undefined
        ) => {
          if (old && Array.isArray(old.pages) && old.pages.length > 0) {
            const firstPage = old.pages[0];

            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  data: [eventdata, ...firstPage.data],
                },
                ...old.pages.slice(1),
              ],
            };
          }

          return {
            pageParams: [undefined],
            pages: [
              {
                data: [eventdata],
                paging: {
                  has_newer: false,
                  has_older: false,
                  oldest_id: eventdata.id,
                  newest_id: eventdata.id,
                  limit: 1,
                },
              },
            ],
          };
        }
      );

      if (eventdata.sender_id !== userDetail?.id) {
        mutateReadMsg({
          chat_id: eventdata.chat_id,
          token: userDetail?.token,
        });
      }

      queryClient.invalidateQueries({
        queryKey: [
          "get_last_message_suggestion_reply",
          eventdata.chat_id?.toString(),
        ],
      });
    });
  }, [socket?.listenToEvent]);

  useEffect(() => {
    if (!message_search_id) return;

    requestAnimationFrame(() => {
      const el = document.getElementById(`message-${message_search_id}`);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  }, [message_search_id]);

  const { flatMessages } = useMessageProcessor({
    data: data.pages.flatMap((el) => el.data),
    groupTemplate: {
      items: [] as ChatMessage[],
      system: [] as ChatMessage[],
    },
    getMessageType: (item) => {
      if (item.message_type === "system") return "system";
      return "items";
    },
  });
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="w-full h-full flex flex-col-reverse overflow-y-auto py-2 px-4 gap-2"
      >
        <MessageHead
          has_data={true}
          show_end_reach={false}
          hasNextPage={hasPreviousPage}
          handleFetchNext={() => hasPreviousPage && fetchPreviousPage()}
          isFetchingNextPage={isFetchingPreviousPage}
        />
        {flatMessages.map((message) => {
          if ("date" in message) {
            return (
              <div key={message.date} className="w-full flex justify-center">
                <Label className="bg-green-100 p-2 rounded-xl">
                  {message.date}
                </Label>
              </div>
            );
          } else if ("system" in message) {
            if (!message.system.system_data?.event) return null;
            const render = systemRenderers[message.system.system_data?.event];
            if (!render) return null;
            return (
              <div
                key={message.system.id}
                className="w-full flex justify-center"
              >
                {render(message.system)}
              </div>
            );
          } else if ("items" in message) {
            const isYou = message.items.sender_id === userDetail?.id;
            return (
              <SingleMessage
                key={message.items.id}
                isYou={isYou}
                message={message.items}
              />
            );
          }
        })}

        <MessageHead
          hasNextPage={hasNextPage}
          has_data={flatMessages.length > 0}
          isFetchingNextPage={isFetchingNextPage}
          show_end_reach={flatMessages.length > 8}
          handleFetchNext={() => hasNextPage && fetchNextPage()}
        />
      </div>

      {!isAtBottom && (
        <Button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full shadow-lg"
        >
          <ChevronsDown />
        </Button>
      )}

      {message_search_id && (
        <ActionTooltip content="Close Search" align="start" side="top">
          <Button
            onClick={() => {
              navigate({
                search: {
                  message_search_id: null,
                  search_panel: false,
                },
              });
            }}
            className="absolute bottom-4 right-1/3 -translate-x-1/3 z-20 rounded-full shadow-lg"
          >
            <MessageCircleX />
          </Button>
        </ActionTooltip>
      )}
    </div>
  );
}

const MessageHead = ({
  hasNextPage,
  has_data,
  isFetchingNextPage,
  handleFetchNext,
  show_end_reach,
}: {
  hasNextPage: boolean;
  has_data: boolean;
  isFetchingNextPage: boolean;
  handleFetchNext: () => void;
  show_end_reach: boolean;
}) => {
  return (
    <>
      {has_data ? (
        <div className="flex justify-center items-center">
          {hasNextPage ? (
            <>
              {isFetchingNextPage ? (
                <Label className="text-center text-gray-300">Loading....</Label>
              ) : (
                <Button onClick={handleFetchNext}>Load More</Button>
              )}
            </>
          ) : (
            <>
              {show_end_reach ? (
                <Label className="text-center text-gray-300">
                  You've reached the end of the conversation
                </Label>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="h-full flex justify-center items-center">
          <Label className="text-gray-200">No Messages Found</Label>
        </div>
      )}
    </>
  );
};
