import { createContext, useContext } from "react";

/**
 * True only in the organiser's editor: a gift with no recipient name yet shows the
 * sample "Ana" (faded and tagged). Friend pages, the real gift and demos never do.
 */
export const PlaceholderNameContext = createContext(false);
export const usePlaceholderName = () => useContext(PlaceholderNameContext);

/**
 * Placeholder text in the editor preview: faded, with a small "sample" tag, so
 * nobody mistakes "Ana" for the real name. Off the editor it renders as plain text.
 */
export function SampleText({ on, children, tag = true }: { on: boolean; children: React.ReactNode; tag?: boolean }) {
  if (!on) return <>{children}</>;
  return (
    <span className="jb-sample">
      <span className="jb-sample-text">{children}</span>
      {tag ? <SampleTag /> : null}
    </span>
  );
}

export function SampleTag() {
  return <span className="jb-sample-tag">sample</span>;
}
