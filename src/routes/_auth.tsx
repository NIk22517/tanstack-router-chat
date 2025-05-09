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
  return <Outlet />;
}
