import { services } from "@/services";
import { useMutation } from "@tanstack/react-query";

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
