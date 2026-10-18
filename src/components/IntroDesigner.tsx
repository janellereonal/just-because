import { isFlagOn } from "@/config/flags";
import { useRef, useState } from "react";
import { t } from "@/i18n";
import { CharCount } from "@/components/ui/CharCount";
import { LIMITS } from "@/lib/limits";
import { ImagePlus, Loader2, RotateCcw, Shuffle, Undo2, X } from "lucide-react";
import { STICKER_COPY } from "@/copy/strings";
import { toast } from "sonner";
import { themeStillUrl } from "@/components/Theme3D";
import { HERO_WORD } from "@/components/GiftIntro";
import { uploadFile } from "@/lib/upload";
import { THEME_KINDS, type ThemeKind } from "@/lib/themeKind";
import {
  INTRO_COPY,
  MAX_INTRO_STICKERS,
  STICKER_EMOJIS,
  type IntroBurst,
  type IntroSettings,
  type IntroSticker,
  type IntroStyle,
} from "@/lib/intro";
import type { Palette } from "@/lib/themes";

const HERO_EMOJIS = ["🎂", "💝", "🧸", "🌷", "🐶", "🐱", "🎁", "🦄", "🍓", "🌙", "🥂", "🏝️"];
const BURSTS: { id: IntroBurst; label: string; glyph: string }[] = [
  { id: "confetti", label: "Confetti", glyph: "🎊" },
  { id: "hearts", label: "Hearts", glyph: "💗" },
  { id: "stars", label: "Stars", glyph: "⭐" },
  { id: "bubbles", label: "Bubbles", glyph: "🫧" },
  { id: "petals", label: "Petals", glyph: "🌸" },
];

const field =
  "mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent";
const chip = (on: boolean) =>
  `squish rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${on ? "bg-ink text-cream ring-ink" : "bg-cream ring-line hover:bg-pink/40"}`;

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 rounded-xl bg-cream px-2.5 py-2 ring-1 ring-line">
      <span
        className="relative size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-ink/10"
        style={{ background: value ?? fallback }}
      >
        <input
          type="color"
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label={label}
        />
      </span>
      <span className="min-w-0 flex-1 text-xs">
        <span className="block font-medium">{label}</span>
        <span className="text-muted">{value ? value : "From your colors"}</span>
      </span>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-xs text-muted underline"
        >
          Reset
        </button>
      ) : null}
    </label>
  );
}

const newId = () => Math.random().toString(36).slice(2, 10);

/** Spots around the edges, so stickers frame the opening instead of covering it. */
function freeSpot(i: number) {
  const spots = [
    [0.14, 0.14],
    [0.86, 0.2],
    [0.12, 0.62],
    [0.88, 0.58],
    [0.2, 0.9],
    [0.8, 0.9],
    [0.5, 0.06],
    [0.9, 0.38],
  ] as const;
  const [x, y] = spots[i % spots.length]!;
  return { x, y, r: Math.round((Math.random() - 0.5) * 30), s: 1 };
}

/**
 * The editor's Intro panel: the opening's object, stickers, background, colors
 * and words. Changes show live in the canvas and save on their own.
 */
