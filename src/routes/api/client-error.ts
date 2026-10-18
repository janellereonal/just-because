import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { scrub } from "@/lib/clientErrors";
import { clientIp, rateLimit } from "@/server/rateLimit";

const report = z.object({
  message: z.string().max(1600),
  stack: z.string().max(1600).optional(),
  where: z.string().max(40),
  path: z.string().max(300),
  ua: z.string().max(200).optional(),
});

/**
 * Where browser errors land (see src/lib/clientErrors.ts). They're written to
 * the server log as one line each, scrubbed again in case an old client sent
 * something it shouldn't. Always answers 204 so it never shows up as an error.
 */
export const Route = createFileRoute("/api/client-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          rateLimit(`clienterr:${clientIp()}`, 20, 10 * 60_000, "slow down");
          const text = await request.text();
          if (text.length > 6000) return new Response(null, { status: 204 });
          const r = report.parse(JSON.parse(text));
          console.error(
            "[client-error]",
            JSON.stringify({ message: scrub(r.message), where: r.where, path: scrub(r.path), stack: scrub(r.stack ?? ""), ua: r.ua }),
          );
        } catch {
          /* bad or rate-limited report: drop it */
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
