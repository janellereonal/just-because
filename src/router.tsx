import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { retryQuery } from "@/lib/utils";
import { RouteLoading } from "@/components/RouteLoading";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: retryQuery,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // A calm loader instead of a blank screen while a page's code downloads after a click.
    defaultPendingComponent: RouteLoading,
  });

  return router;
};

