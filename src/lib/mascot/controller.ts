/**
 * The hopping mascot's brain: one state machine, one rAF loop and one set of
 * window listeners, shared by every page that shows the little Bo.
 *
 * Bo lives in an absolutely positioned wrapper (page coordinates). Hops move the
 * wrapper with transforms only; squash, stretch, flips and faces happen inside
 * the 3D scene. Pages talk to him through lib/mascot/bus.ts.
 *
 * Perches are plain elements marked up in the page:
 *   <h2 data-bo-perch data-bo-x="0.1" data-bo-say="Hi">Themes</h2>
 *   data-bo-x          where along the top edge he stands (0 left, 1 right, default 0.5)
 *   data-bo-say        a line he says the first time he lands there
 *   data-bo-delay      px; makes a perch wait, so cards in one row are visited in turn
 *   data-bo-accessory  he wears this while on (or hovering) that element
 *   data-bo-point      1 or -1: he points that way after landing
 *   data-bo-hover-face a face he pulls while the pointer is over the element
 *   data-bo-always     counts as reached no matter where it is on screen (app layouts)
 * Fields inside [data-bo-zone] become perches while focused (when followFocus is on).
 */
import type { BoFace, BoPose, BoScene } from "@/lib/bo3d/scene";
import type { BoAccessory } from "@/lib/bo3d/accessories";
import { onBoEvent, setBoListening, takeCelebration, type BoEvent } from "./bus";

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
  /** No input for this long and he dozes off. */
  sleepAfterMs: 20000,
  /** This many taps within dizzyWindowMs makes him dizzy. */
  dizzyTaps: 5,
  dizzyWindowMs: 1800,
  /** Flick physics: gravity in px/s², and the share of speed kept per wall hit. */
  gravity: 2600,
  bounce: 0.55,
  /** The "Wrap it up" routine, ms (keep under 1000 so checkout never waits). */
  wrapMs: 900,
};

/** What Bo says the first time he hops out. */
const INTRO = ["Hi, I'm Bo.", "I'll hop along with you."];

export type MascotState = "hidden" | "idle" | "hopping" | "scrambling" | "reacting" | "sleeping" | "dizzy" | "dragged" | "wrapping" | "celebrating";

export type MascotOptions = {
  /** Hop to fields inside [data-bo-zone] while they're focused. */
  followFocus?: boolean;
  /** Celebrate once if a first gift was just created. */
  celebrate?: boolean;
  /** Say hi on the first hop. Default true. */
  intro?: boolean;
};

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
  /** Floating down on a paper note (first appearance). */
  float: boolean;
  /** Wobble on the edge after landing. */
  quirk: boolean;
  /** Remaining hops in a scramble chain, toward this element. */
  chain?: { left: number; el: HTMLElement } | undefined;
};

type ActionKind = "lidpop" | "dizzy" | "wrap" | "bam" | "hug" | "cheer" | "point" | "yawn" | "wake";
type Action = { kind: ActionKind; start: number; dur: number; done?: (() => void) | undefined; dir?: number };

