import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { NOINDEX } from "@/lib/seo";
import { contributeShareTags, getShareMeta } from "@/lib/share";

export const Route = createFileRoute("/contribute/$slug")({
  // Runs on the server for the first load, so link previews get real tags.
  loader: async ({ params }) => ({ share: await getShareMeta({ data: { slug: params.slug } }).catch(() => null) }),
  head: ({ loaderData }) => ({ meta: [NOINDEX, ...contributeShareTags(loaderData?.share)] }),
  component: lazyRouteComponent(() => import("@/pages/ContributePage")),
});
