/**
 * The recipient's thank-you to everyone (flag thankYou).
 *
 * - `SayThanks`: at the end of the gift page, the recipient writes one note back.
 *   The device that sent it keeps a random key in localStorage and can edit it.
 * - `ThanksNote`: how the note looks on a friend's link.
 * - `OwnerThanks`: the organiser's view on the dashboard, with a way to take it down.
 *
 * Stored on the gift (see sendThanks in src/lib/api.ts), so no new table and no emails yet.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Heart } from "lucide-react";
import { clearThanks, sendThanks } from "@/lib/api";
import type { GiftSite } from "@/lib/gift";
import { formatDay } from "@/lib/time";
import { readableInk, readableOn, surfaceColor } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";
import { trackEvent } from "@/lib/track";
import { THANKS_COPY as C } from "@/copy/strings";
import { isFlagOn } from "@/config/flags";

const keyName = (siteId: string) => `jb-thanks-key:${siteId}`;

function readKey(siteId: string): string | null {
  try {
    return localStorage.getItem(keyName(siteId));
  } catch {
    return null;
  }
}

function makeKey(siteId: string): string {
  const existing = readKey(siteId);
  if (existing) return existing;
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const key = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  try {
    localStorage.setItem(keyName(siteId), key);
  } catch {
    // Private mode: it still sends, it just can't be edited later from here.
  }
  return key;
}

function errorText(e: unknown) {
  const msg = e instanceof Error ? e.message : "";
  return msg && msg.length < 160 ? msg : C.failed;
}

/** The gift page's "Say thanks to everyone", for the recipient. */
export function SayThanks({
  site,
  palette,
  contributors,
  isOwner,
}: {
  site: GiftSite;
  palette: Palette;
  /** How many different people added something, for the intro line. */
  contributors: number;
  isOwner: boolean;
}) {
  const reduce = useReducedMotion();
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<{ text: string; at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stored = site.custom_text.thanks_text ? { text: site.custom_text.thanks_text, at: site.custom_text.thanks_at ?? "" } : null;
  const current = sent ?? stored;

  useEffect(() => {
    setMine(!!readKey(site.id) && !!stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id]);

  if (!isFlagOn("thankYou") || isOwner || site.solo) return null;
  // Someone else (another device) already said thanks: nothing to do here.
  if (current && !mine && !sent) return null;

  const ink = readableInk(palette.background);
  const surface = surfaceColor(palette.background);
  const accent = readableOn(palette.background, palette.accent, 3);
  const onAccent = readableInk(palette.accent);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await sendThanks({ data: { siteId: site.id, text: text.trim(), key: makeKey(site.id) } });
      setSent({ text: text.trim(), at: r.at });
      setMine(true);
      setOpen(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const name = site.custom_text.recipient_name?.trim() ?? "";

  return (
    <section className="mx-auto max-w-xl px-5 pt-4 pb-10" style={{ color: ink }} aria-label={C.title}>
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.form
            key="form"
            onSubmit={send}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="rounded-[24px] p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,.45)] sm:p-6"
            style={{ background: surface }}
          >
            <h2 className="text-xl font-semibold">{C.title}</h2>
            <p className="mt-1 text-sm opacity-75 text-pretty">{C.intro(contributors)}</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 600))}
              placeholder={C.placeholder}
              rows={5}
              autoFocus
              className="mt-4 w-full resize-y rounded-2xl p-3.5 text-[15px] leading-relaxed outline-none focus-visible:ring-2"
              style={{ background: palette.background, color: ink, border: `1px solid ${ink}22`, ["--tw-ring-color" as string]: `${accent}66` }}
              aria-label={C.title}
            />
            <div className="mt-1 text-right text-xs tabular-nums opacity-55">{[...text].length} / 600</div>
            {error ? <p className="mt-2 text-sm" role="alert" style={{ color: accent }}>{error}</p> : null}
            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm opacity-75 hover:opacity-100">
                {C.cancel}
              </button>
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className="rounded-full px-5 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ background: palette.accent, color: onAccent }}
              >
                {busy ? C.sending : C.send}
              </button>
            </div>
          </motion.form>
        ) : current ? (
          <motion.div
            key="sent"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <ThanksNote name={name} text={current.text} at={current.at} palette={palette} label={sent ? C.sentTitle : C.yours} />
            <p className="mt-3 text-sm opacity-75">{C.sentBody}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  setText(current.text);
                  setOpen(true);
                }}
                className="rounded-full px-4 py-2 opacity-80 ring-1 hover:opacity-100"
                style={{ ["--tw-ring-color" as string]: `${ink}30` }}
              >
                {C.edit}
              </button>
            </div>
            <MakeOne siteId={site.id} accent={accent} />
          </motion.div>
        ) : (
          <motion.div key="cta" initial={false} animate={{ opacity: 1 }} className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-medium shadow-[0_14px_30px_-18px_rgba(0,0,0,.6)] transition-transform active:scale-[.97]"
              style={{ background: palette.accent, color: onAccent }}
            >
              <Heart className="size-4 transition-transform group-hover:scale-110" aria-hidden="true" />
              {C.button}
            </button>
            <p className="mt-2 max-w-xs text-xs opacity-65 text-pretty">{C.intro(contributors)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function MakeOne({ siteId, accent }: { siteId: string; accent: string }) {
  return (
    <p className="mt-6 text-sm">
      <span className="opacity-70">{C.makeOneLine} </span>
      <a
        href="/"
        onClick={() => trackEvent("make_your_own_clicked", siteId, { source: "gift_footer" })}
        className="font-medium underline underline-offset-4"
        style={{ color: accent }}
      >
        {C.makeOne}
      </a>
    </p>
  );
}

/** The thank-you as a little card, in the gift's colors. */
export function ThanksNote({
  name,
  text,
  at,
  palette,
  label,
}: {
  name: string;
  text: string;
  at?: string | undefined;
  palette: Palette;
  label?: string;
}) {
  const ink = readableInk(palette.background);
  const accent = readableOn(palette.background, palette.accent, 3);
  return (
    <figure
      className="relative mx-auto max-w-md rounded-[22px] p-5 text-left shadow-[0_18px_40px_-28px_rgba(0,0,0,.5)]"
      style={{ background: surfaceColor(palette.background), color: ink }}
    >
      <span
        className="absolute -top-3 left-5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase"
        style={{ background: palette.accent, color: readableInk(palette.accent) }}
      >
        <Heart className="size-3" aria-hidden="true" />
        {label ?? C.from(name)}
      </span>
      <blockquote className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">{text}</blockquote>
      <figcaption className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium" style={{ color: accent }}>
          {name}
        </span>
        {at ? (
          <span className="opacity-55" suppressHydrationWarning>
            {C.sentOn(formatDay(at))}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/** On the dashboard card: what the recipient wrote, and a way to take it down. */
export function OwnerThanks({ site, onRemoved }: { site: GiftSite; onRemoved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const text = site.custom_text.thanks_text;
  if (!isFlagOn("thankYou") || !text) return null;
  const name = site.custom_text.recipient_name?.trim() ?? "";
  return (
    <div className="mt-3 rounded-2xl bg-accent/8 p-3 text-sm">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
        <Heart className="size-3.5" aria-hidden="true" />
        {C.ownerTitle(name)}
      </p>
      <p className="mt-1 line-clamp-3 text-pretty text-ink/80">{text}</p>
      <div className="mt-1.5 flex items-center justify-end gap-2 text-xs">
        {confirming ? (
          <>
            <span className="text-ink/60">{C.removeConfirm}</span>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await clearThanks({ data: { siteId: site.id } });
                  onRemoved();
                } finally {
                  setBusy(false);
                  setConfirming(false);
                }
              }}
              className="font-medium text-accent underline underline-offset-2"
            >
              {C.remove}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-ink/60">
              {C.cancel}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="text-ink/55 hover:text-ink/80">
            {C.remove}
          </button>
        )}
      </div>
    </div>
  );
}
