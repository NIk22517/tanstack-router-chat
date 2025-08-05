import { createFileRoute } from "@tanstack/react-router";
import { ScheduleCard } from "@/components/chat/ScheduleCard";
import { useSuspenseQuery } from "@tanstack/react-query";
import { services } from "@/services";

export type ScheduleMessgaeType = {
  id: number;
  chat_id: number;
  user_id: number;
  message: string;
  scheduled_at: string;
  status: "completed" | "pending" | "processing" | "failed";
  retry_count: number;
  last_attempt_at: string;
  completed_at: string | null;
  created_at: string;
};

const get_schedule_messages = async ({
  chat_id,
  token,
}: {
  chat_id: string;
  token: string | undefined;
}) => {
  const res = await services.chatServices.getScheduleMessages({
    chat_id,
    token,
  });

  if (res.status === 200) {
    return res.data.data as ScheduleMessgaeType[];
  }
  throw new Error(res?.data?.message);
};

export const useGetScheduleChatMessages = ({
  chat_id,
  token,
}: {
  chat_id?: string;
  token: string | undefined;
}) => {
  return useSuspenseQuery<ScheduleMessgaeType[]>({
    queryKey: ["get_schedule_messages", chat_id],
    queryFn: async () => {
      if (!chat_id) return [];
      return get_schedule_messages({ chat_id, token });
    },
  });
};

export const Route = createFileRoute("/_auth/$chat_id/schedule")({
  beforeLoad: async (ctx) => {
    const {
      params: { chat_id },
      context: { userDetail, queryClient },
    } = ctx;

    await queryClient.prefetchQuery({
      queryKey: ["get_schedule_messages", chat_id],
      queryFn: async () => {
        return get_schedule_messages({ chat_id, token: userDetail?.token });
      },
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { chat_id } = Route.useParams();
  const { userDetail } = Route.useRouteContext();
  const { data } = useGetScheduleChatMessages({
    chat_id,
    token: userDetail?.token,
  });
  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-2">
      {data?.map((el) => <ScheduleCard data={el} key={el.id} />)}
    </div>
  );
}
