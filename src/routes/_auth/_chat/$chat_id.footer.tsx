import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/_chat/$chat_id/footer")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_auth/_chat/$chat_id/_index"!</div>;
}
