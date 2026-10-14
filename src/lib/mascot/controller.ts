/**
 * The hopping mascot's brain: one state machine, one rAF loop and one scroll
 * listener, shared by every page that shows the little Bo.
 *
 * Bo lives in an absolutely positioned wrapper (page coordinates), so while he
 * sits on a perch he scrolls with the page for free. Hops move the wrapper with
 * transforms only; squash, stretch, flips and flails happen inside the 3D scene.
 *
 * Perches are plain elements marked up in the page:
 *   <h2 data-bo-perch data-bo-x="0.1">Themes</h2>
 * data-bo-x is where along the top edge he stands (0 left, 1 right, default 0.5).
 * data-bo-say is a line he says the first time he lands there.
 * data-bo-delay (px) makes a perch wait a little longer, so cards in one row are
 * visited one after another instead of all at once.
 */
import type { BoPose, BoScene } from "@/lib/bo3d/scene";

/** Tuning knobs. Tweak freely. */
export const TUNING = {
  /** Hop height in px for slow, medium and fast scrolling. */
  hopHeight: { slow: 46, medium: 92, fast: 168 },
  /** Scroll speed (px per ms) that counts as medium, fast, and "left behind". */
  speed: { medium: 0.7, fast: 1.8, leftBehind: 4 },
  /** Chance of a flip on a fast hop. */
  flipChance: 0.35,
  /** About 1 in N hops he misjudges the landing and wobbles (never twice in a row). */
  quirkEvery: 8,
  /** Hops are this much smaller on phones. */
  mobileScale: 0.6,
  /** Anticipation squash before takeoff, ms. */
  anticipationMs: 80,
  /** A perch becomes active once its top passes this fraction of the screen height. */
  perchLine: 0.6,
  confettiBits: [3, 5] as const,
  /** How long a speech bubble stays up, ms. */
  bubbleMs: 2600,
};

/** What Bo says the first time he hops out. */
const INTRO = ["Hi, I'm Bo.", "I'll hop along with you."];

export type MascotState = "hidden" | "idle" | "hopping" | "scrambling" | "reacting" | "sleeping" | "dizzy" | "dragged" | "wrapping" | "celebrating";

type Point = { x: number; y: number };

type Hop = {
  from: Point;
  to: Point;
  start: number;
  duration: number;
  height: number;
  flip: boolean;
  backward: boolean;
  /** Little running hops when catching up. */
  scramble: boolean;
  /** Wobble on the edge after landing. */
  quirk: boolean;
  /** Hop index within a scramble chain, and the full chain's target. */
  chain?: { left: number; perch: number } | undefined;
};

const CONFETTI = ["#FBD3DC", "#E6DCF7", "#D5F0E3", "#FFE8B0", "#D9E8FB", "#FFDCCB", "#C2366B"];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

export class MascotController {
  state: MascotState = "hidden";
  private scene: BoScene | null = null;
  private perches: HTMLElement[] = [];
  private perchesAt = 0;
  private perchIndex = -1;
  private pos: Point = { x: -999, y: -999 };
  private hop: Hop | null = null;
  private landedAt = 0;
  private wobbleUntil = 0;
  private lastQuirk = false;
  private hopCount = 0;
  private leftBehind = false;
  private raf = 0;
  private lastScrollY = 0;
  private lastScrollT = 0;
  private velocity = 0;
  private dir = 1;
  private visible = false;
  /** Set when scrolling or resizing, so perches are only measured when something moved. */
  private dirty = true;
  private readonly bubble: HTMLDivElement;
  private bubbleTimer = 0;
  private sayQueue: string[] = [];
  private said = new Set<HTMLElement>();
  private introduced = false;
  private readonly reduce: boolean;
  private readonly mobile: boolean;

  constructor(
    private readonly el: HTMLElement,
    private readonly layer: HTMLElement,
  ) {
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.mobile = window.matchMedia("(max-width: 640px), (pointer: coarse)").matches;
    this.lastScrollY = window.scrollY;
    this.lastScrollT = performance.now();
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.el.style.opacity = "0";
    this.bubble = document.createElement("div");
    this.bubble.className = "bo-bubble";
    this.bubble.style.left = "0";
    this.bubble.style.top = "0";
    this.layer.appendChild(this.bubble);
    this.refreshPerches(true);
    this.pickPerch(performance.now());
    this.raf = requestAnimationFrame(this.frame);
  }

  setScene(scene: BoScene | null) {
    this.scene = scene;
  }

