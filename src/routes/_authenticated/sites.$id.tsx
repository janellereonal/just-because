import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/sites/$id")({
  head: () => ({
    meta: [
      { title: "Gift dashboard | Just Because" },
      { name: "description", content: "Edit, review contributions and publish your gift site." },
      { property: "og:title", content: "Gift dashboard | Just Because" },
      {
        property: "og:description",
        content: "Edit, review contributions and publish your gift site.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/EditorPage")),
});
