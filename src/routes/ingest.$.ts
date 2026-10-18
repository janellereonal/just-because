import { createFileRoute } from "@tanstack/react-router";
import { POSTHOG_HOSTS, POSTHOG_REGION, analyticsEnabled } from "@/config/analytics";

/**
 * Forwards PostHog's browser traffic through our own domain (/ingest/...), so our
 * security headers can stay "same site only" and ad blockers don't drop events.
 * Scripts (/ingest/static, /ingest/array) come from PostHog's asset host; events go
 * to its API host. Returns 404 when PostHog is off.
 */
const FORWARD_REQUEST_HEADERS = ["content-type", "content-encoding", "user-agent", "accept", "accept-language"];
const DROP_RESPONSE_HEADERS = ["content-encoding", "content-length", "transfer-encoding", "connection", "set-cookie"];

async function forward(request: Request, splat: string | undefined): Promise<Response> {
  if (!analyticsEnabled()) return new Response("Not found", { status: 404 });
  const path = (splat ?? "").replace(/^\/+/, "");
  if (!path || path.includes("..")) return new Response("Not found", { status: 404 });
  const hosts = POSTHOG_HOSTS[POSTHOG_REGION];
  const base = /^(static|array)\//.test(path) ? hosts.assets : hosts.api;
  const url = `${base}/${path}${new URL(request.url).search}`;

  const headers = new Headers();
  for (const h of FORWARD_REQUEST_HEADERS) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  // PostHog works out the visitor's country from this; it never reaches our database.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (ip) headers.set("x-forwarded-for", ip);

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer(),
      signal: AbortSignal.timeout(10_000),
    });
    const out = new Headers(upstream.headers);
    for (const h of DROP_RESPONSE_HEADERS) out.delete(h);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch {
    // Analytics must never break a page: answer quietly.
    return new Response(null, { status: 204 });
  }
}

export const Route = createFileRoute("/ingest/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => forward(request, params._splat),
      POST: ({ request, params }) => forward(request, params._splat),
    },
  },
});