  /** Say something in a bubble. Lines queue up and play one at a time. */
  say(text: string, face: "wink" | "happy" | "surprised" | "love" | "blep" = "happy") {
    this.sayQueue.push(`${face}|${text}`);
    if (!this.bubble.dataset["show"]) this.nextLine();
  }

  private nextLine() {
    window.clearTimeout(this.bubbleTimer);
    const next = this.sayQueue.shift();
    if (!next) {
      delete this.bubble.dataset["show"];
      return;
    }
    const [face, text] = next.split("|") as [NonNullable<Parameters<MascotController["say"]>[1]>, string];
    this.bubble.textContent = text;
    this.bubble.dataset["show"] = "";
    this.scene?.setFace(face, 1300);
    this.bubbleTimer = window.setTimeout(() => {
      delete this.bubble.dataset["show"];
      this.bubbleTimer = window.setTimeout(() => this.nextLine(), 260);
    }, TUNING.bubbleMs);
  }

  destroy() {
    window.clearTimeout(this.bubbleTimer);
    this.bubble.remove();
    cancelAnimationFrame(this.raf);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  /* ---------- Input ---------- */

  private onScroll = () => {
    const now = performance.now();
    const y = window.scrollY;
    const dt = Math.max(1, now - this.lastScrollT);
    const v = Math.abs(y - this.lastScrollY) / dt;
    if (y !== this.lastScrollY) this.dir = y > this.lastScrollY ? 1 : -1;
    this.velocity = this.velocity * 0.6 + v * 0.4;
    this.lastScrollY = y;
    this.lastScrollT = now;
    this.dirty = true;
  };

  private onResize = () => {
    this.dirty = true;
    this.refreshPerches(true);
  };

  private onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(this.raf);
    else this.raf = requestAnimationFrame(this.frame);
  };

  /* ---------- Perches ---------- */

  private refreshPerches(force = false) {
    const now = performance.now();
    if (!force && now - this.perchesAt < 600) return;
    this.perchesAt = now;
    this.perches = Array.from(document.querySelectorAll<HTMLElement>("[data-bo-perch]")).filter((p) => p.offsetParent !== null);
    // Stay glued to the perch if the layout shifted (images, fonts, themes loading).
    if (this.state === "idle" && !this.hop && now - this.landedAt > 600) this.snapToPerch();
  }

  private perchPoint(i: number): Point | null {
    const el = this.perches[i];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const fx = Number(el.dataset["boX"] ?? 0.5);
    return { x: r.left + window.scrollX + r.width * (Number.isFinite(fx) ? fx : 0.5), y: r.top + window.scrollY + 2 };
  }

  /** The last perch whose top has crossed the perch line, or -1 above the first one. */
  private activePerch() {
    const line = window.innerHeight * TUNING.perchLine;
    let best = -1;
    for (let i = 0; i < this.perches.length; i++) {
      const el = this.perches[i]!;
      const delay = Number(el.dataset["boDelay"] ?? 0) || 0;
      if (el.getBoundingClientRect().top + delay < line) best = i;
    }
    return best;
  }

  private snapToPerch() {
    const p = this.perchPoint(this.perchIndex);
    if (p) this.pos = p;
  }

  private pickPerch(now: number) {
    this.refreshPerches();
    if (!this.dirty || this.hop) return;
    this.dirty = false;
    const next = this.activePerch();
    if (next === this.perchIndex) return;

    // Above the first perch: Bo isn't out yet.
    if (next < 0) {
      if (this.visible) this.hide(now);
      this.perchIndex = -1;
      return;
    }

    const to = this.perchPoint(next);
    if (!to) return;

    // First appearance: drop in from just above the screen.
    if (!this.visible) {
      this.perchIndex = next;
      this.pos = { x: to.x, y: window.scrollY - 140 };
      this.show();
      this.startHop(now, to, { height: 0, duration: 520 });
      return;
    }

    // Scrolling very fast: he gets left behind, then scrambles to catch up.
    if (this.velocity > TUNING.speed.leftBehind && !this.reduce) {
      this.leftBehind = true;
      this.dirty = true;
      return;
    }
    if (this.leftBehind) {
      if (this.velocity > TUNING.speed.medium) {
        this.dirty = true;
        return;
      }
      this.leftBehind = false;
      this.startScramble(now, next);
      return;
    }

    const from = this.perchIndex;
    this.perchIndex = next;
    this.startHop(now, to, { backward: next < from });
  }

  /* ---------- Hops ---------- */

