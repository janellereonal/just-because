/**
 * Feature flags. Every new user-facing feature starts behind one, OFF in
 * production until it's turned on. On in dev, so it can be built and tested.
 *
 * Turn one on in production by setting VITE_FLAGS in Vercel (a comma list,
 * for example VITE_FLAGS=birthdayAge) and redeploying.
 *
 * New themes don't need a flag here: they're seeded as drafts, so only admins
 * see them until they're published in /admin (Theme library).
 */
export const FLAGS = {
  /** "Turning" on birthday gifts: the cake shows the real age in candles. */
  birthdayAge: "birthdayAge",
  /** A short guide before a new organiser's first gift, on /create. */
  newUserGuide: "newUserGuide",
  /** Photobooth: take a photo with the camera, pick a frame and write a message on it. */
  photoboothCamera: "photoboothCamera",
  /** The Handwritten format (a notebook of notes and doodles) in the format pickers. */
  handwrittenFormat: "handwrittenFormat",
  /** "Want us to handle it?" concierge requests on /create and in the editor. */
  concierge: "concierge",
  /** Styles and occasions: the new /create (from, for, occasion, style, sections) and Style in the editor. */
  styles: "styles",
} as const;

export type FlagName = keyof typeof FLAGS;

function enabledList(): string[] {
  const raw = (import.meta.env["VITE_FLAGS"] as string | undefined) ?? "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function isFlagOn(name: FlagName): boolean {
  if (import.meta.env.DEV) return true;
  return enabledList().includes(FLAGS[name]);
}
