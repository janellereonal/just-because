import { createFileRoute, isNotFound, lazyRouteComponent } from "@tanstack/react-router";
import { PageNotFound } from "@/components/PageStates";
import { NOINDEX } from "@/lib/seo";
import { contributeShareTags, getShareMeta } from "@/lib/share";

export const Route = createFileRoute("/contribute/$slug")({
  // Runs on the server for the first load, so link previews get real tags.
  // A link to no gift at all answers 404 with the same friendly page.
  loader: async ({ params }) => ({
    share: await getShareMeta({ data: { slug: params.slug } }).catch((e: unknown) => {
      if (isNotFound(e)) throw e;
      return null;
    }),
  }),
  head: ({ loaderData }) => ({ meta: [NOINDEX, ...contributeShareTags(loaderData?.share)] }),
  notFoundComponent: () => <PageNotFound message="This gift link doesn't lead anywhere. Double-check the link you were sent." showHeader={false} />,
  component: lazyRouteComponent(() => import("@/pages/ContributePage")),
});
