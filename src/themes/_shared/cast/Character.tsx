import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { reducedMotion } from "@/lib/play";
import { ACCESSORIES, CLAY_IMAGE, characterById, type CharacterSpec } from "@/themes/_shared/cast/library";
import type { AccessoryId, CharacterHandle, CharacterSetting } from "@/themes/_shared/cast/types";
import { personFace, personKey, presetById, type PersonConfig } from "@/themes/_shared/cast/person";

type Mood = "idle" | "anticipate" | "celebrate" | "sad";

/** Shared motion for both the drawn characters and uploaded stickers. */
function useBody(follow: boolean, rootRef: React.RefObject<HTMLDivElement | null>) {
  const y = useMotionValue(0);
  const sx = useMotionValue(1);
  const sy = useMotionValue(1);
  const rot = useMotionValue(0);
  const lookX = useMotionValue(0);
  const lookY = useMotionValue(0);
  const lx = useSpring(lookX, { stiffness: 160, damping: 18 });
  const ly = useSpring(lookY, { stiffness: 160, damping: 18 });
  const [mood, setMood] = useState<Mood>("idle");
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = reducedMotion();
  }, []);

  // Follow the finger or cursor anywhere on the page.
  useEffect(() => {
    if (!follow) return;
    const onMove = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      lookX.set(Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width * 1.6))));
      lookY.set(Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 1.6))));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [follow, lookX, lookY, rootRef]);

  const squash = (x: number, yy: number, back = true) => {
    void animate(sx, x, { type: "spring", stiffness: 600, damping: 14 });
    void animate(sy, yy, { type: "spring", stiffness: 600, damping: 14 }).then(() => {
      if (!back) return;
      void animate(sx, 1, { type: "spring", stiffness: 300, damping: 9 });
      void animate(sy, 1, { type: "spring", stiffness: 300, damping: 9 });
    });
  };
  const hop = async (height: number, spins = 0) => {
    if (reduce.current) return;
    squash(1.16, 0.84, false);
    await new Promise((r) => setTimeout(r, 90));
    void animate(sx, 0.9, { type: "spring", stiffness: 500, damping: 18 });
    void animate(sy, 1.14, { type: "spring", stiffness: 500, damping: 18 });
    if (spins) void animate(rot, rot.get() + 360 * spins, { type: "spring", stiffness: 120, damping: 14 });
    await animate(y, -height, { type: "spring", stiffness: 380, damping: 17 });
    void animate(sx, 1, { type: "spring", stiffness: 300, damping: 12 });
    void animate(sy, 1, { type: "spring", stiffness: 300, damping: 12 });
    await animate(y, 0, { type: "spring", stiffness: 520, damping: 22 });
    squash(1.12, 0.88);
  };

  const handle: CharacterHandle = {
    tap: () => {
      setMood("idle");
      squash(1.18, 0.82);
      void hop(10);
    },
    anticipate: () => {
      setMood("anticipate");
      squash(1.1, 0.88, false);
      void animate(y, 4, { type: "spring", stiffness: 300, damping: 20 });
    },
    celebrate: () => {
      setMood("celebrate");
      void (async () => {
        await hop(34, 1);
        await hop(18);
        await hop(10);
        setMood("idle");
      })();
    },
    sad: () => {
      setMood("sad");
      void animate(y, 5, { type: "spring", stiffness: 160, damping: 16 });
      void animate(sy, 0.95, { type: "spring", stiffness: 160, damping: 16 });
    },
    look: (x, yy) => {
      lookX.set(x);
      lookY.set(yy);
    },
    idle: () => {
      setMood("idle");
      void animate(y, 0, { type: "spring", stiffness: 200, damping: 18 });
      void animate(sx, 1, { type: "spring", stiffness: 200, damping: 18 });
      void animate(sy, 1, { type: "spring", stiffness: 200, damping: 18 });
    },
  };
  return { y, sx, sy, rot, lx, ly, mood, handle };
}

/** Blinks every few seconds (slowly when sleepy). */
function useBlink(sleepy: boolean) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (reducedMotion()) return;
    let t = 0;
    const loop = () => {
      t = window.setTimeout(
        () => {
          setClosed(true);
          window.setTimeout(() => {
            setClosed(false);
            loop();
          }, sleepy ? 420 : 130);
        },
        (sleepy ? 1600 : 2400) + Math.random() * 2600,
      );
    };
    loop();
    return () => window.clearTimeout(t);
  }, [sleepy]);
  return closed;
}

