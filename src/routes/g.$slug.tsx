import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { NOINDEX } from "@/lib/seo";
import { getShareMeta, giftShareTags } from "@/lib/share";

export const Route = createFileRoute("/g/$slug")({
  // Runs on the server for the first load, so link previews get real tags. Never note content.
  loader: async ({ params }) => ({ share: await getShareMeta({ data: { slug: params.slug } }).catch(() => null) }),
  head: ({ loaderData }) => ({ meta: [NOINDEX, ...giftShareTags(loaderData?.share)] }),
  component: lazyRouteComponent(() => import("@/pages/GiftPage")),
});
