import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { QueryClient } from "@tanstack/react-query";
import type { AuthType } from "@/hooks/useLocalStorage";
import type { UseSocketReturn } from "@/hooks/useSocket";

interface RouteContextProps {
  queryClient: QueryClient;
  userDetail: AuthType | null | undefined;
  socket: UseSocketReturn | undefined;
}

export const Route = createRootRouteWithContext<RouteContextProps>()({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});
