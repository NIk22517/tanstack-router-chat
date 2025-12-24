import moment from "moment";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Label } from "../ui/label";
import type { ScheduleMessgaeType } from "@/routes/_auth/$chat_id.schedule";
import { DeleteScheduleMessage } from "./DeleteScheduleMessgae";
import { EditScheduleMessge } from "./EditScheduleMessage";

export const ScheduleCard = ({ data }: { data: ScheduleMessgaeType }) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Scheduled Message</CardTitle>
            <CardDescription
              className={`capitalize font-medium ${
                data.status === "pending"
                  ? "text-yellow-600"
                  : data.status === "processing"
                    ? "text-blue-600"
                    : "text-green-600"
              }`}
            >
              {data.status}
            </CardDescription>
          </div>
          {data.status !== "completed" && (
            <CardAction className="flex gap-1">
              <EditScheduleMessge
                data={{
                  message: data.message,
                  schedule_id: data.id,
                  scheduled_at: data.scheduled_at,
                  chat_id: data.chat_id,
                }}
              />
              <DeleteScheduleMessage
                schedule_id={data.id}
                chat_id={data.chat_id}
              />
            </CardAction>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        <div>
          <Label>Message</Label>
          <p className="text-muted-foreground">{data.message}</p>
        </div>

        <div className="flex justify-between gap-4">
          <div>
            <Label>Scheduled At</Label>
            <p>{moment(data.scheduled_at).format("MMM D, YYYY, h:mm A")}</p>
          </div>
          <div>
            <Label>Created At</Label>
            <p>{moment(data.created_at).format("MMM D, YYYY, h:mm A")}</p>
          </div>
        </div>

        {data.last_attempt_at && (
          <div>
            <Label>Last Attempt</Label>
            <p>{moment(data.last_attempt_at).format("MMM D, YYYY, h:mm A")}</p>
          </div>
        )}

        {data.completed_at && (
          <div>
            <Label>Completed At</Label>
            <p>{moment(data.completed_at).format("MMM D, YYYY, h:mm A")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
