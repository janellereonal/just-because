import { useCallback, useEffect, useRef, useState } from "react";
import { Bo3D } from "@/components/Bo3D";
import type { BoScene } from "@/lib/bo3d/scene";

const SEEN_KEY = "jb-intro-seen";
const WORD = "Just Because";

/**
 * Runs before paint (inline in the HTML), so a returning visitor in the same
 * session never sees the intro flash. Sets html[data-intro="skip"].
 */
const PRE_PAINT = `try{if(sessionStorage.getItem("${SEEN_KEY}")||location.hash)document.documentElement.dataset.intro="skip";else document.documentElement.dataset.intro="play"}catch(e){document.documentElement.dataset.intro="skip"}`;

type Phase = "in" | "open" | "out" | "done";

let decision: "play" | "skip" | undefined;
let finished = false;

/**
 * A short hello from Bo the first time someone lands in a session: he waves,
 * the wordmark types in, his lid pops and notes fly out, then the box opens
 * onto the site. About 3s, skippable any time. Transform/opacity only.
 */
export function LandingIntro() {
  const [phase, setPhase] = useState<Phase>("in");
  const [active, setActive] = useState(true);
  const [live, setLive] = useState(false);
  const sceneRef = useRef<BoScene | null>(null);
  const timers = useRef<number[]>([]);
  const reduceRef = useRef(false);

  const finish = useCallback(() => {
    finished = true;
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* private mode */
    }
    setPhase("out");
    timers.current.push(
      window.setTimeout(
        () => {
          setPhase("done");
          setActive(false);
          document.documentElement.dataset["intro"] = "skip";
          window.dispatchEvent(new Event("jb:intro-done"));
        },
        reduceRef.current ? 260 : 900,
      ),
    );
  }, []);

  useEffect(() => {
    // Decided once per page load: remounts (StrictMode, hydration retries) must not cut it short.
    decision ??= document.documentElement.dataset["intro"] === "play" ? "play" : "skip";
    if (decision !== "play" || finished) {
      setActive(false);
      setPhase("done");
      return;
    }
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.dataset["intro"] = "play";
    document.documentElement.style.overflow = "hidden";
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    if (reduceRef.current) {
      at(1400, finish);
    } else {
      // Anchored to page load: on a slow phone that hydrates late, it doesn't drag on.
      const open = Math.max(250, 1500 - performance.now());
      at(open, () => {
        setPhase("open");
        sceneRef.current?.setFace("happy", 1400);
        sceneRef.current?.setPose({ lid: 0.42, cheer: 0.9 });
      });
      at(open + 750, () => sceneRef.current?.setPose({ lid: 0.12, cheer: 0 }));
      at(open + 1400, finish);
    }
    const skip = (e: Event) => {
      if (
        e instanceof KeyboardEvent &&
        !["Escape", "Enter", " ", "ArrowDown", "PageDown"].includes(e.key)
      )
        return;
      finish();
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });
    return () => {
      for (const t of timers.current) window.clearTimeout(t);
      // Leaving mid-intro: never strand the page hidden or unscrollable.
      document.documentElement.dataset["intro"] = "skip";
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
    };
  }, [finish]);

  useEffect(() => {
    if (phase === "out" || phase === "done") document.documentElement.style.overflow = "";
  }, [phase]);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PRE_PAINT }} />
      {active ? (
        <div
          className="lp-intro"
          data-phase={phase}
          onClick={() => phase !== "out" && finish()}
          aria-hidden="true"
        >
          <div className="lp-intro-half lp-intro-top" />
          <div className="lp-intro-half lp-intro-bottom" />
          <div className="lp-intro-stage">
            <div className="lp-intro-glow" />
            <div className="lp-intro-bo">
              {/* The still shows at once; the live 3D Bo takes over when it's ready. */}
              <img
                src="/bo/hello.webp"
                alt=""
                className={`absolute inset-0 size-full object-contain transition-opacity duration-500 ${live ? "opacity-0" : "opacity-100"}`}
              />
              <Bo3D
                className="absolute inset-0"
                mood="wave"
                label={null}
                placeholder={false}
                onScene={(s) => {
                  sceneRef.current = s;
                  if (s) setLive(true);
                }}
              />
            </div>
            <div className="lp-intro-notes">
              {["#FFE8B0", "#D5F0E3", "#D9E8FB", "#E6DCF7", "#FFDCCB", "#FBD3DC", "#FFFFFF"].map(
                (c, i) => (
                  <i
                    key={c}
                    style={
                      {
                        background: c,
                        "--a": `${-150 + i * 50}deg`,
                        "--d": `${170 + (i % 3) * 50}px`,
                        animationDelay: `${i * 40}ms`,
                      } as React.CSSProperties
                    }
                  />
                ),
              )}
            </div>
            <p className="lp-intro-word">
              {[...WORD].map((ch, i) => (
                <span
                  key={i}
                  style={{ animationDelay: `${380 + i * 45}ms` }}
                  className={i >= 5 ? "text-accent" : undefined}
                >
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </p>
            <p className="lp-intro-tag">Group gifts, made together</p>
          </div>
          <button
            type="button"
            className="lp-intro-skip"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            tabIndex={-1}
          >
            Skip
          </button>
        </div>
      ) : null}
    </>
  );
}
