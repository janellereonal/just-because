import { createFileRoute } from "@tanstack/react-router";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { authorizeUpload, saveDevUpload, uploadPathname } from "@/server/uploads";

const payloadSchema = z.object({
  kind: z.enum(["contribution", "calendar", "theme"]),
  targetId: z.string().uuid(),
});

/**
 * Photos and voice notes go straight from the browser to Vercel Blob. This
 * route only hands out a short-lived upload token after checking who may
 * upload what. Without BLOB_READ_WRITE_TOKEN (local dev) files are saved to
 * .dev-uploads/ instead.
 */
export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!process.env["BLOB_READ_WRITE_TOKEN"]) {
          if (process.env["NODE_ENV"] === "production" && process.env["VERCEL"]) {
            return Response.json({ error: "Uploads aren't configured." }, { status: 500 });
          }
          return saveDevUpload(request);
        }
        const body = (await request.json()) as HandleUploadBody;
        try {
          const result = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
              const payload = payloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
              const rules = await authorizeUpload(payload.kind, payload.targetId);
              if (!pathname.startsWith(uploadPathname(payload.kind, payload.targetId, "")))
                throw new Error("Bad upload path");
              return {
                allowedContentTypes: rules.contentTypes,
                maximumSizeInBytes: rules.maxBytes,
                addRandomSuffix: true,
              };
            },
            onUploadCompleted: async () => {},
          });
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Upload refused" },
            { status: 400 },
          );
        }
      },
    },
  },
});
