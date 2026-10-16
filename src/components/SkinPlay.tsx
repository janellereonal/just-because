import { useEffect, useRef, useState } from "react";
import { Mic, Sparkles, Wind } from "lucide-react";
import type { Theme3DHandle } from "@/components/Theme3D";
import type { ThemeKind } from "@/lib/themeKind";
import { KIND_BURST, burst, buzz, chime, reducedMotion } from "@/lib/play";
import type { IconSet } from "@/themes/_shared/iconSets";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { readableInk } from "@/lib/palettes";

/** What you catch, per occasion. */
const CATCH_WORD: Record<ThemeKind, [string, string]> = {
  valentine: ["heart", "hearts"],
  birthday: ["confetti", "confetti"],
  voyage: ["cloud", "clouds"],
  christmas: ["snowflake", "snowflakes"],
  pets: ["treat", "treats"],
  newyear: ["sparkle", "sparkles"],
  anniversary: ["petal", "petals"],
  wedding: ["petal", "petals"],
  bridal: ["bubble", "bubbles"],
  baby: ["star", "stars"],
  default: ["sparkle", "sparkles"],
};

const NOT_HERE =
  "button,a,input,textarea,select,iframe,audio,video,label,[role=button],[data-no-catch],figure,.sb-letter,.sb-polaroid,.rounded-3xl,.rounded-2xl,.sb-tile,.sk-pass";

