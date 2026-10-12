import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/g/$slug")({
  head: () => ({
    meta: [
      { title: "A gift for you — Just Because" },
      {
        name: "description",
        content: "A collaborative scrapbook of messages, photos and songs, made just because.",
      },
      { property: "og:title", content: "A gift for you — Just Because" },
      {
        property: "og:description",
        content: "A collaborative scrapbook of messages, photos and songs, made just because.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/GiftPage")),
});
