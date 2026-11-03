import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UPLOAD_CACHE_SECONDS, authorizeUpload, saveDevUpload, saveR2Upload, uploadPathname } from "@/server/uploads";

const payloadSchema = z.object({
  kind: z.enum(["contribution", "calendar", "theme", "intro"]),
  targetId: z.string().uuid(),
  media: z.enum(["photo", "voice", "video"]).optional(),
});

/**
 * Vercel uses short-lived Blob client tokens. Self-hosted deployments receive
 * uploads here, enforce actual file limits, then store the files in R2.
 */
export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // The server-selected provider must win even if a legacy Vercel Blob
        // token is still present in the environment during a migration.
        if (process.env["MEDIA_STORAGE_PROVIDER"] === "r2") return saveR2Upload(request);
        if (!process.env["BLOB_READ_WRITE_TOKEN"]) {
          if (process.env["NODE_ENV"] === "production") {
            return Response.json({ error: "Uploads aren't configured." }, { status: 500 });
          }
          return saveDevUpload(request);
        }
        const body = (await request.json()) as import("@vercel/blob/client").HandleUploadBody;
        try {
          const { handleUpload } = await import("@vercel/blob/client");
          const result = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
              const payload = payloadSchema.parse(JSON.parse(clientPayload ?? "{}"));
              const rules = await authorizeUpload(payload.kind, payload.targetId, payload.media ?? null);
              if (!pathname.startsWith(uploadPathname(payload.kind, payload.targetId, "")))
                throw new Error("Bad upload path");
              return {
                allowedContentTypes: rules.contentTypes,
                maximumSizeInBytes: rules.maxBytes,
                addRandomSuffix: true,
                cacheControlMaxAge: UPLOAD_CACHE_SECONDS,
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
