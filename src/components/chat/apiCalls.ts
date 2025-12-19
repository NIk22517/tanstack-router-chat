import type { ScheduleMessgaeType } from "@/routes/_auth/$chat_id.schedule";
import { services } from "@/services";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export const useCreateChat = () => {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async ({
      token,
      user_ids,
      name,
    }: {
      token?: string;
      user_ids: number[];
      name?: string;
    }) => {
      if (!user_ids || user_ids.length === 0) {
        throw new Error("Plese select users");
      }
      const res = await services.chatServices.createChat({
        token,
        data: {
          user_ids,
          name,
        },
      });
      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
    onSettled: (data, error, variables, context) => {
      if (error) {
        console.error(error);
      } else {
        if ("newChat" in data && "id" in data?.newChat) {
          navigate({
            to: "/$chat_id",
            params: { chat_id: data.newChat.id },
          });
        }
      }
    },
  });
};

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

export const useDeleteScheduleMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      schedule_id,
      token,
    }: {
      schedule_id: number;
      token: string | undefined;
      chat_id: string;
    }) => {
      if (!schedule_id) {
        throw new Error("Schedule id not found");
      }
      const res = await services.chatServices.deleteScheduleMessage({
        schedule_id,
        token,
      });

      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
    onSettled: async (data, error, variables, context) => {
      if (error) {
        console.error(error.message);
      } else {
        await queryClient.setQueryData(
          ["get_schedule_messages", variables.chat_id],
          (old: ScheduleMessgaeType[]) => {
            if (old) {
              return old.filter((el) => el.id !== variables.schedule_id);
            }
          }
        );
      }
    },
  });
};

export const useEditSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      schedule_id,
      scheduled_at,
      message,
      token,
    }: {
      message?: string;
      scheduled_at: string;
      schedule_id: number;
      token?: string;
      chat_id: string;
    }) => {
      const res = await services.chatServices.editScheduleMessage({
        data: {
          schedule_id,
          message,
          scheduled_at,
        },
        token,
      });

      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
    onSettled: async (data, error, variables, context) => {
      if (error) {
      } else {
        await queryClient.setQueryData(
          ["get_schedule_messages", variables.chat_id],
          (old: ScheduleMessgaeType[]) => {
            if (old) {
              return old.map((el) => {
                if (el.id === variables.schedule_id) {
                  return {
                    ...el,
                    scheduled_at: variables.scheduled_at,
                    message: variables.message,
                  };
                }
                return el;
              });
            }
          }
        );
      }
    },
  });
};
