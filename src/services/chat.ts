import { BaseService, type AuthInfo } from "./BaseService";

export class ChatServices extends BaseService {
  createChat = (
    values: AuthInfo & {
      data: {
        user_ids: number[];
        name?: string;
      };
    }
  ) => {
    return this.instance.post(
      "/chat/create",
      { data: values.data },
      {
        ...this.buildConfig({ auth: values }),
      }
    );
  };

  chatList = (values: AuthInfo & { query: string }) => {
    return this.instance.get("/chat" + values.query, {
      ...this.buildConfig({ auth: values }),
    });
  };

  getConversationContact = (values: AuthInfo) => {
    return this.instance.get("/chat/conversation-contacts", {
      ...this.buildConfig({ auth: values }),
    });
  };

  singleChatList = (values: AuthInfo & { chat_id: string }) => {
    return this.instance.get(`/chat/list/${values.chat_id}`, {
      ...this.buildConfig({
        auth: values,
      }),
    });
  };

  getMessages = (values: AuthInfo & { chat_id: string; query: string }) => {
    return this.instance.get(
      `/chat/messages/${values.chat_id}` + values.query,
      this.buildConfig({ auth: values })
    );
  };

  sendMessages = (values: AuthInfo & { data: FormData }) => {
    return this.instance.post(
      "/chat/send-message",
      values.data,
      this.buildConfig({ isMultipart: true, auth: values })
    );
  };

  markRead = (values: AuthInfo & { chat_id: string }) => {
    return this.instance.get(
      `/chat/read/${values.chat_id}`,
      this.buildConfig({ auth: values })
    );
  };

  deleteMessage = (
    values: AuthInfo & {
      data: { action: string; chat_id: number; message_ids: number[] };
    }
  ) => {
    return this.instance.post(
      "/chat/messages/delete",
      { data: values.data },
      this.buildConfig({ auth: values })
    );
  };

  chatSummary = (values: AuthInfo & { chat_id: string }) => {
    return this.instance.get(
      `/ai/summary/${values.chat_id}`,
      this.buildConfig({
        auth: values,
        customHeaders: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    );
  };

  pinUnpinChat = (
    values: AuthInfo & { data: { chat_id: number; pinned: boolean } }
  ) => {
    return this.instance.post(
      `/chat/pin`,
      { data: values.data },
      this.buildConfig({
        auth: values,
      })
    );
  };

  scheduleMessage = (values: AuthInfo & { data: FormData }) => {
    return this.instance.post(
      "/chat/messages/schedule",
      values.data,
      this.buildConfig({ isMultipart: true, auth: values })
    );
  };

  getScheduleMessages = (values: AuthInfo & { chat_id: string }) => {
    return this.instance.get(
      "/chat/schedule/" + values.chat_id,
      this.buildConfig({ auth: values })
    );
  };

  deleteScheduleMessage = (values: AuthInfo & { schedule_id: number }) => {
    return this.instance.delete(
      `chat/schedule/${values.schedule_id}`,
      this.buildConfig({ auth: values })
    );
  };

  editScheduleMessage = (
    values: AuthInfo & {
      data: { message?: string; scheduled_at?: string; schedule_id: number };
    }
  ) => {
    return this.instance.post(
      `/chat/schedule`,
      { data: values.data },
      this.buildConfig({ auth: values })
    );
  };
}
