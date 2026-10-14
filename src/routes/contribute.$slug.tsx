import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/contribute/$slug")({
  head: () => ({
    meta: [
      { title: "Add to the gift | Just Because" },
      {
        name: "description",
        content: "Add a message, a photo or a song to a collaborative gift site. No account needed.",
      },
      { property: "og:title", content: "Add to the gift | Just Because" },
      {
        property: "og:description",
        content: "Add a message, a photo or a song to a collaborative gift site.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/ContributePage")),
});
