import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { httpErrorAdapter } from "./lib/httpErrorAdapter";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * Server functions: friendly errors with real status codes. Validation errors
 * (zod) become 422 with the first message; HttpError keeps its status (401,
 * 403, 404, 429...); anything unexpected is logged and becomes a plain 500.
 * The client always gets an Error whose message is safe to show.
 */
const fnErrors = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Redirects and not-found signals pass straight through.
    if (error instanceof Response || (error && typeof error === "object" && ("isNotFound" in error || "isRedirect" in error))) throw error;
    const { setResponseStatus } = await import("@tanstack/react-start/server");
    const e = error as { name?: string; issues?: { message?: string }[]; status?: unknown; message?: string };
    // The validator throws an Error whose message is the zod issues as JSON.
    let issues = Array.isArray(e?.issues) ? e.issues : null;
    if (!issues && typeof e?.message === "string" && e.message.trimStart().startsWith("[")) {
      try {
        const parsed = JSON.parse(e.message) as unknown;
        if (Array.isArray(parsed) && parsed.every((x) => x && typeof x === "object" && "code" in x)) issues = parsed as { message?: string }[];
      } catch {
        /* not zod */
      }
    }
    if (issues) {
      setResponseStatus(422);
      const first = issues[0]?.message;
      const msg = first && !/^(Invalid|Expected|String must|Too (small|big)|Required|Number must)/i.test(first) ? first : "Some of that didn't look right. Check it and try again.";
      throw new Error(msg);
    }
    if (e && typeof e.status === "number" && e.status >= 400 && e.status < 600) {
      setResponseStatus(e.status);
      throw error;
    }
    if (e && typeof e === "object" && "statusCode" in e) throw error;
    console.error(error);
    setResponseStatus(500);
    throw new Error("Something went wrong on our end. Please try again in a moment.");
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
  functionMiddleware: [fnErrors],
  // Errors keep their status in the browser, so 403/404 answers aren't retried.
  serializationAdapters: [httpErrorAdapter],
}));
