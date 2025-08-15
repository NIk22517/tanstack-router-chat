import { CallNotification } from "@/components/call/CallNotification";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context: { userDetail } }) => {
    const data = localStorage.getItem("auth");
    if (!userDetail && !data) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: AuthRoot,
});

function AuthRoot() {
  const { socket } = Route.useRouteContext();
  return (
    <>
      <Outlet />
      <CallNotification socket={socket} />
    </>
  );
}
