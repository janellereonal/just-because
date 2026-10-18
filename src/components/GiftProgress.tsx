/**
 * Where am I in this gift? A thin bar along the top of the screen fills as you read,
 * and on wider screens a column of small dots on the right shows each section (hover
 * for its name, click to jump). Only on the real gift page (/g/ and the examples),
 * never inside previews. Stays out of the way at the top of the page.
 */
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

type Mark = { id: string; label: string; el: HTMLElement };

const ON_PAGES = /^\/(g|example)\//;

export function GiftProgress({
  rootRef,
  accent,
  ink,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  accent: string;
  ink: string;
}) {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);
  const [p, setP] = useState(0);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !ON_PAGES.test(window.location.pathname)) return;
    setOn(true);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!on || !root) return;
    const read = () => {
      raf.current = 0;
      const vh = window.innerHeight;
      const rect = root.getBoundingClientRect();
      const span = Math.max(1, root.offsetHeight - vh);
      setP(Math.min(1, Math.max(0, -rect.top / span)));
      const found: Mark[] = [];
      root.querySelectorAll<HTMLElement>("section[data-section]").forEach((el) => {
        const label = el.querySelector("h2")?.textContent?.trim();
        if (label && el.offsetHeight > 0) found.push({ id: el.dataset["section"] ?? label, label, el });
      });
      setMarks((prev) => (prev.length === found.length && prev.every((m, i) => m.el === found[i]?.el && m.label === found[i]?.label) ? prev : found));
      let current: string | null = null;
      for (const m of found) if (m.el.getBoundingClientRect().top <= vh * 0.4) current = m.id;
      setActive(current);
    };
    const onScroll = () => {
      if (!raf.current) raf.current = requestAnimationFrame(read);
    };
    read();
    // Sections can arrive after the first paint (notes load, the intro closes).
    const late = window.setTimeout(read, 1200);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(late);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [on, rootRef]);

  if (!on) return null;
  const shown = p > 0.015;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[3px] transition-opacity duration-300"
        style={{ opacity: shown ? 1 : 0 }}
        aria-hidden="true"
      >
        <div
          className="h-full origin-left rounded-r-full"
          style={{ background: accent, transform: `scaleX(${p})`, transition: reduce ? undefined : "transform 120ms linear" }}
        />
      </div>

      {marks.length >= 4 ? (
        <nav
          aria-label="Sections in this gift"
          className="fixed top-1/2 right-4 z-[55] hidden -translate-y-1/2 flex-col items-end gap-2.5 transition-opacity duration-300 lg:flex"
          style={{ opacity: shown ? 1 : 0, pointerEvents: shown ? "auto" : "none" }}
        >
          {marks.map((m) => {
            const isActive = m.id === active;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => m.el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })}
                aria-label={m.label}
                aria-current={isActive ? "true" : undefined}
                className="group flex items-center gap-2 outline-none"
              >
                <span
                  className="rounded-full px-2 py-0.5 text-xs whitespace-nowrap opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{ background: "var(--gift-surface, #fff)", color: ink }}
                >
                  {m.label}
                </span>
                <span
                  className="block rounded-full transition-all duration-200 group-focus-visible:ring-2"
                  style={{
                    width: isActive ? 10 : 6,
                    height: isActive ? 10 : 6,
                    background: isActive ? accent : `${ink}40`,
                    ["--tw-ring-color" as string]: `${accent}66`,
                  }}
                />
              </button>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
