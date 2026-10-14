/**
 * Tiny event bus so any page can nudge the hopping Bo without importing three.js
 * or the controller. If no Bo is on the page, these calls quietly do nothing.
 *
 *   boSay("Ooh, cute name.");
 *   boAccessory("party_hat");
 *   await boWrap();   // resolves within ~1s, or right away when Bo isn't around
 */
import type { BoAccessory } from "@/lib/bo3d/accessories";

export type BoBusFace = "wink" | "happy" | "surprised" | "love" | "blep";

export type BoEvent =
  | { type: "say"; text: string; face?: BoBusFace }
  | { type: "accessory"; name: BoAccessory | null }
  | { type: "react"; kind: "bam" | "hug" | "wave" | "cheer" | "celebrate" }
  | { type: "wrap"; done: () => void };

const EVENT = "jb:bo";

function emit(detail: BoEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<BoEvent>(EVENT, { detail }));
}

export function onBoEvent(handler: (event: BoEvent) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<BoEvent>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** True while a hopping Bo is listening (set by the controller). */
let listening = 0;
export function setBoListening(on: boolean) {
  listening += on ? 1 : -1;
}

export const boSay = (text: string, face?: BoBusFace) => emit({ type: "say", text, ...(face ? { face } : {}) });
export const boAccessory = (name: BoAccessory | null) => emit({ type: "accessory", name });
export const boReact = (kind: "bam" | "hug" | "wave" | "cheer" | "celebrate") => emit({ type: "react", kind });

/** Bo wraps himself up and takes a bow. Never takes longer than `maxMs`. */
export function boWrap(maxMs = 950): Promise<void> {
  if (listening <= 0 || typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, maxMs);
    emit({
      type: "wrap",
      done: () => {
        window.clearTimeout(timer);
        resolve();
      },
    });
  });
}

/* First gift: /create marks it, the editor's Bo celebrates once. */
const FIRST_KEY = "jb:bo:first-gift";
const CELEBRATE_KEY = "jb:bo:celebrate";

export function markGiftCreated() {
  try {
    if (localStorage.getItem(FIRST_KEY)) return;
    localStorage.setItem(FIRST_KEY, "1");
    sessionStorage.setItem(CELEBRATE_KEY, "1");
  } catch {
    // Storage blocked: no party, no problem.
  }
}

export function takeCelebration() {
  try {
    if (!sessionStorage.getItem(CELEBRATE_KEY)) return false;
    sessionStorage.removeItem(CELEBRATE_KEY);
    return true;
  } catch {
    return false;
  }
}
