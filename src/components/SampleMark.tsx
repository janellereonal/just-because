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
