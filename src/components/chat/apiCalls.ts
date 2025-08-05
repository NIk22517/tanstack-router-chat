import { services } from "@/services";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useMarkRead = () => {
  return useMutation({
    mutationFn: async ({
      chat_id,
      token,
    }: {
      chat_id: string;
      token?: string;
    }) => {
      const res = await services.chatServices.markRead({ token, chat_id });
      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
  });
};

export const useDeleteMessage = () => {
  return useMutation({
    mutationFn: async (data: {
      action: string;
      chat_id: number;
      message_ids: number[];
      token?: string;
    }) => {
      const res = await services.chatServices.deleteMessage({
        token: data.token,
        data,
      });
      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
  });
};

export const usePinUnpinChat = () => {
  return useMutation({
    mutationFn: async (data: {
      chat_id: number;
      pinned: boolean;
      token?: string;
    }) => {
      const res = await services.chatServices.pinUnpinChat({
        token: data.token,
        data: { chat_id: data.chat_id, pinned: data.pinned },
      });
      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
  });
};

export const useScheduleMessage = () => {
  return useMutation({
    mutationFn: async ({
      message,
      chat_id,
      token,
      scheduled_at,
    }: {
      message: string;
      chat_id: string;
      token?: string;
      scheduled_at: string;
    }) => {
      if (!message) return;
      const formData = new FormData();
      formData.append("chat_id", chat_id);
      formData.append("message", message);
      formData.append("scheduled_at", scheduled_at);

      const res = await services.chatServices.scheduleMessage({
        token,
        data: formData,
      });

      if (res.status === 200) {
        return res.data;
      }
      throw new Error(res?.data?.message);
    },
  });
};
