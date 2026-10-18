import { galleryLink } from "@/lib/gallery";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { installClientErrorReporting, reportClientError } from "@/lib/clientErrors";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { marketingShareTags } from "@/lib/share";

function NotFoundComponent() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4 text-ink">
      <div className="max-w-md text-center">
        <img src="/bo/surprise.webp" alt="" width={150} height={150} className="mx-auto" />
        <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-accent uppercase">404</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Nothing in this box</h1>
        <p className="mt-3 text-ink/65">
          This page doesn't exist. If someone sent you a gift link, check that it was copied in full.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className="squish inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-cream">
            Go home
          </Link>
          <Link to={galleryLink().to} className="squish inline-flex min-h-12 items-center rounded-full bg-pink px-6 text-sm font-semibold">
            {galleryLink().see}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  useEffect(() => reportClientError(error, "route"), [error]);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Just Because" },
      ...marketingShareTags("Just Because | One gift from everyone who loves them", "Make one gift together. Friends add letters, photos, songs and voice notes from their phones, and they open it all at once."),
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Lato:wght@400;700&family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600&family=Poppins:wght@500;600&family=Karla:wght@400;600&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Playfair+Display:ital,wght@1,700&display=swap",
      },
      { rel: "icon", href: "/favicon.png?v=bo-3d", type: "image/png", sizes: "64x64" },
      { rel: "shortcut icon", href: "/favicon.ico?v=bo-3d", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=bo-3d" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => installClientErrorReporting(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
