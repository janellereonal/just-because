import { LOADING_COPY } from "@/copy/strings";

/** Three soft dots that say "still working". Color follows the text. Decorative: say what's loading in words too. */
export function LoadingDots({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`jb-dots ${className}`}>
      <i />
      <i />
      <i />
    </span>
  );
}

/**
 * The router's default while a page's code loads after a click (it used to be a blank
 * screen). No Bo, so it's fine on gift pages too, and it fades in late so fast loads never see it.
 * Kept tiny and in its own file because the router loads it on every page.
 */
export function RouteLoading() {
  return (
    <div className="jb-route-loading grid min-h-[70vh] place-items-center px-6 text-center text-accent" role="status">
      <LoadingDots />
      <span className="sr-only">{LOADING_COPY.page}</span>
    </div>
  );
}
