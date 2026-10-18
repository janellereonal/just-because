/**
 * Security and indexing headers, added to every response the server makes
 * (src/server.ts). Static files on Vercel get the same simple headers from
 * vercel.json. If you add an outside host (an embed, a font, an image CDN),
 * add it to CSP below and test the page.
 */
const BLOB = "https://*.public.blob.vercel-storage.com";
export const CSP = [
  "default-src 'self'",
  // TanStack Start puts the hydration data in inline scripts.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com",
  `img-src 'self' data: blob: ${BLOB} https://lh3.googleusercontent.com`,
  `media-src 'self' data: blob: ${BLOB}`,
  // Uploads go straight to Vercel Blob from the browser.
  `connect-src 'self' ${BLOB} https://blob.vercel-storage.com https://vercel.com https://fonts.googleapis.com https://fonts.gstatic.com`,
  "frame-src https://open.spotify.com https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export const BASE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Mic for voice notes and the birthday candles, camera for video notes and photos.
  "Permissions-Policy": "microphone=(self), camera=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
};

/** Private pages: never in search results. */
export const PRIVATE_PATHS = [/^\/g\//, /^\/contribute\//, /^\/sites\//, /^\/dashboard/, /^\/dev\//, /^\/auth/, /^\/admin/, /^\/checkout\//, /^\/create/, /^\/reset-password/, /^\/account/];
export const isPrivatePath = (path: string) => PRIVATE_PATHS.some((r) => r.test(path));

export function withSecurityHeaders(request: Request, response: Response): Response {
  const path = new URL(request.url).pathname;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(BASE_HEADERS)) if (!headers.has(k)) headers.set(k, v);
  const type = headers.get("content-type") ?? "";
  if (type.includes("text/html")) headers.set("Content-Security-Policy", CSP);
  if (isPrivatePath(path)) headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