export function IntroDesigner({
  siteId,
  settings,
  onChange,
  palette,
  kind,
  introStyle,
  greeting,
  offers = [],
  badgeHint,
  onUndoStickers,
}: {
  /** Undo the last sticker change (shown when there is one). */
  onUndoStickers?: (() => void) | undefined;
  /** The label the opening shows when the line on top is empty (the occasion's name). */
  badgeHint?: string | undefined;
  /** Options the gift's theme offers (Simbang Gabi on Parol Christmas). */
  offers?: string[] | undefined;
  siteId: string;
  settings: IntroSettings;
  /** Gets an updater, so quick taps never overwrite each other. */
  onChange: (update: (prev: IntroSettings) => IntroSettings) => void;
  palette: Palette;
  kind: ThemeKind;
  introStyle: IntroStyle;
  greeting: React.ReactNode;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const heroFile = useRef<HTMLInputElement | null>(null);
  const stickerFile = useRef<HTMLInputElement | null>(null);
  const bgFile = useRef<HTMLInputElement | null>(null);
  const hero = settings.hero ?? { type: "theme" as const };
  const bg = settings.background ?? { type: "theme" as const };
  const stickers = settings.stickers ?? [];
  const copy = INTRO_COPY[introStyle];
  type Patch = { [K in keyof IntroSettings]?: IntroSettings[K] | undefined };
  const classic = settings.opening === "classic";
  const set = (patch: Patch | ((prev: IntroSettings) => Patch)) =>
    onChange((prev) => {
      const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) } as Record<
        string,
        unknown
      >;
      for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
      return next as IntroSettings;
    });

  async function upload(file: File | undefined, what: string, then: (url: string) => void) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      toast.error("Pick a photo or a PNG, please.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("That picture is over 8 MB. Try a smaller one.");
      return;
    }
    setBusy(what);
    try {
      then(await uploadFile(file, "intro", siteId));
    } catch {
      toast.error("That upload didn't go through. Try again?");
    } finally {
      setBusy(null);
    }
  }

  function addSticker(s: Omit<IntroSticker, "id" | "x" | "y" | "r" | "s">) {
    if (stickers.length >= MAX_INTRO_STICKERS) {
      toast.info(`Up to ${MAX_INTRO_STICKERS} stickers. Remove one to add another.`);
      return;
    }
    set((prev) => {
      const list = prev.stickers ?? [];
      if (list.length >= MAX_INTRO_STICKERS) return {};
      return { stickers: [...list, { id: newId(), ...freeSpot(list.length), ...s }] };
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted">Small line on top</span>
            <CharCount value={settings.badge_text} max={LIMITS.openingLine} />
          </span>
          <input
            className={field}
            maxLength={LIMITS.openingLine}
            placeholder={badgeHint ?? copy.badge}
            value={settings.badge_text ?? ""}
            onChange={(e) => set({ badge_text: e.target.value || undefined })}
          />
        </label>
        {greeting}
        <label className="block">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-muted">Button</span>
            <CharCount value={settings.button_text} max={LIMITS.button} />
          </span>
          <input
            className={field}
            maxLength={LIMITS.button}
            placeholder={copy.action}
            value={settings.button_text ?? ""}
            onChange={(e) => set({ button_text: e.target.value || undefined })}
          />
        </label>
        {offers.includes("simbang") ? (
          <label className="flex items-start gap-3 rounded-xl border border-line bg-cream p-3">
            <input type="checkbox" className="mt-0.5" checked={settings.simbang === true} onChange={(e) => set({ simbang: e.target.checked || undefined })} />
            <span className="text-sm">{t("theme.parol.simbangOption")}</span>
          </label>
        ) : null}
      </div>

      <Group title="Opening style">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={chip(!classic)}
            aria-pressed={!classic}
            onClick={() => set({ opening: undefined })}
          >
            Signature
          </button>
          <button
            type="button"
            className={chip(classic)}
            aria-pressed={classic}
            onClick={() => set({ opening: "classic" })}
          >
            Classic
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {classic
            ? `A 3D scene, stickers and a button. ${STICKER_COPY.hint}`
            : isFlagOn("styles") ? t("picker.style.ownObject") : "The theme's own object, opened with a gesture."}
        </p>
      </Group>

      {classic ? (
        <>
          <Group title="The star of the show" hint="Tap it in the preview, it reacts.">
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => set({ hero: undefined })}
                aria-pressed={hero.type === "theme"}
                className={`squish grid aspect-square place-items-center overflow-hidden rounded-2xl ring-2 ${hero.type === "theme" ? "ring-ink" : "ring-transparent"}`}
                style={{ background: palette.background }}
                title={isFlagOn("styles") ? t("picker.style.fromStyle") : "From the theme"}
              >
                <img src={themeStillUrl(kind)} alt="" className="size-full object-contain" />
                <span className="sr-only">{isFlagOn("styles") ? t("picker.style.fromStyle") : "From the theme"}</span>
              </button>
              {THEME_KINDS.filter((k) => k !== kind && k !== "default").map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set({ hero: { type: "object", kind: k } })}
                  aria-pressed={hero.type === "object" && hero.kind === k}
                  title={`The ${HERO_WORD[k]}`}
                  className={`squish grid aspect-square place-items-center overflow-hidden rounded-2xl bg-cream ring-2 ${hero.type === "object" && hero.kind === k ? "ring-ink" : "ring-line/0 hover:ring-ink/15"}`}
                >
                  <img
                    src={themeStillUrl(k)}
                    alt=""
                    className="size-full object-contain"
                    loading="lazy"
                  />
                  <span className="sr-only">The {HERO_WORD[k]}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {HERO_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => set({ hero: { type: "emoji", emoji: e } })}
                  aria-pressed={hero.type === "emoji" && hero.emoji === e}
                  className={`squish grid size-10 place-items-center rounded-xl text-xl ring-2 ${hero.type === "emoji" && hero.emoji === e ? "bg-pink/50 ring-ink" : "bg-cream ring-transparent hover:ring-ink/15"}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className={`${field} mt-0 flex-1`}
                placeholder="Or type any emoji"
                maxLength={8}
                value={hero.type === "emoji" ? hero.emoji : ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  set({ hero: v ? { type: "emoji", emoji: v } : undefined });
                }}
                aria-label="Your own emoji"
              />
              <button
                type="button"
                onClick={() => heroFile.current?.click()}
                className="squish inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cream px-3 text-xs font-medium ring-1 ring-line hover:bg-pink/40"
              >
                {busy === "hero" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                Your picture
              </button>
              <input
                ref={heroFile}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) =>
                  void upload(e.target.files?.[0], "hero", (url) =>
                    set({ hero: { type: "image", url } }),
                  )
                }
              />
            </div>
            {hero.type === "image" ? (
              <p className="mt-1.5 text-xs text-muted">
                Tip: a PNG with a see-through background looks like a real sticker.
              </p>
            ) : null}
          </Group>

          <Group
            title="Stickers"
            hint={`Up to ${MAX_INTRO_STICKERS}. ${STICKER_COPY.hint}`}
          >
            <div className="flex flex-wrap gap-1.5">
              {STICKER_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => addSticker({ emoji: e })}
                  className="squish grid size-9 place-items-center rounded-xl bg-cream text-lg ring-1 ring-line hover:bg-pink/40"
                  aria-label={`Add ${e} sticker`}
                >
                  {e}
                </button>
              ))}
              <button
                type="button"
                onClick={() => stickerFile.current?.click()}
                className="squish inline-flex h-9 items-center gap-1.5 rounded-xl bg-cream px-3 text-xs font-medium ring-1 ring-line hover:bg-pink/40"
              >
                {busy === "sticker" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                Upload
              </button>
              <input
                ref={stickerFile}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) =>
                  void upload(e.target.files?.[0], "sticker", (url) => addSticker({ url }))
                }
              />
            </div>
            {stickers.length ? (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {stickers.map((s) => (
                    <span
                      key={s.id}
                      className="group relative grid size-12 place-items-center rounded-xl bg-paper ring-1 ring-line"
                    >
                      {s.url ? (
                        <img src={s.url} alt="" className="size-9 object-contain" />
                      ) : (
                        <span className="text-2xl">{s.emoji}</span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          set((prev) => ({
                            stickers: (prev.stickers ?? []).filter((x) => x.id !== s.id),
                          }))
                        }
                        className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-cream"
                        aria-label="Remove sticker"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex flex-1 items-center gap-2 text-xs text-muted">
                    All sizes
                    <input
                      type="range"
                      min={0.6}
                      max={1.8}
                      step={0.1}
                      value={stickers[0]?.s ?? 1}
                      onChange={(e) =>
                        set({
                          stickers: stickers.map((s) => ({ ...s, s: Number(e.target.value) })),
                        })
                      }
                      className="flex-1 accent-[#C2366B]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      set({
                        stickers: stickers.map((s) => ({
                          ...s,
                          x:
                            Math.random() < 0.5
                              ? 0.08 + Math.random() * 0.22
                              : 0.7 + Math.random() * 0.22,
                          y: 0.08 + Math.random() * 0.84,
                          r: Math.round((Math.random() - 0.5) * 40),
                        })),
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium underline"
                  >
                    <Shuffle className="size-3" /> Shuffle
                  </button>
                  {onUndoStickers ? (
                    <button type="button" onClick={onUndoStickers} className="inline-flex items-center gap-1 text-xs font-medium underline">
                      <Undo2 className="size-3" /> {STICKER_COPY.undo}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Group>

          <Group title="Background">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={chip(bg.type === "theme")}
                onClick={() => set({ background: undefined })}
              >
                From the theme
              </button>
              <button
                type="button"
                className={chip(bg.type === "solid")}
                onClick={() =>
                  set({
                    background: {
                      type: "solid",
                      color: bg.type === "solid" ? bg.color : "#FFE3EC",
                    },
                  })
                }
              >
                One color
              </button>
              <button
                type="button"
                className={chip(bg.type === "gradient")}
                onClick={() =>
                  set({
                    background:
                      bg.type === "gradient"
                        ? bg
                        : { type: "gradient", from: "#FFD6E7", to: "#C9D7FF" },
                  })
                }
              >
                Gradient
              </button>
              <button
                type="button"
                className={chip(bg.type === "image")}
                onClick={() => bgFile.current?.click()}
              >
                {busy === "bg" ? "Uploading…" : "Photo"}
              </button>
              <input
                ref={bgFile}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) =>
                  void upload(e.target.files?.[0], "bg", (url) =>
                    set({ background: { type: "image", url } }),
                  )
                }
              />
            </div>
            {bg.type === "solid" ? (
              <div className="mt-2.5">
                <ColorField
                  label="Background"
                  value={bg.color}
                  fallback="#FFE3EC"
                  onChange={(v) => set({ background: v ? { type: "solid", color: v } : undefined })}
                />
              </div>
            ) : null}
            {bg.type === "gradient" ? (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <ColorField
                  label="Top"
                  value={bg.from}
                  fallback="#FFD6E7"
                  onChange={(v) => set({ background: { ...bg, from: v ?? "#FFD6E7" } })}
                />
                <ColorField
                  label="Bottom"
                  value={bg.to}
                  fallback="#C9D7FF"
                  onChange={(v) => set({ background: { ...bg, to: v ?? "#C9D7FF" } })}
                />
              </div>
            ) : null}
          </Group>

          <Group title="Colors">
            <div className="grid gap-2">
              <ColorField
                label="Text"
                value={settings.ink}
                fallback="#2B2522"
                onChange={(v) => set({ ink: v })}
              />
              <ColorField
                label="Button"
                value={settings.button}
                fallback={palette.primary}
                onChange={(v) => set({ button: v })}
              />
              <ColorField
                label="Button text"
                value={settings.button_ink}
                fallback="#FFFFFF"
                onChange={(v) => set({ button_ink: v })}
              />
            </div>
          </Group>
        </>
      ) : null}


      {classic ? (
        <>
          <Group title="When it opens" hint="What bursts out when they tap the button.">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={chip(!settings.burst)}
                onClick={() => set({ burst: undefined })}
              >
                From the theme
              </button>
              {BURSTS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={chip(settings.burst === b.id)}
                  onClick={() => set({ burst: b.id })}
                >
                  {b.glyph} {b.label}
                </button>
              ))}
            </div>
          </Group>
        </>
      ) : null}

      {Object.keys(settings).length ? (
        <button
          type="button"
          onClick={() => onChange(() => ({}))}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted underline"
        >
          <RotateCcw className="size-3" /> Back to the theme's opening
        </button>
      ) : null}
    </div>
  );
}
