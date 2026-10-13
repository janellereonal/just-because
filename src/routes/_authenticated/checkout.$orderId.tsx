import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/checkout/$orderId")({
  validateSearch: z.object({ cancelled: z.coerce.number().optional() }),
  head: () => ({ meta: [{ title: "Your payment — Just Because" }] }),
  component: lazyRouteComponent(() => import("@/pages/CheckoutStatusPage")),
});