  private startHop(now: number, to: Point, opts: Partial<Pick<Hop, "height" | "duration" | "backward" | "scramble" | "chain">> = {}) {
    if (this.reduce) {
      // No hops: fade out, move, fade back in.
      this.el.style.transition = "opacity 220ms ease";
      this.el.style.opacity = "0";
      window.setTimeout(() => {
        this.pos = to;
        this.place();
        this.el.style.opacity = "1";
      }, 230);
      this.state = "idle";
      return;
    }
    const v = this.velocity;
    const tier = v > TUNING.speed.fast ? "fast" : v > TUNING.speed.medium ? "medium" : "slow";
    const scale = this.mobile ? TUNING.mobileScale : 1;
    const dist = Math.hypot(to.x - this.pos.x, to.y - this.pos.y);
    const height = opts.height ?? (TUNING.hopHeight[tier] + Math.min(80, dist * 0.08)) * scale;
    const scramble = !!opts.scramble;
    this.hopCount++;
    const quirk = !scramble && !this.lastQuirk && this.hopCount > 1 && Math.random() < 1 / TUNING.quirkEvery;
    this.lastQuirk = quirk;
    this.hop = {
      from: { ...this.pos },
      to,
      start: now,
      duration: opts.duration ?? Math.max(380, Math.min(820, 340 + dist * 0.28)),
      height,
      flip: !scramble && tier === "fast" && Math.random() < TUNING.flipChance,
      backward: !!opts.backward,
      scramble,
      quirk,
      chain: opts.chain,
    };
    this.state = scramble ? "scrambling" : "hopping";
  }

  /** Three quick little hops from the edge of the screen to the right perch. */
  private startScramble(now: number, perch: number) {
    const to = this.perchPoint(perch);
    if (!to) return;
    const top = window.scrollY;
    const bottom = top + window.innerHeight;
    // If his old spot is off screen, he comes in from that edge.
    if (this.pos.y < top - 40) this.pos = { x: this.pos.x, y: top - 60 };
    else if (this.pos.y > bottom + 40) this.pos = { x: this.pos.x, y: bottom + 60 };
    this.perchIndex = perch;
    this.scrambleStep(now, perch, 3);
  }

  private scrambleStep(now: number, perch: number, left: number) {
    const target = this.perchPoint(perch);
    if (!target) return;
    const k = 1 / left;
    const to = { x: this.pos.x + (target.x - this.pos.x) * k, y: this.pos.y + (target.y - this.pos.y) * k };
    this.startHop(now, left === 1 ? target : to, {
      height: (this.mobile ? 22 : 34) + Math.random() * 10,
      duration: 260,
      scramble: true,
      chain: { left: left - 1, perch },
    });
  }

  private land(now: number, hop: Hop) {
    this.pos = { ...hop.to };
    this.hop = null;
    this.landedAt = now;
    this.state = "idle";
    // The page may have moved on while he was in the air.
    this.dirty = true;
    this.scene?.wiggleBow();
    if (hop.chain && hop.chain.left > 0) {
      this.scrambleStep(now, hop.chain.perch, hop.chain.left);
      return;
    }
    if (hop.quirk) this.wobbleUntil = now + 950;
    this.puff(hop.to);
    if (!this.introduced) {
      this.introduced = true;
      INTRO.forEach((line, i) => this.say(line, i === 0 ? "wink" : "happy"));
    }
    const perch = this.perches[this.perchIndex];
    const line = perch?.dataset["boSay"];
    if (perch && line && !this.said.has(perch)) {
      this.said.add(perch);
      this.say(line);
    }
  }

  /* ---------- Show / hide ---------- */

  private show() {
    this.visible = true;
    this.el.style.transition = "opacity 200ms ease";
    this.el.style.opacity = "1";
  }

  private hide(_now: number) {
    this.visible = false;
    this.sayQueue = [];
    window.clearTimeout(this.bubbleTimer);
    delete this.bubble.dataset["show"];
    this.hop = null;
    this.state = "hidden";
    this.el.style.transition = "opacity 260ms ease";
    this.el.style.opacity = "0";
  }

  /* ---------- Confetti puff on landing (DOM, transform/opacity only) ---------- */

