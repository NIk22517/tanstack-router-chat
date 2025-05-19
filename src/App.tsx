import { RouterProvider, createRouter } from "@tanstack/react-router";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocalStorage } from "./hooks";
import { useEffect, useState } from "react";
import { useSocket } from "./hooks/useSocket";

const queryClient = new QueryClient();

// Create a new router instance
export const router = createRouter({
  routeTree,
  context: {
    queryClient,
    userDetail: undefined,
    socket: undefined,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const App = () => {
  const { getItem } = useLocalStorage("auth");
  const user = getItem();

  const socket = useSocket({});

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider
        router={router}
        context={{
          userDetail: user,
          queryClient,
          socket: socket,
        }}
      />
    </QueryClientProvider>
  );
};

export default App;
