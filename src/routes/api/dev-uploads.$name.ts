import { createFileRoute } from "@tanstack/react-router";
import { readDevUpload } from "@/server/uploads";

/** Serves files saved by the local-dev upload fallback. Never used on Vercel. */
export const Route = createFileRoute("/api/dev-uploads/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (process.env["VERCEL"]) return new Response("Not found", { status: 404 });
        const file = await readDevUpload(params.name);
        if (!file) return new Response("Not found", { status: 404 });
        return new Response(file.body, { headers: { "content-type": file.type, "cache-control": "public, max-age=31536000, immutable" } });
      },
    },
  },
});
