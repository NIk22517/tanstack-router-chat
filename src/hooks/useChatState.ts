import type { ChatMessage } from "@/routes/_auth/_chat/$chat_id.index";
import { createGlobalState } from "./useGlobalState";

type MessageStateType = {
  reply: ChatMessage | null;
};

export const key = "chat_messages_state";

export const useChatState = createGlobalState<MessageStateType>({
  reply: null,
});
