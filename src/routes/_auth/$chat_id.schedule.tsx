import { createFileRoute } from "@tanstack/react-router";
import { ScheduleCard } from "@/components/chat/ScheduleCard";

export const Route = createFileRoute("/_auth/$chat_id/schedule")({
  component: RouteComponent,
});

const data = [
  {
    id: 26,
    chat_id: 1,
    sender_id: 1,
    message: "hello",
    scheduled_at: "2025-07-31T11:50:00.000Z",
    active: true,
    status: "pending",
    retry_count: 0,
    last_attempt_at: null,
    completed_at: null,
    error_message: null,
    created_at: "2025-07-31T11:48:06.330Z",
  },
  {
    id: 27,
    chat_id: 1,
    sender_id: 1,
    message: "hello",
    scheduled_at: "2025-07-31T11:50:00.000Z",
    active: true,
    status: "pending",
    retry_count: 0,
    last_attempt_at: null,
    completed_at: null,
    error_message: null,
    created_at: "2025-07-31T11:48:06.330Z",
  },
  {
    id: 28,
    chat_id: 1,
    sender_id: 1,
    message: "hello",
    scheduled_at: "2025-07-31T11:50:00.000Z",
    active: true,
    status: "pending",
    retry_count: 0,
    last_attempt_at: null,
    completed_at: null,
    error_message: null,
    created_at: "2025-07-31T11:48:06.330Z",
  },
  {
    id: 29,
    chat_id: 1,
    sender_id: 1,
    message: "hello",
    scheduled_at: "2025-07-31T11:50:00.000Z",
    active: true,
    status: "pending",
    retry_count: 0,
    last_attempt_at: null,
    completed_at: null,
    error_message: null,
    created_at: "2025-07-31T11:48:06.330Z",
  },
  {
    id: 30,
    chat_id: 1,
    sender_id: 1,
    message: "hello",
    scheduled_at: "2025-07-31T11:50:00.000Z",
    active: true,
    status: "pending",
    retry_count: 0,
    last_attempt_at: null,
    completed_at: null,
    error_message: null,
    created_at: "2025-07-31T11:48:06.330Z",
  },
  {
    id: 31,
    chat_id: 1,
    sender_id: 1,
    message: "hello",
    scheduled_at: "2025-07-31T11:50:00.000Z",
    active: true,
    status: "pending",
    retry_count: 0,
    last_attempt_at: null,
    completed_at: null,
    error_message: null,
    created_at: "2025-07-31T11:48:06.330Z",
  },
  {
    id: 32,
    chat_id: 1,
    sender_id: 1,
    message: "hello",
    scheduled_at: "2025-07-31T11:50:00.000Z",
    active: true,
    status: "pending",
    retry_count: 0,
    last_attempt_at: null,
    completed_at: null,
    error_message: null,
    created_at: "2025-07-31T11:48:06.330Z",
  },
  {
    id: 33,
    chat_id: 1,
    sender_id: 1,
    message: "hello",
    scheduled_at: "2025-07-31T11:50:00.000Z",
    active: true,
    status: "pending",
    retry_count: 0,
    last_attempt_at: null,
    completed_at: null,
    error_message: null,
    created_at: "2025-07-31T11:48:06.330Z",
  },
];

function RouteComponent() {
  const { chat_id } = Route.useParams();
  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-2">
      {data.map((el) => (
        <ScheduleCard data={el} key={el.id} />
      ))}
    </div>
  );
}
