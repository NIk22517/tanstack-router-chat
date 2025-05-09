import { BaseService, type AuthInfo } from "./BaseService";

export class ChatServices extends BaseService {
  chatList = (values: AuthInfo & { query: string }) => {
    return this.instance.get("/chat" + values.query, {
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
}