export type CharacterProps = {
  setting: CharacterSetting;
  /** The theme's costume. Hidden when the creator turned costumes off. */
  accessory?: AccessoryId | null;
  /** Rendered width in px. Height matches. */
  size?: number;
  /** Follow the pointer by itself. */
  follow?: boolean;
  /** Breathing idle loop. Off for still frames. */
  live?: boolean;
  blush?: boolean;
  sleepy?: boolean;
  /** Show the creator's name tag under the character. */
  showName?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onTap?: () => void;
  /** Accessible label when tappable. */
  label?: string;
};

/**
 * A character from the cast. Use a ref for the contract (tap, anticipate,
 * celebrate, sad, look, idle). Library characters are drawn in SVG; uploads
 * become die-cut stickers with the same motion.
 */
export const Character = forwardRef<CharacterHandle, CharacterProps>(function Character(
  { setting, accessory = null, size = 140, follow = true, live = true, blush = false, sleepy = false, showName = true, className = "", style, onTap, label },
  ref,
) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const body = useBody(follow && live, rootRef);
  useImperativeHandle(ref, () => body.handle);
  const closed = useBlink(sleepy);
  const uid = useId().replace(/:/g, "");
  const wearing = setting.accessory === false ? null : accessory;
  const name = setting.name_tag;

  // A tiny breathing loop.
  const breathe = useMotionValue(1);
  useEffect(() => {
    if (!live || reducedMotion()) return;
    const a = animate(breathe, [1, 1.025, 1], { duration: 3.2, repeat: Infinity, ease: "easeInOut" });
    return () => a.stop();
  }, [live, breathe]);
  const syAll = useTransform([body.sy, breathe], ([a, b]) => (a as number) * (b as number));

  const tilt = useTransform(body.lx, (v) => v * 6);

  const person = setting.type === "person" ? setting : null;
  const personSrc = usePersonImage(person, size);
  const content =
    setting.type === "none" ? null : setting.type === "upload" ? (
      <Sticker url={setting.upload_url} accessory={wearing} />
    ) : setting.type === "person" ? (
      <Drawn
        spec={personSpec(setting.person)}
        image={personSrc}
        colors={undefined}
        accessory={personFace(setting.person).ownHat && wearing && ACCESSORIES[wearing].slot === "head" ? null : wearing}
        lx={body.lx}
        ly={body.ly}
        closed={closed || body.mood === "sad"}
        sleepy={sleepy}
        mood={body.mood}
        blush={blush}
        uid={uid}
        size={size}
      />
    ) : (
      <Drawn
        spec={characterById(setting.id)}
        colors={setting.colors}
        accessory={wearing}
        lx={body.lx}
        ly={body.ly}
        closed={closed || body.mood === "sad"}
        sleepy={sleepy}
        mood={body.mood}
        blush={blush}
        uid={uid}
        size={size}
      />
    );

  if (setting.type === "none") return <div ref={rootRef} aria-hidden="true" style={{ width: 0, height: 0 }} />;

  return (
    <div
      ref={rootRef}
      className={`relative select-none ${onTap ? "cursor-pointer" : ""} ${className}`}
      style={{ width: size, height: size + (showName && name ? 22 : 0), ...style }}
      role={onTap ? "button" : undefined}
      tabIndex={onTap ? 0 : undefined}
      aria-label={onTap ? (label ?? "Tap the character") : undefined}
      aria-hidden={onTap ? undefined : "true"}
      onClick={(e) => {
        if (!onTap) return;
        e.stopPropagation();
        body.handle.tap();
        onTap();
      }}
      onKeyDown={(e) => {
        if (!onTap || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        e.stopPropagation();
        body.handle.tap();
        onTap();
      }}
    >
      <motion.div
        style={{
          width: size,
          height: size,
          y: body.y,
          scaleX: body.sx,
          scaleY: syAll,
          rotate: setting.type === "upload" ? tilt : body.rot,
          transformOrigin: "50% 92%",
        }}
      >
        {content}
      </motion.div>
      {showName && name ? (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-[#2B2522] shadow-[0_4px_10px_-6px_rgba(0,0,0,.4)]">
          {name}
        </span>
      ) : null}
    </div>
  );
});

function Drawn({
  spec,
  image,
  colors,
  accessory,
  lx,
  ly,
  closed,
  sleepy,
  mood,
  blush,
  uid,
  size,
}: {
  spec: CharacterSpec;
  /** A still to use instead of public/clay/<id>.webp (people from the builder). Null while it renders. */
  image?: string | null;
  colors: { primary?: string; secondary?: string; skin?: string } | undefined;
  accessory: AccessoryId | null;
  lx: MotionValue<number>;
  ly: MotionValue<number>;
  closed: boolean;
  sleepy: boolean;
  mood: Mood;
  blush: boolean;
  uid: string;
  size: number;
}) {
  const c = {
    primary: colors?.primary ?? spec.colors.primary,
    secondary: colors?.secondary ?? spec.colors.secondary,
    skin: colors?.skin ?? spec.colors.skin,
  };
  // The clay still is rendered in the character's own colors; recolored ones stay drawn.
  const own = !spec.body || (["primary", "secondary", "skin"] as const).every((k) => c[k].toLowerCase() === spec.colors[k].toLowerCase());
  const clay = own ? spec.clay : undefined;
  const f = clay ?? spec;
  const px = useTransform(lx, (v) => v * f.eyes.size * 0.55);
  const py = useTransform(ly, (v) => v * f.eyes.size * 0.45);
  const face = useTransform(lx, (v) => v * 2.2);
  const faceY = useTransform(ly, (v) => v * 1.6);
  const acc = accessory ? ACCESSORIES[accessory] : null;
  const anchor = acc?.slot === "neck" ? f.neck : f.head;
  const s = anchor.w / 80;
  const expr = clay?.expression ?? "smile";
  const happy = mood === "celebrate" || (mood === "idle" && expr === "joy");
  const grin = mood === "idle" && (expr === "grin" || expr === "joy");
  const wow = mood === "idle" && expr === "wow";
  const calm = mood === "idle" && expr === "calm";
  const lid = sleepy ? 0.45 : 1;
  const ink = clay?.ink ?? "#2B2522";
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" overflow="visible" aria-hidden="true">
      <defs>
        <radialGradient id="jb-sheen" cx="35%" cy="25%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".12" />
        </radialGradient>
      </defs>
      {acc && acc.slot === "head" && accessory === "veil" ? (
        <g transform={`translate(${anchor.x} ${anchor.y}) scale(${s})`}>{acc.draw()}</g>
      ) : null}
      {image !== undefined ? (
        image ? <image href={image} x={CLAY_IMAGE.x} y={CLAY_IMAGE.y} width={CLAY_IMAGE.size} height={CLAY_IMAGE.size} preserveAspectRatio="xMidYMid meet" /> : null
      ) : clay ? (
        <image
          href={`/clay/${spec.id}${size > 132 ? "" : "@256"}.webp`}
          x={CLAY_IMAGE.x}
          y={CLAY_IMAGE.y}
          width={CLAY_IMAGE.size}
          height={CLAY_IMAGE.size}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        spec.body?.(c)
      )}
      <motion.g style={{ x: face, y: faceY }}>
        {f.cheeks && !(image !== undefined && !image) ? (
          <>
            {[f.cheeks.l, f.cheeks.r].map(([cx, cy], i) => (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx={7 * (f.blush?.size ?? 1)}
                ry={4.5 * (f.blush?.size ?? 1)}
                fill={f.blush?.color ?? "#F27A93"}
                opacity={blush ? 0.8 : f.blush?.color ? 0.65 : clay ? 0.4 : 0.32}
              />
            ))}
          </>
        ) : null}
        {(clay?.hideEyes || (image !== undefined && !image) ? [] : [f.eyes.l, f.eyes.r]).map(([ex, ey], i) =>
          happy || (i === 1 && mood === "idle" && expr === "wink") ? (
            <path key={i} d={`M${ex - 4.5} ${ey + 1}q4.5-6 9 0`} stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          ) : calm ? (
            <path key={i} d={`M${ex - 4.5} ${ey - 1}q4.5 5 9 0`} stroke={ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          ) : (
            <g key={i}>
              <motion.ellipse
                cx={ex}
                cy={ey}
                rx={f.eyes.size * (wow ? 1.15 : 1)}
                ry={f.eyes.size * (wow ? 1.3 : 1.12)}
                fill={ink}
                // Squash around the eye's own centre. (Motion measures SVG origins from the
                // shape's own box, so an origin in viewBox px put the pivot far below the
                // face, and every blink slid the eyes down to the floor.)
                style={{ x: px, y: py, originX: 0.5, originY: 0.5, transformBox: "fill-box" }}
                animate={{ scaleY: closed ? 0.08 : lid }}
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
              />
              {!closed ? (
                <motion.circle cx={ex + f.eyes.size * 0.38} cy={ey - f.eyes.size * 0.5} r={f.eyes.size * 0.32} fill="#fff" style={{ x: px, y: py }} />
              ) : null}
            </g>
          ),
        )}
        {f.mouth && !(image !== undefined && !image) ? (
          <path
            d={
              wow
                ? `M${f.mouth[0] - 2.6} ${f.mouth[1] + 0.5}a2.6 3.2 0 1 0 5.2 0a2.6 3.2 0 1 0-5.2 0`
                : grin && !happy
                  ? `M${f.mouth[0] - 6} ${f.mouth[1] - 2}q6 9 12 0z`
                  : mood === "sad"
                ? `M${f.mouth[0] - 5} ${f.mouth[1] + 2}q5-5 10 0`
                : mood === "anticipate"
                  ? `M${f.mouth[0] - 3} ${f.mouth[1]}a3 3 0 1 0 6 0a3 3 0 1 0-6 0`
                  : happy
                    ? `M${f.mouth[0] - 7} ${f.mouth[1] - 2}q7 10 14 0z`
                    : `M${f.mouth[0] - 5} ${f.mouth[1] - 1}q5 5 10 0`
            }
            stroke={ink}
            strokeWidth="2.4"
            fill={happy || grin ? "#E8576E" : mood === "anticipate" || wow ? ink : "none"}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </motion.g>
      {acc && accessory !== "veil" ? (
        <g transform={`translate(${anchor.x} ${anchor.y}) scale(${s})`}>{acc.draw()}</g>
      ) : null}
    </svg>
  );
}

/** An uploaded photo as a die-cut sticker: white outline, soft shadow, costume on top. */
function Sticker({ url, accessory }: { url: string; accessory: AccessoryId | null }) {
  const acc = accessory ? ACCESSORIES[accessory] : null;
  return (
    <div className="relative size-full">
      <img
        src={url}
        alt=""
        draggable={false}
        className="size-full object-contain"
        style={{
          filter:
            "drop-shadow(3px 0 0 #fff) drop-shadow(-3px 0 0 #fff) drop-shadow(0 3px 0 #fff) drop-shadow(0 -3px 0 #fff) drop-shadow(0 10px 12px rgba(0,0,0,.22))",
        }}
      />
      {acc ? (
        <svg viewBox="0 0 120 120" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
          <g transform={`translate(60 ${acc.slot === "neck" ? 98 : 14}) scale(.8)`}>{acc.draw()}</g>
        </svg>
      ) : null}
    </div>
  );
}

/* ---------- people from the builder ---------- */

const specCache = new Map<string, CharacterSpec>();
/** A person as a cast spec: their face map, no drawn body. */
function personSpec(p: PersonConfig): CharacterSpec {
  const key = personKey(p);
  let spec = specCache.get(key);
  if (!spec) {
    const f = personFace(p);
    spec = { id: `person-${key}`, name: "Person", category: "Little people", colors: { primary: "#FFFFFF", secondary: "#FFFFFF", skin: "#FFFFFF" }, ...f, clay: f };
    specCache.set(key, spec);
  }
  return spec;
}

const liveCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

/**
 * Renders a person in the browser (three.js, loaded on demand), once per look
 * and size. Renders run one at a time with a breath between, so a grid of
 * thumbnails doesn't freeze the page.
 */
export function renderPersonLive(p: PersonConfig, px = 360): Promise<string> {
  const key = `${personKey(p)}@${px}`;
  const hit = liveCache.get(key);
  if (hit) return Promise.resolve(hit);
  let job = pending.get(key);
  if (!job) {
    job = queue.then(() =>
      import("@/lib/clay/scene").then(
        ({ renderPerson }) =>
          new Promise<string>((resolve) => {
            const url = renderPerson(p, px);
            liveCache.set(key, url);
            pending.delete(key);
            setTimeout(() => resolve(url), 16);
          }),
      ),
    );
    queue = job.catch(() => undefined);
    pending.set(key, job);
  }
  return job;
}

/**
 * Where a person's still comes from: the baked upload, else the preset's file
 * (when it hasn't been changed), else a render in the browser.
 */
function usePersonImage(setting: Extract<CharacterSetting, { type: "person" }> | null, size: number): string | null {
  const key = setting ? personKey(setting.person) : "";
  const preset = setting?.preset ? presetById(setting.preset) : undefined;
  const fixed = !setting
    ? null
    : setting.image_url
      ? setting.image_url
      : preset && personKey(preset.person) === key
        ? `/clay/people/${preset.id}${size > 132 ? "" : "@256"}.webp`
        : null;
  const px = size > 132 ? 360 : size > 72 ? 200 : 128;
  const [live, setLive] = useState<string | null>(() => (setting && !fixed ? (liveCache.get(`${key}@${px}`) ?? null) : null));
  useEffect(() => {
    if (!setting || fixed) return;
    let alive = true;
    const cached = liveCache.get(`${key}@${px}`);
    if (cached) {
      setLive(cached);
      return;
    }
    void renderPersonLive(setting.person, px).then((url) => {
      if (alive) setLive(url);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fixed, px]);
  return fixed ?? live;
}
