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

export type AttachmentType = {
  asset_id: string;
  public_id: string;
  version: 1747055225;
  version_id: string;
  signature: string;
  width: 626;
  height: 313;
  format: string;
  resource_type: "image";
  created_at: string;
  tags: string[];
  pages: 1;
  bytes: 31966;
  type: "upload";
  etag: string;
  placeholder: false;
  url: string;
  secure_url: string;
  original_filename: string;
};

export interface ChatMessage {
  chat_id: number;
  id: number;
  message: string;
  attachments: AttachmentType[] | null;
  sender_id: number;
  created_at: string;
  read_status: "read" | "unread";
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
}

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
      items: [],
    },
    getMessageType: () => "items",
  });
  return (
    <div className="w-full  h-full flex flex-col-reverse overflow-y-auto py-2 px-4 gap-2">
      {flatMessages.map((message) => {
        if ("date" in message) {
          return (
            <div
              key={message.date}
              className="w-full flex items-center justify-center "
            >
              <Label className="bg-green-100 p-2 rounded-xl">
                {message.date}
              </Label>
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
        handleFetchNext={() => {
          if (hasNextPage) {
            fetchNextPage();
          }
        }}
      />
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