function floatLabel(
  host: HTMLElement,
  clientX: number,
  clientY: number,
  text: string,
  color: string,
) {
  const r = host.getBoundingClientRect();
  const scale = host.offsetWidth ? r.width / host.offsetWidth : 1;
  const el = document.createElement("span");
  el.textContent = text;
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:absolute;left:${(clientX - r.left) / scale}px;top:${(clientY - r.top) / scale}px;z-index:81;pointer-events:none;font:600 13px/1 system-ui,sans-serif;color:${color};background:rgba(255,255,255,.85);padding:5px 9px;border-radius:999px;box-shadow:0 6px 16px -8px rgba(0,0,0,.35);white-space:nowrap`;
  host.appendChild(el);
  el.animate(
    [
      { opacity: 0, transform: "translate(-50%,-20%) scale(.7)" },
      { opacity: 1, transform: "translate(-50%,-120%) scale(1)", offset: 0.25 },
      { opacity: 0, transform: "translate(-50%,-260%) scale(1)" },
    ],
    { duration: 1300, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
  ).onfinish = () => el.remove();
}

/**
 * Makes an occasion skin playful: tap falling particles to catch them, tap the
 * string lights or bunting, and the background drifts with the pointer (or the
 * phone's tilt where that needs no permission). Decorative only.
 */
export function useSkinPlay(
  rootRef: React.RefObject<HTMLDivElement | null>,
  kind: ThemeKind,
  colors: string[],
  enabled = true,
  icons?: IconSet,
) {
  const caught = useRef(0);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;
    const reduce = reducedMotion();
    const [one, many] = CATCH_WORD[kind];

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest(NOT_HERE)) return;
      const nodes = root.querySelectorAll<HTMLElement>(".sk-p, .sk-lights span, .sk-bunting span");
      let best: HTMLElement | null = null;
      let bestD = 44;
      for (const n of nodes) {
        const r = n.getBoundingClientRect();
        if (!r.width) continue;
        const d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY);
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }
      if (!best) return;
      if (best.classList.contains("sk-p")) {
        if (best.dataset["caught"]) return;
        best.dataset["caught"] = "1";
        const pop = best.animate(
          [
            { transform: "scale(1)", opacity: 1 },
            { transform: "scale(2.4)", opacity: 0 },
          ],
          { duration: 380, easing: "ease-out", composite: "add", fill: "forwards" },
        );
        const node = best;
        window.setTimeout(() => {
          pop.cancel();
          delete node.dataset["caught"];
        }, 2600);
        caught.current += 1;
        const n = caught.current;
        if (icons) burstSet(root, e.clientX, e.clientY, icons, { colors, count: reduce ? 3 : 10, spread: 0.6 });
        else
          burst(root, e.clientX, e.clientY, {
            shape: KIND_BURST[kind],
            colors,
            count: reduce ? 3 : 10,
            spread: 0.6,
          });
        floatLabel(
          root,
          e.clientX,
          e.clientY,
          n === 1 ? `Caught a ${one}` : `${n} ${many} caught`,
          colors[0] ?? "#c2366b",
        );
        chime(n % 10 === 0 ? "sparkle" : "pop");
        buzz(8);
      } else {
        // String lights and bunting: a little flash and a swing.
        best.animate(
          [
            { transform: "rotate(0deg) scale(1)", filter: "brightness(1)" },
            { transform: "rotate(18deg) scale(1.35)", filter: "brightness(1.6)" },
            { transform: "rotate(-12deg) scale(1)", filter: "brightness(1.2)" },
            { transform: "rotate(0deg) scale(1)", filter: "brightness(1)" },
          ],
          { duration: 700, easing: "cubic-bezier(.3,1.5,.5,1)" },
        );
        if (icons) burstSet(root, e.clientX, e.clientY, icons, { colors, count: 6, spread: 0.4 });
        else burst(root, e.clientX, e.clientY, { shape: "sparkles", colors, count: 6, spread: 0.4 });
        chime("chime");
        buzz(6);
      }
    };

    // Parallax: background layers drift a little with the pointer or tilt.
    let raf = 0;
    let tx = 0;
    let ty = 0;
    const apply = () => {
      raf = 0;
      root.style.setProperty("--mx", tx.toFixed(3));
      root.style.setProperty("--my", ty.toFixed(3));
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = root.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / Math.min(r.height, window.innerHeight) - 0.5) * 2;
      queue();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 30));
      ty = Math.max(-1, Math.min(1, (e.beta - 40) / 30));
      queue();
    };
    root.addEventListener("pointerdown", onDown);
    if (!reduce) {
      root.addEventListener("pointermove", onMove, { passive: true });
      // iOS asks for permission first; we don't, so tilt works where it's free (Android).
      const DOE = window.DeviceOrientationEvent as unknown as
        { requestPermission?: unknown } | undefined;
      if (DOE && typeof DOE.requestPermission !== "function")
        window.addEventListener("deviceorientation", onTilt, { passive: true });
    }
    return () => {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
      cancelAnimationFrame(raf);
    };
  }, [rootRef, kind, enabled, colors.join(",")]);
}

/**
 * Birthdays: make a wish and blow out the candles, by tapping or (if they like)
 * by actually blowing into the mic. Nothing is recorded or sent anywhere.
 */
export function WishCandles({
  heroRef,
  hostRef,
  colors,
  accent,
  icons,
}: {
  heroRef: React.RefObject<Theme3DHandle | null>;
  hostRef: React.RefObject<HTMLDivElement | null>;
  colors: string[];
  accent: string;
  icons?: IconSet | undefined;
}) {
  const [step, setStep] = useState<"idle" | "wish" | "listening" | "done">("idle");
  const stopMic = useRef<(() => void) | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => () => stopMic.current?.(), []);

  // While an opening is on screen its cake sits where this button is, and the reveal
  // shows the gift through a hole in the middle. Wait until it has gone.
  const [behindOpening, setBehindOpening] = useState(false);
  useEffect(() => {
    const covered = () => !!document.querySelector(".jb-opening");
    setBehindOpening(covered());
    const done = () => window.setTimeout(() => setBehindOpening(covered()), 120);
    window.addEventListener("jb:opening-done", done);
    // A replayed opening covers it again.
    const mo = new MutationObserver(() => {
      if (covered()) setBehindOpening(true);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("jb:opening-done", done);
      mo.disconnect();
    };
  }, []);

  function blow() {
    stopMic.current?.();
    heroRef.current?.blowOut();
    setStep("done");
    const r = (btnRef.current ?? hostRef.current)?.getBoundingClientRect();
    if (r) {
      const x = r.left + r.width / 2;
      const y = r.top - 120;
      if (icons) {
        burstSet(hostRef.current, x, y, icons, { colors, count: 34, spread: 2 });
        window.setTimeout(() => burstSet(hostRef.current, x, y, icons, { colors, count: 16, spread: 1.4, up: true }), 200);
      } else {
        burst(hostRef.current, x, y, { shape: "confetti", colors, count: 40, spread: 2 });
        window.setTimeout(
          () =>
            burst(hostRef.current, x, y, {
              shape: "stars",
              colors,
              count: 18,
              spread: 1.4,
              up: true,
            }),
          200,
        );
      }
    }
    chime("tada");
    buzz([10, 50, 20]);
  }

  async function listen() {
    setStep("listening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor!();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let raf = 0;
      let loud = 0;
      const give = window.setTimeout(() => setStep((s) => (s === "listening" ? "wish" : s)), 15000);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / data.length);
        loud = rms > 0.18 ? loud + 1 : Math.max(0, loud - 1);
        if (loud > 8) {
          blow();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      stopMic.current = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(give);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        stopMic.current = null;
      };
    } catch {
      setStep("wish");
    }
  }

  const canMic = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const pill =
    "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-transform active:scale-95";

  return (
    <div
      className="mt-4 flex flex-col items-center gap-2 transition-opacity duration-500"
      style={{ opacity: behindOpening ? 0 : 1, visibility: behindOpening ? "hidden" : "visible" }}
      data-no-catch
    >
      {step === "idle" ? (
        <button
          ref={btnRef}
          type="button"
          onClick={() => {
            setStep("wish");
            chime("chime");
          }}
          className={pill}
          style={{ background: accent, color: readableInk(accent) }}
        >
          <Sparkles className="size-4" /> Make a wish
        </button>
      ) : step === "done" ? (
        <>
          <p className="sb-hand text-2xl" style={{ color: accent }}>
            Wish sent. It's a secret now.
          </p>
          <button
            type="button"
            onClick={() => {
              heroRef.current?.relight();
              setStep("idle");
            }}
            className="text-xs underline opacity-70"
          >
            Light the candles again
          </button>
        </>
      ) : (
        <>
          <p className="text-sm opacity-80">
            {step === "listening"
              ? "Blow into your phone…"
              : "Close your eyes, make a wish, then blow."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              ref={btnRef}
              type="button"
              onClick={blow}
              className={pill}
              style={{ background: accent, color: readableInk(accent) }}
            >
              <Wind className="size-4" /> Blow
            </button>
            {canMic && step !== "listening" ? (
              <button
                type="button"
                onClick={() => void listen()}
                className={`${pill} bg-white/70 ring-1 ring-black/10`}
              >
                <Mic className="size-4" /> Use the mic
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