const CONFETTI = ["#FBD3DC", "#E6DCF7", "#D5F0E3", "#FFE8B0", "#D9E8FB", "#FFDCCB", "#C2366B"];
const FIELD = "input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]), textarea, select";
const INTERACTIVE = "input, textarea, select, button, a, label, [role=button], [contenteditable=true]";
const HIDDEN_TITLE = "Your gift misses you 🎁";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export class MascotController {
  state: MascotState = "hidden";
  private scene: BoScene | null = null;
  private readonly opts: MascotOptions;
  private readonly reduce: boolean;
  private readonly mobile: boolean;
  private raf = 0;
  private lastFrame = 0;
  private offs: (() => void)[] = [];

  /* where he is */
  private pos: Point = { x: -999, y: -999 };
  private visible = false;
  private perches: HTMLElement[] = [];
  private perchesAt = 0;
  private perchEl: HTMLElement | null = null;
  private focusEl: HTMLElement | null = null;
  private clipEl: HTMLElement | null = null;
  private clipped = false;
  private dirty = true;
  private lastCheck = 0;

  /* moving */
  private hop: Hop | null = null;
  private landedAt = 0;
  private wobbleUntil = 0;
  private lastQuirk = false;
  private hopCount = 0;
  private leftBehind = false;
  private bobAt = 0;

  /* scroll */
  private lastScrollY = 0;
  private lastScrollT = 0;
  private velocity = 0;

  /* pointer, drag and flick */
  private pointer: Point | null = null;
  private press: { id: number; start: Point; off: Point; moved: boolean; samples: { t: number; x: number; y: number }[] } | null = null;
  private fling: { vx: number; vy: number; start: number; restAt: number } | null = null;
  private taps: number[] = [];

  /* reactions */
  private action: Action | null = null;
  private sleeping = false;
  private lastInput = performance.now();
  private celebratePending = false;
  private introduced = false;

  /* accessory */
  private pageAccessory: BoAccessory | null = null;
  private hoverAccessory: BoAccessory | null = null;
  private hoverEl: Element | null = null;
  private wornAccessory: BoAccessory | null | undefined = undefined;

  /* speech */
  private readonly bubble: HTMLDivElement;
  private readonly hitbox: HTMLDivElement;
  private bubbleTimer = 0;
  private sayQueue: { text: string; face: BoFace }[] = [];
  private said = new Set<HTMLElement>();
  private bubbleSpot: "above-right" | "above-left" | "right" | "left" = "above-right";
  private raft: HTMLDivElement | null = null;
  private savedTitle: string | null = null;

  constructor(
    private readonly el: HTMLElement,
    private readonly layer: HTMLElement,
    opts: MascotOptions = {},
  ) {
    this.opts = { intro: true, ...opts };
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.mobile = window.matchMedia("(max-width: 640px), (pointer: coarse)").matches;
    this.lastScrollY = window.scrollY;
    this.lastScrollT = performance.now();
    this.celebratePending = !!opts.celebrate && takeCelebration();

    this.el.style.opacity = "0";
    this.bubble = document.createElement("div");
    this.bubble.className = "bo-bubble";
    this.layer.appendChild(this.bubble);

    // A small hitbox on Bo himself: the only part of him that takes clicks.
    this.hitbox = document.createElement("div");
    Object.assign(this.hitbox.style, {
      position: "absolute",
      left: "26%",
      width: "48%",
      top: "20%",
      height: "64%",
      borderRadius: "30%",
      pointerEvents: "none",
      cursor: "grab",
      touchAction: "none",
    });
    this.el.appendChild(this.hitbox);

    const on = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void) => {
      window.addEventListener(type, fn, { passive: true });
      this.offs.push(() => window.removeEventListener(type, fn));
    };
    on("scroll", this.onScroll);
    on("resize", () => {
      this.dirty = true;
      this.refreshPerches(true);
    });
    on("pointermove", this.onPointerMove);
    on("pointerover", this.onPointerOver);
    on("keydown", () => this.poke());
    on("touchstart", () => this.poke());
    on("wheel", () => this.poke());
    on("focusin", this.onFocusIn);
    on("focusout", this.onFocusOut);
    on("input", this.onInput);
    on("pointerup", this.onPointerUp);
    on("pointercancel", this.onPointerUp);
    const vis = () => this.onVisibility();
    document.addEventListener("visibilitychange", vis);
    this.offs.push(() => document.removeEventListener("visibilitychange", vis));
    const down = (e: PointerEvent) => this.onPointerDown(e);
    this.hitbox.addEventListener("pointerdown", down);
    this.offs.push(() => this.hitbox.removeEventListener("pointerdown", down));
    this.offs.push(onBoEvent(this.onBus));
    setBoListening(true);

    this.refreshPerches(true);
    this.raf = requestAnimationFrame(this.frame);
  }

  setScene(scene: BoScene | null) {
    this.scene = scene;
    this.wornAccessory = undefined;
  }

  destroy() {
    setBoListening(false);
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.bubbleTimer);
    for (const off of this.offs) off();
    this.bubble.remove();
    this.raft?.remove();
    if (this.savedTitle !== null && document.title === HIDDEN_TITLE) document.title = this.savedTitle;
    this.endAction();
  }

  /* ---------- Speech ---------- */

  /** Say something in a bubble. Lines queue up and play one at a time. */
  say(text: string, face: BoFace = "happy") {
    if (this.sleeping) this.wake(performance.now());
    this.sayQueue.push({ text, face });
    if (this.bubble.dataset["show"] === undefined) this.nextLine();
  }

  private nextLine() {
    window.clearTimeout(this.bubbleTimer);
    const next = this.sayQueue.shift();
    if (!next) {
      delete this.bubble.dataset["show"];
      return;
    }
    this.bubble.textContent = next.text;
    delete this.bubble.dataset["z"];
    this.bubble.dataset["show"] = "";
    this.scene?.setFace(next.face, 1300);
    this.chooseBubbleSpot();
    this.bubbleTimer = window.setTimeout(() => {
      delete this.bubble.dataset["show"];
      this.bubbleTimer = window.setTimeout(() => this.nextLine(), 260);
    }, TUNING.bubbleMs);
  }

  private clearSpeech() {
    this.sayQueue = [];
    window.clearTimeout(this.bubbleTimer);
    delete this.bubble.dataset["show"];
    delete this.bubble.dataset["z"];
  }

  /** Bubble rect for a spot, in page coordinates, slid sideways to stay on screen. */
  private bubbleRect(spot: MascotController["bubbleSpot"]) {
    const r = this.rawBubbleRect(spot);
    const min = window.scrollX + 8;
    const max = window.scrollX + document.documentElement.clientWidth - 8 - r.w;
    return { ...r, x: Math.max(min, Math.min(max, r.x)) };
  }

  private rawBubbleRect(spot: MascotController["bubbleSpot"]) {
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    const bw = this.bubble.offsetWidth;
    const bh = this.bubble.offsetHeight;
    const headTop = this.pos.y - h * 0.76;
    const mid = this.pos.y - h * 0.45;
    switch (spot) {
      case "above-right":
        return { x: this.pos.x + w * 0.16, y: headTop - bh, w: bw, h: bh };
      case "above-left":
        return { x: this.pos.x - w * 0.16 - bw, y: headTop - bh, w: bw, h: bh };
      case "right":
        return { x: this.pos.x + w * 0.42, y: mid - bh / 2, w: bw, h: bh };
      case "left":
        return { x: this.pos.x - w * 0.42 - bw, y: mid - bh / 2, w: bw, h: bh };
    }
  }

  /**
   * Pick a spot for the bubble that stays on screen and never covers a field,
   * a button or a link. Tries above-right, above-left, then the sides.
   */
  private chooseBubbleSpot() {
    const spots = ["above-right", "above-left", "right", "left"] as const;
    const sx = window.scrollX;
    const sy = window.scrollY;
    const vw = window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    // Fixed headers count as off limits too, so bubbles never sit under/over the nav.
    const header = document.querySelector<HTMLElement>("[data-bo-avoid]")?.getBoundingClientRect();
    const topLimit = header ? Math.max(8, header.bottom + 6) : 8;
    let best: { spot: (typeof spots)[number]; score: number } | null = null;
    for (const spot of spots) {
      const r = this.bubbleRect(spot);
      const vx = r.x - sx;
      const vy = r.y - sy;
      if (vx < 8 || vx + r.w > vw - 8 || vy < topLimit || vy + r.h > vh - 8) continue;
      let blocked = false;
      let score = 0;
      for (const [px, py] of [
        [vx + 4, vy + 4],
        [vx + r.w - 4, vy + 4],
        [vx + 4, vy + r.h - 4],
        [vx + r.w - 4, vy + r.h - 4],
        [vx + r.w / 2, vy + r.h / 2],
      ] as const) {
        const hit = document.elementsFromPoint(px, py).find((n) => !this.layer.contains(n));
        if (hit && (hit.closest(INTERACTIVE) || (this.focusEl && hit === this.focusEl))) {
          blocked = true;
          score += 1;
        }
      }
      if (!blocked) {
        this.bubbleSpot = spot;
        return;
      }
      if (!best || score < best.score) best = { spot, score };
    }
    this.bubbleSpot = best?.spot ?? "right";
  }

  private placeBubble() {
    if (this.bubble.dataset["show"] === undefined) return;
    const r = this.bubbleRect(this.bubbleSpot);
    this.bubble.dataset["side"] = this.bubbleSpot === "above-left" || this.bubbleSpot === "left" ? "left" : "right";
    this.bubble.dataset["tail"] = this.bubbleSpot.startsWith("above") ? "down" : "none";
    // left/top (not transform) so the bubble's own pop-in transition still plays.
    this.bubble.style.left = `${Math.max(window.scrollX + 8, r.x).toFixed(1)}px`;
    this.bubble.style.top = `${r.y.toFixed(1)}px`;
  }

  /* ---------- Input ---------- */

  private poke() {
    this.lastInput = performance.now();
    if (this.sleeping) this.wake(this.lastInput);
  }

  private onScroll = () => {
    const now = performance.now();
    const y = window.scrollY;
    const dt = Math.max(1, now - this.lastScrollT);
    const v = Math.abs(y - this.lastScrollY) / dt;
    this.velocity = this.velocity * 0.6 + v * 0.4;
    this.lastScrollY = y;
    this.lastScrollT = now;
    this.dirty = true;
    this.poke();
  };

  private onPointerMove = (e: PointerEvent) => {
    this.pointer = { x: e.clientX, y: e.clientY };
    this.poke();
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    const doc = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
    if (!p.moved && Math.hypot(doc.x - p.start.x, doc.y - p.start.y) > 6) {
      p.moved = true;
      this.hop = null;
      this.fling = null;
      this.endAction();
      this.state = "dragged";
      this.hitbox.style.cursor = "grabbing";
      this.clearSpeech();
    }
    if (p.moved) {
      this.pos = { x: doc.x - p.off.x, y: doc.y - p.off.y };
      p.samples.push({ t: performance.now(), x: doc.x, y: doc.y });
      if (p.samples.length > 8) p.samples.shift();
    }
  };

  private onPointerOver = (e: PointerEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    const accEl = target?.closest<HTMLElement>("[data-bo-accessory]") ?? null;
    this.hoverAccessory = (accEl?.dataset["boAccessory"] as BoAccessory | undefined) ?? null;
    const faceEl = target?.closest<HTMLElement>("[data-bo-hover-face]") ?? null;
    if (faceEl !== this.hoverEl) {
      this.hoverEl = faceEl;
      const face = faceEl?.dataset["boHoverFace"] as BoFace | undefined;
      if (face && this.visible && !this.sleeping) this.scene?.setFace(face, 1600);
    }
  };

  private onFocusIn = (e: FocusEvent) => {
    if (!this.opts.followFocus) return;
    const t = e.target instanceof HTMLElement ? e.target : null;
    const box = t?.getBoundingClientRect();
    if (t?.matches(FIELD) && t.closest("[data-bo-zone]") && box && box.width > 8 && box.height > 8) {
      this.focusEl = t;
      this.dirty = true;
    }
  };

  private onFocusOut = () => {
    if (!this.focusEl) return;
    window.setTimeout(() => {
      const a = document.activeElement;
      if (a instanceof HTMLElement && a.matches(FIELD) && a.closest("[data-bo-zone]")) return;
      this.focusEl = null;
      this.dirty = true;
    }, 120);
  };

  private onInput = (e: Event) => {
    if (this.focusEl && e.target === this.focusEl) this.bobAt = performance.now();
  };

  private onPointerDown(e: PointerEvent) {
    if (!this.visible) return;
    e.preventDefault();
    try {
      this.hitbox.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointer: window listeners still get the moves.
    }
    const doc = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
    this.press = { id: e.pointerId, start: doc, off: { x: doc.x - this.pos.x, y: doc.y - this.pos.y }, moved: false, samples: [{ t: performance.now(), ...doc }] };
    this.poke();
  }

  private onPointerUp = (e: PointerEvent) => {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    this.press = null;
    this.hitbox.style.cursor = "grab";
    const now = performance.now();
    if (!p.moved) {
      this.tap(now);
      return;
    }
    if (this.reduce) {
      this.goHome(now);
      return;
    }
    // Let go: fly with the hand's speed, bounce off the screen edges, then hop home.
    const first = p.samples.find((s) => now - s.t < 90) ?? p.samples[0]!;
    const last = p.samples[p.samples.length - 1]!;
    const dt = Math.max(16, last.t - first.t) / 1000;
    this.fling = { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt, start: now, restAt: 0 };
    this.state = "dragged";
  };

  private onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      if (document.title !== HIDDEN_TITLE) {
        this.savedTitle = document.title;
        document.title = HIDDEN_TITLE;
      }
    } else {
      if (this.savedTitle !== null && document.title === HIDDEN_TITLE) document.title = this.savedTitle;
      this.savedTitle = null;
      this.lastFrame = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private onBus = (e: BoEvent) => {
    const now = performance.now();
    switch (e.type) {
      case "say":
        if (this.visible) this.say(e.text, e.face ?? "happy");
        break;
      case "accessory":
        this.pageAccessory = e.name;
        break;
      case "react":
        if (!this.visible) break;
        if (e.kind === "wave") this.scene?.setMood("wave");
        else if (e.kind === "celebrate") this.celebrate(now);
        else this.startAction(e.kind, now, e.kind === "hug" ? 1700 : 750);
        break;
      case "wrap":
        if (!this.visible || this.reduce) {
          this.scene?.setFace("happy", 900);
          window.setTimeout(e.done, this.reduce && this.visible ? 150 : 0);
          break;
        }
        this.hop = null;
        this.fling = null;
        this.startAction("wrap", now, TUNING.wrapMs, e.done);
        break;
    }
  };

  /* ---------- Taps and reactions ---------- */

  private tap(now: number) {
    if (this.sleeping) return;
    this.taps = this.taps.filter((t) => now - t < TUNING.dizzyWindowMs);
    this.taps.push(now);
    if (this.taps.length >= TUNING.dizzyTaps) {
      this.taps = [];
      this.startAction("dizzy", now, 2400);
      this.clearSpeech();
      this.say("Whoa. Everything's spinning.", "dizzy");
      return;
    }
    if (this.action?.kind === "dizzy") return;
    this.startAction("lidpop", now, 720);
    this.scene?.setFace(this.taps.length % 2 ? "happy" : "surprised", 800);
    this.burst(this.headPoint(), 12);
  }

  private celebrate(now: number) {
    if (this.reduce) {
      this.scene?.setFace("love", 1600);
      return;
    }
    this.startHop(now, { ...this.pos }, { height: 120, duration: 640, flip: true });
    this.burst(this.headPoint(), 26);
    this.state = "celebrating";
  }

  private startAction(kind: ActionKind, now: number, dur: number, done?: () => void) {
    this.endAction();
    this.action = { kind, start: now, dur, done };
    if (kind === "dizzy") this.state = "dizzy";
    else if (kind === "wrap") this.state = "wrapping";
    else if (kind !== "yawn" && kind !== "point") this.state = "reacting";
  }

  private endAction() {
    const a = this.action;
    this.action = null;
    a?.done?.();
  }

  private sleep(now: number) {
    this.sleeping = true;
    this.state = "sleeping";
    this.startAction("yawn", now, 1400);
    this.scene?.setFace("yawn", 1400);
    window.setTimeout(() => {
      if (!this.sleeping) return;
      this.scene?.setFace("sleepy", 1e9);
      this.clearSpeech();
      this.bubble.textContent = "z z z";
      this.bubble.dataset["z"] = "";
      this.bubble.dataset["show"] = "";
      this.chooseBubbleSpot();
    }, 1400);
  }

  private wake(now: number) {
    if (!this.sleeping) return;
    this.sleeping = false;
    this.clearSpeech();
    this.scene?.setFace("surprised", 700);
    this.startAction("wake", now, 480);
  }

  /* ---------- Perches ---------- */

  private refreshPerches(force = false) {
    const now = performance.now();
    if (!force && now - this.perchesAt < 600) return;
    this.perchesAt = now;
    this.perches = Array.from(document.querySelectorAll<HTMLElement>("[data-bo-perch]")).filter((p) => p.offsetParent !== null);
  }

  private pointFor(el: HTMLElement): Point {
    const r = el.getBoundingClientRect();
    if (el === this.focusEl) {
      // Beside the form, level with the field, so he never covers it or the field above.
      const side = this.focusSide(el);
      if (side) return side;
    }
    const fx = Number(el.dataset["boX"] ?? 0.5);
    return { x: r.left + window.scrollX + r.width * (Number.isFinite(fx) ? fx : 0.5), y: r.top + window.scrollY + 2 };
  }

  /**
   * A spot just outside the form (right side, else left) level with a focused field,
   * or null when there's no room (phones). Then he stays on his perch and just bobs.
   */
  private focusSide(el: HTMLElement): Point | null {
    const r = el.getBoundingClientRect();
    const zone = (el.closest("[data-bo-side]") as HTMLElement | null) ?? (el.closest("[data-bo-zone]") as HTMLElement | null);
    const zr = zone?.getBoundingClientRect() ?? r;
    const w = this.el.offsetWidth || 112;
    const gap = 14;
    const y = r.bottom + window.scrollY - 4;
    const vw = document.documentElement.clientWidth;
    if (zr.right + gap + w <= vw - 8) return { x: zr.right + gap + w / 2 + window.scrollX, y };
    if (zr.left - gap - w >= 8) return { x: zr.left - gap - w / 2 + window.scrollX, y };
    return null;
  }

  /** Can he follow this focused field to a spot of its own? */
  private canFollow(el: HTMLElement | null): el is HTMLElement {
    return !!el?.isConnected && this.focusSide(el) !== null;
  }

  /** The last perch whose top has crossed the perch line, or null above the first one. */
  private scrollPerch(): HTMLElement | null {
    const line = window.innerHeight * TUNING.perchLine;
    let best: HTMLElement | null = null;
    for (const el of this.perches) {
      if (el.dataset["boAlways"] !== undefined) {
        best = el;
        continue;
      }
      const delay = Number(el.dataset["boDelay"] ?? 0) || 0;
      if (el.getBoundingClientRect().top + delay < line) best = el;
    }
    return best;
  }

  /** The nearest scrolling box around a perch, so he can fade out when it scrolls away. */
  private findClip(el: HTMLElement | null) {
    let n = el?.parentElement ?? null;
    while (n && n !== document.body && n !== document.documentElement) {
      const o = getComputedStyle(n).overflowY;
      if (o === "auto" || o === "scroll") return n;
      n = n.parentElement;
    }
    return null;
  }

  private busy() {
    return !!(this.hop || this.press?.moved || this.fling || (this.action && this.action.kind !== "point" && this.action.kind !== "yawn"));
  }

  private pickPerch(now: number) {
    this.refreshPerches();
    if (!this.dirty && now - this.lastCheck < 300) return;
    if (this.busy()) return;
    this.dirty = false;
    this.lastCheck = now;

    const target = this.canFollow(this.focusEl) ? this.focusEl : this.scrollPerch();
    if (target === this.perchEl) return;

    if (!target) {
      if (this.visible) this.hide();
      this.perchEl = null;
      return;
    }

    const to = this.pointFor(target);

    // First appearance: float down on a paper note from just above the screen.
    if (!this.visible) {
      this.setPerch(target);
      this.show();
      if (this.reduce) {
        this.pos = to;
        this.land(now, null);
      } else {
        this.pos = { x: to.x - 30, y: Math.min(to.y - 60, window.scrollY - 150) };
        this.startHop(now, to, { height: 0, duration: 1100, float: true });
      }
      return;
    }

    const isFocus = target === this.focusEl;
    // Scrolling very fast: he gets left behind, then scrambles to catch up.
    if (!isFocus && this.velocity > TUNING.speed.leftBehind && !this.reduce) {
      this.leftBehind = true;
      this.dirty = true;
      return;
    }
    if (!isFocus && this.leftBehind) {
      if (this.velocity > TUNING.speed.medium) {
        this.dirty = true;
        return;
      }
      this.leftBehind = false;
      this.startScramble(now, target);
      return;
    }

    this.setPerch(target);
    this.startHop(now, to, { backward: to.y < this.pos.y - 4, ...(isFocus ? { height: this.mobile ? 26 : 40 } : {}) });
  }

  private setPerch(el: HTMLElement) {
    this.perchEl = el;
    this.clipEl = this.findClip(el);
    // A new perch starts visible; updateClip fades him again if it's scrolled away.
    if (this.clipped) {
      this.clipped = false;
      this.el.style.opacity = "1";
      this.hitbox.style.pointerEvents = "auto";
    }
  }

  private goHome(now: number) {
    this.fling = null;
    this.dirty = true;
    const home = this.perchEl?.isConnected ? this.perchEl : null;
    if (!home) {
      this.hide();
      return;
    }
    this.startHop(now, this.pointFor(home), { height: 60 });
  }

  /* ---------- Hops ---------- */

  private startHop(now: number, to: Point, opts: Partial<Pick<Hop, "height" | "duration" | "backward" | "scramble" | "chain" | "flip" | "float">> = {}) {
    if (this.reduce) {
      // No hops: fade out, move, fade back in.
      this.el.style.transition = "opacity 220ms ease";
      this.el.style.opacity = "0";
      window.setTimeout(() => {
        this.pos = to;
        this.place();
        this.el.style.opacity = this.clipped ? "0" : "1";
        this.land(performance.now(), null);
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
    const float = !!opts.float;
    this.hopCount++;
    const quirk = !scramble && !float && !this.lastQuirk && this.hopCount > 2 && Math.random() < 1 / TUNING.quirkEvery;
    this.lastQuirk = quirk;
    this.hop = {
      from: { ...this.pos },
      to,
      start: now,
      duration: opts.duration ?? Math.max(380, Math.min(820, 340 + dist * 0.28)),
      height,
      flip: opts.flip ?? (!scramble && tier === "fast" && Math.random() < TUNING.flipChance),
      backward: !!opts.backward,
      scramble,
      float,
      quirk,
      chain: opts.chain,
    };
    if (float) this.makeRaft();
    if (this.state !== "celebrating") this.state = scramble ? "scrambling" : "hopping";
  }

  /** Three quick little hops from the edge of the screen to the right perch. */
  private startScramble(now: number, el: HTMLElement) {
    const top = window.scrollY;
    const bottom = top + window.innerHeight;
    if (this.pos.y < top - 40) this.pos = { x: this.pos.x, y: top - 60 };
    else if (this.pos.y > bottom + 40) this.pos = { x: this.pos.x, y: bottom + 60 };
    this.setPerch(el);
    this.scrambleStep(now, el, 3);
  }

  private scrambleStep(now: number, el: HTMLElement, left: number) {
    const target = this.pointFor(el);
    const k = 1 / left;
    const to = { x: this.pos.x + (target.x - this.pos.x) * k, y: this.pos.y + (target.y - this.pos.y) * k };
    this.startHop(now, left === 1 ? target : to, {
      height: (this.mobile ? 22 : 34) + Math.random() * 10,
      duration: 260,
      scramble: true,
      chain: { left: left - 1, el },
    });
  }

  private land(now: number, hop: Hop | null) {
    if (hop) this.pos = { ...hop.to };
    this.hop = null;
    this.landedAt = now;
    if (!this.sleeping) this.state = "idle";
    // The page may have moved on while he was in the air.
    this.dirty = true;
    // A bubble that started mid-hop gets a fresh spot that clears the fields here.
    if (this.bubble.dataset["show"] !== undefined) {
      this.chooseBubbleSpot();
      this.placeBubble();
    }
    this.scene?.wiggleBow();
    if (hop?.chain && hop.chain.left > 0) {
      this.scrambleStep(now, hop.chain.el, hop.chain.left);
      return;
    }
    if (hop?.quirk) this.wobbleUntil = now + 950;
    if (hop?.float) {
      this.dropRaft();
      this.burst(this.pos, 8, 0.8);
    } else if (hop) {
      this.puff(hop.to);
    }

    if (this.opts.intro && !this.introduced) {
      this.introduced = true;
      INTRO.forEach((line, i) => this.say(line, i === 0 ? "wink" : "happy"));
    }
    if (this.celebratePending) {
      this.celebratePending = false;
      window.setTimeout(() => {
        this.celebrate(performance.now());
        this.say("Your first gift. I'm so proud.", "love");
      }, 300);
    }
    const perch = this.perchEl;
    if (perch && perch !== this.focusEl) {
      const line = perch.dataset["boSay"];
      if (line && !this.said.has(perch)) {
        this.said.add(perch);
        this.say(line);
      }
      const point = Number(perch.dataset["boPoint"] ?? 0);
      if (point && !this.action) this.action = { kind: "point", start: now, dur: 1800, dir: Math.sign(point) };
    }
  }

  /* ---------- Show / hide ---------- */

  private show() {
    this.visible = true;
    this.el.style.transition = "opacity 200ms ease";
    this.el.style.opacity = "1";
    this.hitbox.style.pointerEvents = "auto";
  }

  private hide() {
    this.visible = false;
    this.hop = null;
    this.fling = null;
    this.state = "hidden";
    this.clearSpeech();
    this.raft?.remove();
    this.raft = null;
    this.el.style.transition = "opacity 260ms ease";
    this.el.style.opacity = "0";
    this.hitbox.style.pointerEvents = "none";
  }

  /* ---------- Paper note raft for the first float-down ---------- */

  private makeRaft() {
    this.raft?.remove();
    const raft = document.createElement("div");
    Object.assign(raft.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "66px",
      height: "40px",
      borderRadius: "8px",
      backgroundColor: "#FFE8B0",
      backgroundImage: "repeating-linear-gradient(transparent 0 11px, rgba(185,169,161,.55) 11px 13px)",
      backgroundPosition: "0 6px",
      boxShadow: "0 8px 18px -10px rgba(43,37,34,.45)",
      willChange: "transform, opacity",
    });
    const tape = document.createElement("span");
    Object.assign(tape.style, {
      position: "absolute",
      left: "22px",
      top: "-6px",
      width: "22px",
      height: "10px",
      background: "rgba(251,211,220,.85)",
      transform: "rotate(-6deg)",
      borderRadius: "2px",
    });
    raft.appendChild(tape);
    this.layer.appendChild(raft);
    this.raft = raft;
  }

  private placeRaft(sway: number) {
    if (!this.raft) return;
    this.raft.style.transform = `translate3d(${(this.pos.x - 33).toFixed(1)}px, ${(this.pos.y - 6).toFixed(1)}px, 0) rotate(${(sway * 9).toFixed(2)}deg)`;
  }

  private dropRaft() {
    const raft = this.raft;
    this.raft = null;
    if (!raft) return;
    const base = raft.style.transform;
    const anim = raft.animate(
      [
        { transform: base, opacity: 1 },
        { transform: `${base} translate(70px, 26px) rotate(24deg)`, opacity: 0 },
      ],
      { duration: 700, easing: "cubic-bezier(.3,.6,.4,1)" },
    );
    anim.onfinish = () => raft.remove();
  }

  /* ---------- Confetti (DOM, transform/opacity only) ---------- */

  private headPoint(): Point {
    return { x: this.pos.x, y: this.pos.y - this.el.offsetHeight * 0.55 };
  }

  private puff(at: Point) {
    const [lo, hi] = TUNING.confettiBits;
    this.burst(at, lo + Math.floor(Math.random() * (hi - lo + 1)), 0.6);
  }

  private burst(at: Point, n: number, power = 1) {
    if (this.reduce) return;
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
      const small = power < 1;
      const a = small ? (i % 2 === 0 ? -1 : 1) * (0.3 + Math.random() * 0.9) : (Math.random() - 0.5) * Math.PI * 1.6;
      const spd = (small ? 26 + Math.random() * 14 : 50 + Math.random() * 60) * power;
      const dx = Math.sin(a) * spd * (small ? 1 : 1.4);
      const dy = -Math.cos(a) * spd - (small ? 8 : 20);
      const rot = (Math.random() - 0.5) * 540;
      const anim = bit.animate(
        [
          { transform: "translate(-50%, 0) rotate(0deg)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), ${dy}px) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx * 1.3}px), ${dy + 30 * power + 10}px) rotate(${rot}deg)`, opacity: 0 },
        ],
        { duration: (small ? 620 : 900) + Math.random() * 200, easing: "cubic-bezier(.2,.7,.4,1)" },
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
    this.placeBubble();
  }

  private applyAccessory() {
    const onPerch = (this.perchEl?.dataset["boAccessory"] as BoAccessory | undefined) || null;
    const want = this.hoverAccessory ?? onPerch ?? this.pageAccessory;
    if (want === this.wornAccessory || !this.scene) return;
    this.wornAccessory = want;
    this.scene.setAccessory(want);
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.lastFrame ? Math.min(0.05, (now - this.lastFrame) / 1000) : 0.016;
    this.lastFrame = now;
    this.velocity *= 0.92;
    this.pickPerch(now);

    const pose: Partial<BoPose> = { squash: 1, tuck: 0, flail: 0, run: 0, flip: 0, lean: 0, turn: null, lid: 0, cheer: 0, point: 0, bowSpin: 0, hold: 0 };
    let lift = 0;
    const hop = this.hop;

    if (this.press?.moved) {
      // Dangling from the pointer, legs kicking.
      pose.flail = 0.7;
      pose.run = 0.8;
      pose.squash = 1.06;
      pose.lean = Math.sin(now / 90) * 0.12;
    } else if (this.fling) {
      this.stepFling(now, dt, pose);
    } else if (hop) {
      const elapsed = now - hop.start;
      const antic = hop.scramble || hop.float ? 0 : TUNING.anticipationMs;
      if (elapsed < antic) {
        // Anticipation: crouch before the jump.
        pose.squash = 1 - 0.22 * Math.sin((elapsed / antic) * (Math.PI / 2));
      } else {
        const s = clamp01((elapsed - antic) / hop.duration);
        if (hop.float) {
          // Gently down on the paper note, swaying.
          const e = easeOut(s);
          const sway = Math.sin(s * Math.PI * 3) * (1 - s);
          this.pos = { x: hop.from.x + (hop.to.x - hop.from.x) * e + sway * 26, y: hop.from.y + (hop.to.y - hop.from.y) * e };
          pose.lean = sway * 0.18;
          pose.cheer = 0.5 * (1 - s);
          this.placeRaft(sway);
        } else {
          const e = hop.scramble ? s : easeInOut(s) * 0.35 + s * 0.65;
          this.pos = { x: hop.from.x + (hop.to.x - hop.from.x) * e, y: hop.from.y + (hop.to.y - hop.from.y) * e };
          lift = 4 * hop.height * s * (1 - s);
          // Stretched on the way up and down, round at the top.
          pose.squash = hop.scramble ? 1 : 1 + 0.16 * Math.abs(2 * s - 1) * Math.sin(Math.PI * Math.min(1, s * 1.4));
          pose.tuck = hop.scramble ? 0.2 : Math.sin(Math.PI * s);
          pose.run = hop.scramble ? 1 : 0;
          pose.flail = hop.scramble ? 0.5 : 0;
          if (hop.flip) pose.flip = -Math.PI * 2 * easeInOut(s);
          if (hop.backward) pose.flip = (pose.flip ?? 0) + 0.28 * Math.sin(Math.PI * s);
          const dx = hop.to.x - hop.from.x;
          pose.turn = Math.abs(dx) > 30 ? Math.sign(dx) * 0.55 * Math.sin(Math.PI * s) : null;
        }
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
      // A little bob with each keystroke.
      const bob = (now - this.bobAt) / 160;
      if (bob < 1 && !this.reduce) pose.squash = (pose.squash ?? 1) * (1 - 0.09 * Math.sin(Math.PI * bob));
      // Stay glued to the perch (inner scroll areas, layout shifts).
      if (this.perchEl?.isConnected && !this.press) this.pos = this.pointFor(this.perchEl);
      // Doze off after a while with nothing happening.
      if (!this.sleeping && !this.action && this.visible && now - this.lastInput > TUNING.sleepAfterMs) this.sleep(now);
      if (this.sleeping && !this.action) {
        pose.squash = 1 - 0.03 * (1 + Math.sin(now / 700));
        pose.lean = 0.08;
      }
    }

    lift += this.applyAction(now, pose);

    // Eyes follow the pointer, relative to where Bo is on screen.
    if (this.pointer && this.visible && !this.sleeping) {
      const head = this.headPoint();
      pose.look = [
        Math.max(-1, Math.min(1, (this.pointer.x + window.scrollX - head.x) / 260)),
        Math.max(-1, Math.min(1, (this.pointer.y + window.scrollY - head.y) / 260)),
      ];
    }

    this.applyAccessory();
    this.scene?.setPose(pose);
    this.updateClip();
    if (this.visible || hop) this.place(lift);
  };

  private stepFling(now: number, dt: number, pose: Partial<BoPose>) {
    const f = this.fling!;
    f.vy += TUNING.gravity * dt;
    let x = this.pos.x + f.vx * dt;
    let y = this.pos.y + f.vy * dt;
    const h = this.el.offsetHeight;
    const left = window.scrollX + 30;
    const right = window.scrollX + window.innerWidth - 30;
    const top = window.scrollY + h * 0.85;
    const bottom = window.scrollY + (window.visualViewport?.height ?? window.innerHeight) - 6;
    if (x < left || x > right) {
      x = x < left ? left : right;
      f.vx = -f.vx * TUNING.bounce;
      this.scene?.wiggleBow();
    }
    if (y < top) {
      y = top;
      f.vy = -f.vy * TUNING.bounce;
    }
    if (y > bottom) {
      y = bottom;
      f.vy = -f.vy * TUNING.bounce;
      f.vx *= 0.8;
      if (Math.abs(f.vy) > 200) this.scene?.wiggleBow();
      if (Math.abs(f.vy) < 160 && !f.restAt) f.restAt = now;
    }
    this.pos = { x, y };
    pose.flip = (x - left) / 60;
    pose.flail = 1;
    pose.tuck = 0.5;
    if ((f.restAt && now - f.restAt > 300) || now - f.start > 2400) {
      this.scene?.setFace("surprised", 700);
      this.goHome(now);
    }
  }

  /** Fade out while his perch is scrolled out of its scroll box. */
  private updateClip() {
    if (!this.visible || this.hop || this.press || this.fling) return;
    let out = false;
    if (this.clipEl?.isConnected) {
      // Vertical only: focused fields put him beside their scroll box on purpose.
      const r = this.clipEl.getBoundingClientRect();
      const vy = this.pos.y - window.scrollY;
      out = vy < r.top + 10 || vy > r.bottom + 4;
    }
    if (out === this.clipped) return;
    this.clipped = out;
    this.el.style.opacity = out ? "0" : "1";
    this.hitbox.style.pointerEvents = out ? "none" : "auto";
    if (out) this.clearSpeech();
  }

  /** Timed reactions layered onto the pose. Returns extra lift in px for hops in place. */
  private applyAction(now: number, pose: Partial<BoPose>): number {
    const a = this.action;
    if (!a) return 0;
    const s = clamp01((now - a.start) / a.dur);
    const bump = Math.sin(Math.PI * s);
    let lift = 0;
    switch (a.kind) {
      case "lidpop":
        pose.lid = 1.25 * Math.sin(Math.PI * Math.min(1, s * 1.15));
        pose.squash = (pose.squash ?? 1) * (1 - 0.12 * Math.sin(Math.PI * Math.min(1, s * 3)));
        pose.cheer = bump * 0.7;
        break;
      case "dizzy":
        this.scene?.setFace("dizzy", 300);
        pose.bowSpin = 2.2 * (1 - s * 0.6);
        pose.lean = Math.sin(now / 160) * 0.22 * (1 - s);
        pose.turn = Math.sin(now / 240) * 0.4 * (1 - s);
        break;
      case "wrap":
        // Pull the ribbon tight, spin into a neat package, take a bow.
        if (s < 0.3) {
          const k = s / 0.3;
          pose.cheer = Math.sin(Math.PI * k);
          pose.squash = 1 - 0.18 * Math.sin(Math.PI * k);
          if (k > 0.5 && k < 0.6) this.scene?.wiggleBow();
        } else if (s < 0.72) {
          const k = (s - 0.3) / 0.42;
          pose.turn = easeInOut(k) * Math.PI * 2;
          pose.squash = 1 + 0.08 * Math.sin(Math.PI * k);
          lift = 26 * Math.sin(Math.PI * k);
        } else {
          pose.flip = 0.38 * Math.sin(Math.PI * ((s - 0.72) / 0.28));
          this.scene?.setFace("happy", 400);
        }
        break;
      case "bam":
        pose.cheer = 1;
        pose.squash = 1 + 0.18 * bump;
        this.scene?.setFace("surprised", 300);
        break;
      case "hug":
        pose.hold = 1;
        pose.squash = 1 - 0.05 * bump;
        this.scene?.setFace("love", 300);
        break;
      case "cheer":
        pose.cheer = bump;
        pose.squash = 1 + 0.1 * bump;
        lift = 18 * bump;
        break;
      case "point":
        pose.point = (a.dir ?? 1) * Math.min(1, bump * 2);
        break;
      case "yawn":
        pose.cheer = 0.55 * bump;
        pose.squash = 1 + 0.06 * bump;
        break;
      case "wake":
        pose.squash = 1 + 0.15 * bump;
        pose.flail = bump;
        lift = 34 * bump;
        break;
    }
    if (this.reduce) lift = 0;
    if (s >= 1) {
      this.endAction();
      if (!this.sleeping && this.state !== "hidden") this.state = "idle";
      this.dirty = true;
    }
    return lift;
  }
}
