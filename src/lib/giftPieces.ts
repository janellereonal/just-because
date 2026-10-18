/**
 * Shared data shaping for the tile-style formats (Bento, Gift Hunt, Zine).
 * Turns a gift's approved notes into one flat list of "pieces", adds friendly
 * samples for previews, and has the small hooks those views share.
 */
import { sampleLetter } from "@/copy/strings";
import { countdownTarget, formatDay, localToday, momentOf } from "@/lib/time";
import { isNewSection, sectionAsText } from "@/lib/sections";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePlaceholderName } from "@/components/SampleMark";
import {
  defaultTitles,
  signedMediaUrl,
  type CalendarEntry,
  type GiftSite,
  type ModuleType,
  type SiteModule,
  type ViewContribution,
} from "@/lib/gift";

export type PieceKind = "letter" | "photo" | "song" | "voice" | "word" | "ornament" | "calendar";

export type Piece = {
  id: string;
  kind: PieceKind;
  author: string;
  text: string | null;
  media: string | null;
  link: string | null;
  /** Only the recipient can read it, and this viewer isn't them. */
  sealed: boolean;
  mine: boolean;
  /** A photobooth photo with its frame and words drawn in: show it whole, never cropped. */
  framed?: boolean;
  /** A 400 px copy of a photo, for grids and previews. */
  thumb?: string;
  /** Calendar pieces: the day they unlock. */
  date?: string;
  /** Calendar pieces the server is still keeping shut (no content sent yet). */
  locked?: boolean;
  sample?: boolean;
  /** The section it came from (letters, coupons, superlatives...), for layouts that group by section. */
  section?: string;
  /** The newer sections' own fields (award, place, coupon title...). Never set on sealed pieces. */
  data?: Record<string, unknown>;
};

const KIND: Record<ModuleType, PieceKind | null> = {
  letters: "letter",
  photobooth: "photo",
  songs: "song",
  voice: "voice",
  wordcloud: "word",
  tree: "ornament",
  calendar: "calendar",
  countdown: null,
  // Newer sections show as notes (or a picture for doodles); video and quiz get their own block.
  openwhen: "letter",
  capsule: "letter",
  superlatives: "letter",
  map: "letter",
  coupons: "letter",
  doodle: "photo",
  video: null,
  quiz: null,
};

/** A gift moment in ms: an ISO instant, or a date's midnight in the viewer's zone. */
export const giftMoment = momentOf;

/** Today in the viewer's zone (calendar doors open at their local midnight). */
export const giftToday = localToday;

/** A calendar door that isn't open yet: its day hasn't come here, or the server is still keeping it shut. */
export function pieceLocked(p: Pick<Piece, "kind" | "date" | "locked">) {
  return p.kind === "calendar" && (!!p.locked || (!!p.date && p.date > giftToday()));
}

export function useCountdown(date: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!date) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [date]);
  if (!date) return null;
  const s = Math.max(0, Math.floor((giftMoment(date) - now) / 1000));
  return {
    done: s === 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

export function useMediaUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void signedMediaUrl(path).then((next) => alive && setUrl(next));
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}

export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduce(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  return reduce;
}

function samples(name: string, enabled: Set<ModuleType>, solo = false, kind = "default"): Piece[] {
  const base = { media: null, link: null, sealed: false, mine: false, sample: true };
  const out: Piece[] = [];
  if (enabled.has("letters"))
    out.push(
      {
        ...base,
        id: "s-l1",
        kind: "letter",
        author: "Sam",
        text: sampleLetter(kind, 0, name),
      },
      {
        ...base,
        id: "s-l2",
        kind: "letter",
        author: "Alex",
        text: sampleLetter(kind, 1),
      },
      {
        ...base,
        id: "s-l3",
        kind: "letter",
        author: "Bea",
        text: sampleLetter(kind, 2),
      },
    );
  if (enabled.has("photobooth"))
    out.push(
      { ...base, id: "s-p1", kind: "photo", author: "Jo", text: "That beach day" },
      { ...base, id: "s-p2", kind: "photo", author: "Mika", text: "Us, being us" },
    );
  if (enabled.has("songs"))
    out.push({ ...base, id: "s-s1", kind: "song", author: "Lia", text: "This one is so you." });
  if (enabled.has("voice"))
    out.push({ ...base, id: "s-v1", kind: "voice", author: "Dad", text: "A little voice note" });
  if (enabled.has("wordcloud"))
    for (const [i, w] of ["kind", "funny", "brave", "home"].entries())
      out.push({ ...base, id: `s-w${i}`, kind: "word", author: "Friends", text: w });
  if (solo) for (const p of out) p.author = "You";
  if (enabled.has("tree"))
    out.push({
      ...base,
      id: "s-o1",
      kind: "ornament",
      author: "Nina",
      text: "A wish hung just for you.",
    });
  return out;
}

