import { createFileRoute, isNotFound, lazyRouteComponent } from "@tanstack/react-router";
import { PageNotFound } from "@/components/PageStates";
import { NOINDEX } from "@/lib/seo";
import { getShareMeta, giftShareTags } from "@/lib/share";

export const Route = createFileRoute("/g/$slug")({
  // Runs on the server for the first load, so link previews get real tags. Never note content.
  // A link to no gift at all answers 404 with the same friendly page.
  loader: async ({ params }) => ({
    share: await getShareMeta({ data: { slug: params.slug } }).catch((e: unknown) => {
      if (isNotFound(e)) throw e;
      return null;
    }),
  }),
  head: ({ loaderData }) => ({ meta: [NOINDEX, ...giftShareTags(loaderData?.share)] }),
  notFoundComponent: () => <PageNotFound message="This gift link doesn't lead anywhere. It may be old, or the gift may have been removed." showHeader={false} />,
  component: lazyRouteComponent(() => import("@/pages/GiftPage")),
});
