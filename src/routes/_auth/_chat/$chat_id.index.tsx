import { createFileRoute } from "@tanstack/react-router";
import type { ChatListPageParam } from "../_chat";
import { services } from "@/services";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useMessageProcessor } from "@/hooks/useMessagesProcess";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SingleMessage } from "@/components/chat/SingleMessage";
import { useMarkRead } from "@/components/chat/apiCalls";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import { ChevronsDown } from "lucide-react";

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
    attachments: AttachmentType[];
    sender_id: number;
    created_at: string;
    sender_name: string;
  };
  system_data: {
    event: SystemEventType;
    metadata: {
      actor: {
        id: number;
        name: string;
      };
      targets?: {
        id: number;
        name: string;
      }[];
    };
  } | null;
}

const systemRenderers: Record<
  SystemEventType,
  (m: ChatMessage) => React.ReactNode | null
> = {
  group_created: (m: ChatMessage) => {
    const actor = m.system_data?.metadata.actor;
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

export const chatMessagesQueryFn =
  (chat_id: string, token?: string) =>
  async ({
    pageParam,
  }: {
    pageParam: ChatListPageParam;
  }): Promise<ChatMessage[]> => {
    const res = await services.chatServices.getMessages({
      token,
      query: `?limit=${pageParam.limit}&offset=${pageParam.offset}`,
      chat_id,
    });

    if (res.status === 200) {
      return res.data.data;
    }

    throw new Error(res.data?.message);
  };

export const Route = createFileRoute("/_auth/_chat/$chat_id/")({
  beforeLoad: async (ctx) => {
    const { context, params } = ctx;
    await context.queryClient.prefetchInfiniteQuery({
      queryKey: ["get_chat_messages", params.chat_id],
      queryFn: chatMessagesQueryFn(params.chat_id, context.userDetail?.token),
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

function RouteComponent() {
  const { chat_id } = Route.useParams();
  const { userDetail, queryClient, socket } = Route.useRouteContext();
  const { mutate: mutateReadMsg } = useMarkRead();
  const { scrollContainerRef, isAtBottom, scrollToBottom } =
    useScrollToBottom();

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: ["get_chat_messages", chat_id],
      queryFn: chatMessagesQueryFn(chat_id, userDetail?.token),
      initialPageParam: {
        limit: 10,
        offset: 0,
      },
      getNextPageParam: (lastPage, allPages) => {
        return lastPage && lastPage.length >= 10
          ? { limit: 10, offset: allPages.length * 10 }
          : undefined;
      },
      refetchOnWindowFocus: false,
      retry: false,
    });

  useEffect(() => {
    if (!socket) return;

    socket.listenToEvent(
      "deleteMessage",
      (eventData: {
        action: "delete_for_me" | "delete_for_everyone" | "clear_all_chat";
        chat_id: number;
        deleted_by: number;
        messages_ids: number[];
      }) => {
        if (Number(chat_id) !== eventData.chat_id) return;
        const msg_id = new Set(eventData.messages_ids);
        queryClient.setQueryData(
          ["get_chat_messages", eventData.chat_id?.toString()],
          (old: { pageParams: number[]; pages: ChatMessage[][] }) => {
            if (eventData.action === "clear_all_chat") {
              return {
                pageParams: [],
                pages: [],
              };
            }
            if (old && Array.isArray(old.pages)) {
              return {
                ...old,
                pages: old.pages.map((page) => {
                  return page.map((el) => {
                    if (msg_id.has(el.id)) {
                      return {
                        ...el,
                        delete_action: eventData.action,
                        delete_text:
                          userDetail?.id === eventData.deleted_by
                            ? `You deleted this message ${eventData.action === "delete_for_me" ? "" : "for everyone"}`
                            : "This message is deleted by sender",
                      };
                    }
                    return el;
                  });
                }),
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
          (old: { pageParams: number[]; pages: ChatMessage[][] }) => {
            if (old && Array.isArray(old.pages)) {
              return {
                ...old,
                pages: old.pages.map((page) => {
                  return page.map((el) => {
                    return {
                      ...el,
                      read_status: "read",
                    };
                  });
                }),
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
        (old: { pageParams: number[]; pages: ChatMessage[][] } | undefined) => {
          if (old && Array.isArray(old.pages) && Array.isArray(old.pages[0])) {
            return {
              ...old,
              pages: [[eventdata, ...old.pages[0]], ...old.pages.slice(1)],
            };
          }

          return {
            pageParams: [],
            pages: [[eventdata]],
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

  const { flatMessages } = useMessageProcessor({
    data: data.pages.flatMap((el) => el),
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