/** All pieces in a stable, nicely mixed order (photos spread between notes). */
export function usePieces({
  site,
  modules,
  contributions,
  calendarEntries = [],
  sample = false,
}: {
  site: GiftSite;
  modules: SiteModule[];
  contributions: ViewContribution[];
  calendarEntries?: CalendarEntry[] | undefined;
  sample?: boolean | undefined;
}) {
  const placeholder = usePlaceholderName();
  const kind = useContext(GiftKindContext);
  return useMemo(() => {
    const enabled = new Set(modules.filter((m) => m.enabled).map((m) => m.module_type));
    const real = site.custom_text.recipient_name?.trim() ?? "";
    // "Ana" only as a labeled placeholder in the editor; anywhere else, no name at all.
    const nameIsSample = !real && placeholder && !!sample;
    const named = !!real || nameIsSample;
    const name = real || (nameIsSample ? "Ana" : "you");
    // A note this viewer wrote shows unsealed; drop its sealed twin.
    const mineIds = new Set(contributions.filter((c) => c.mine && !c.sealed).map((c) => c.id));
    let pieces: Piece[] = contributions
      .filter(
        (c) =>
          enabled.has(c.module_type) && !(c.sealed && mineIds.has(c.id.replace(/^sealed-/, ""))),
      )
      .flatMap((c) => {
        const kind = KIND[c.module_type];
        if (!kind) return [];
        return [
          {
            id: c.id,
            kind,
            author: c.author_name,
            text: isNewSection(c.module_type) ? sectionAsText(c.module_type, c.data, c.text_content, (iso) => formatDay(iso)) : c.text_content,
            media: c.sealed || (c.module_type !== "doodle" && isNewSection(c.module_type)) ? null : c.media_url,
            link: c.external_link,
            // Ornaments the server holds back until the tree's reveal date show sealed too.
            sealed: !!c.sealed || !!c.locked,
            mine: !!c.mine,
            section: c.module_type,
            ...(!c.sealed && isNewSection(c.module_type) && c.data ? { data: c.data as Record<string, unknown> } : {}),
            ...(c.module_type === "photobooth" && c.data?.["framed"] === true ? { framed: true } : {}),
            ...(c.module_type === "photobooth" && !c.sealed && typeof c.data?.["thumb"] === "string" ? { thumb: c.data["thumb"] as string } : {}),
          } satisfies Piece,
        ];
      });
    if (enabled.has("calendar"))
      pieces = pieces.concat(
        calendarEntries.map((e) => ({
          id: e.id,
          kind: "calendar" as const,
          author: "",
          text: e.text_content,
          media: e.media_url,
          link: e.external_link,
          sealed: false,
          mine: false,
          date: e.entry_date.slice(0, 10),
          ...(e.locked ? { locked: true } : {}),
          section: "calendar",
        })),
      );
    if (!pieces.length && sample) pieces = samples(named ? name : "", enabled, site.solo, kind);

    // Interleave: notes, then a photo, then a song… so tiles feel varied.
    const buckets = new Map<PieceKind, Piece[]>();
    for (const p of pieces) buckets.set(p.kind, [...(buckets.get(p.kind) ?? []), p]);
    const order: PieceKind[] = [
      "letter",
      "photo",
      "song",
      "letter",
      "voice",
      "photo",
      "ornament",
      "calendar",
    ];
    const mixed: Piece[] = [];
    while (mixed.length < pieces.length) {
      for (const k of order) {
        const next = buckets.get(k)?.shift();
        if (next) mixed.push(next);
      }
      // Words stay together; they make one cloud tile.
      if (![...buckets.entries()].some(([k, v]) => k !== "word" && v.length)) {
        mixed.push(...(buckets.get("word") ?? []));
        buckets.set("word", []);
      }
    }
    const titles = { ...defaultTitles(site.custom_text, "default", site.occasion), ...site.custom_text };
    const countdownDate =
      enabled.has("countdown") && (countdownTarget(site) || sample)
        ? (countdownTarget(site) ?? new Date(Date.now() + 12 * 86400000).toISOString())
        : null;
    const friends = [...new Set(pieces.filter((p) => p.author && !p.sample).map((p) => p.author))];
    return {
      name,
      /** No recipient yet, so `name` is the sample "Ana" (shown faded with a "sample" tag). */
      nameIsSample,
      /** False when there's no name to show (old gifts): `name` is then "you". */
      named,
      titles,
      countdownDate,
      notes: mixed.filter((p) => p.kind !== "word"),
      words: mixed.filter((p) => p.kind === "word"),
      friends,
      isSample: pieces.some((p) => p.sample),
    };
  }, [site, modules, contributions, calendarEntries, sample, placeholder, kind]);
}

/** A soft mesh gradient from a gift palette, for backgrounds. */
export function meshGradient(primary: string, accent: string, background: string) {
  return [
    `radial-gradient(60% 50% at 12% 8%, ${accent}55 0%, transparent 70%)`,
    `radial-gradient(50% 45% at 92% 18%, ${primary}33 0%, transparent 70%)`,
    `radial-gradient(55% 50% at 70% 96%, ${accent}40 0%, transparent 70%)`,
    `radial-gradient(45% 40% at 4% 88%, ${primary}26 0%, transparent 70%)`,
    background,
  ].join(", ");
}

/** The occasion of the gift being shown, so sample notes can match it. Set by FormatView. */
export const GiftKindContext = createContext<string>("default");
