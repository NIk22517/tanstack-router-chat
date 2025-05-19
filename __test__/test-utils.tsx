import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import type { JSX } from "react";

async function createTestRouter(component: () => JSX.Element) {
  const rootRoute = createRootRoute({
    component: Outlet,
  });

  const componentRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([componentRoute]),
    history: createMemoryHistory(),
  });

  return router;
}

export async function renderWithContext(component: () => JSX.Element) {
  const router = await createTestRouter(component);
  return render(<RouterProvider router={router} />);
}