  private puff(at: Point) {
    if (this.reduce) return;
    const [lo, hi] = TUNING.confettiBits;
    const n = lo + Math.floor(Math.random() * (hi - lo + 1));
    for (let i = 0; i < n; i++) {
      const bit = document.createElement("span");
      const size = 5 + Math.random() * 4;
      Object.assign(bit.style, {
        position: "absolute",
        left: `${at.x}px`,
        top: `${at.y - 4}px`,
        width: `${size}px`,
        height: `${size * 0.6}px`,
        borderRadius: "2px",
        background: CONFETTI[(Math.random() * CONFETTI.length) | 0]!,
        pointerEvents: "none",
        willChange: "transform, opacity",
      });
      this.layer.appendChild(bit);
      const side = i % 2 === 0 ? -1 : 1;
      const dx = side * (14 + Math.random() * 26);
      const dy = -(10 + Math.random() * 22);
      const rot = (Math.random() - 0.5) * 540;
      const anim = bit.animate(
        [
          { transform: "translate(-50%, 0) rotate(0deg)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx * 1.3}px), ${dy + 18}px) rotate(${rot}deg)`, opacity: 0 },
        ],
        { duration: 620 + Math.random() * 180, easing: "cubic-bezier(.2,.7,.4,1)" },
      );
      anim.onfinish = () => bit.remove();
    }
  }

  /* ---------- The loop ---------- */

  private place(lift = 0) {
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    const feet = this.scene?.feetPoint() ?? { x: 0.5, y: 0.82 };
    const x = this.pos.x - w * feet.x;
    const y = this.pos.y - lift - h * feet.y;
    this.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    if (this.bubble.dataset["show"] !== undefined) {
      // Above his head, to the right; flips left near the right edge of the screen.
      const bw = this.bubble.offsetWidth;
      const bh = this.bubble.offsetHeight;
      const left = this.pos.x + w * 0.18 + bw > window.scrollX + window.innerWidth - 12;
      this.bubble.dataset["side"] = left ? "left" : "right";
      const bx = left ? this.pos.x - w * 0.18 - bw : this.pos.x + w * 0.18;
      const by = y + h * 0.05 - bh;
      // left/top (not transform) so the bubble's own pop-in transition still plays.
      this.bubble.style.left = `${Math.max(window.scrollX + 8, bx).toFixed(1)}px`;
      this.bubble.style.top = `${by.toFixed(1)}px`;
    }
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    this.velocity *= 0.92;
    this.pickPerch(now);

    const pose: Partial<BoPose> = { squash: 1, tuck: 0, flail: 0, run: 0, flip: 0, lean: 0, turn: null };
    let lift = 0;
    const hop = this.hop;

    if (hop) {
      const elapsed = now - hop.start;
      const antic = hop.scramble ? 0 : TUNING.anticipationMs;
      if (elapsed < antic) {
        // Anticipation: crouch before the jump.
        pose.squash = 1 - 0.22 * Math.sin((elapsed / antic) * (Math.PI / 2));
        pose.tuck = 0;
      } else {
        const s = clamp01((elapsed - antic) / hop.duration);
        const e = hop.scramble ? s : easeInOut(s) * 0.35 + s * 0.65;
        this.pos = { x: hop.from.x + (hop.to.x - hop.from.x) * e, y: hop.from.y + (hop.to.y - hop.from.y) * e };
        lift = 4 * hop.height * s * (1 - s);
        // Stretched on the way up and down, round at the top.
        pose.squash = hop.scramble ? 1 : 1 + 0.16 * Math.abs(2 * s - 1) * Math.sin(Math.PI * Math.min(1, s * 1.4));
        pose.tuck = hop.scramble ? 0.2 : Math.sin(Math.PI * s);
        pose.run = hop.scramble ? 1 : 0;
        pose.flail = hop.scramble ? 0.5 : 0;
        if (hop.flip) pose.flip = -Math.PI * 2 * easeInOut(s);
        const dx = hop.to.x - hop.from.x;
        pose.turn = Math.abs(dx) > 30 ? Math.sign(dx) * 0.55 * Math.sin(Math.PI * s) : null;
        if (hop.backward) pose.flip = (pose.flip ?? 0) + 0.28 * Math.sin(Math.PI * s);
        if (s >= 1) this.land(now, hop);
      }
    } else if (this.state !== "hidden") {
      // Landing squash, then a small bounce to settle.
      const since = (now - this.landedAt) / 1000;
      if (since < 0.6 && !this.reduce) pose.squash = 1 - 0.26 * Math.exp(-since * 9) * Math.cos(since * 24);
      // Misjudged the landing: wobble on the edge, flail, steady.
      if (now < this.wobbleUntil) {
        const left = (this.wobbleUntil - now) / 950;
        pose.lean = Math.sin(now / 55) * 0.32 * left;
        pose.flail = Math.min(1, left * 1.6);
      }
    }

    this.scene?.setPose(pose);
    if (this.visible || hop) this.place(lift);
  };
}
