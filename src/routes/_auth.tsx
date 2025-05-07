import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context: { userDetail } }) => {
    console.log(userDetail, "userDetail");
    const data = localStorage.getItem("auth");
    if (!userDetail && !data) {
      console.log("call happen");

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
