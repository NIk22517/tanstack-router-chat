import { services } from "@/services";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export const useCreateCall = () => {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async ({
      chat_id,
      token,
    }: {
      chat_id: string;
      token: string | undefined;
    }) => {
      if (!chat_id) {
        throw new Error("Chat id not found");
      }
      const res = await services.callServices.createCall({ chat_id, token });
      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
    onSettled: async (data, error) => {
      if (error) {
      } else {
        if (!data.id) return;
        navigate({
          to: "/call/$call_id",
          params: {
            call_id: data.id,
          },
        });
      }
    },
  });
};

export type PARTICIPANT_STATUSES = "invited" | "accepted" | "rejected" | "left";

export const useControlCall = () => {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async ({
      call_id,
      status,
      token,
    }: {
      call_id: number;
      status: PARTICIPANT_STATUSES;
      token: string | undefined;
    }) => {
      const res = await services.callServices.controlCall({
        data: {
          call_id,
          status,
        },
        token,
      });

      if (res.status === 200) {
        return res.data.data;
      }
      throw new Error(res?.data?.message);
    },
    onSettled: (data, error, variables, context) => {
      if (error) {
      } else {
        if (variables.status === "accepted") {
          navigate({
            to: "/call/$call_id",
            params: {
              call_id: variables.call_id?.toString(),
            },
          });
        }
      }
    },
  });
};
