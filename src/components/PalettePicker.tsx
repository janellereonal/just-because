import { useEffect, useMemo, useState } from "react";
import { usePalettes, suggestedPalettes } from "@/hooks/usePalettes";
import {
  colorsFromImage,
  deleteCustomPalette,
  nudgeContrast,
  renameCustomPalette,
  saveCustomPalette,
  savedPalettes,
  tooCloseToBackground,
  type PaletteRecord,
  type SavedPalette,
} from "@/lib/palettes";
import type { Palette, Theme } from "@/lib/themes";
import { Pipette, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Value = { palette_id: string | null; colors: Palette };

type Role = keyof Palette;

const ROLES: { key: Role; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "primary", label: "Main" },
  { key: "accent", label: "Accent" },
];

function Dots({ palette, size = 14 }: { palette: Palette; size?: number }) {
  return (
    <span className="flex items-center gap-1">
      {[palette.background, palette.primary, palette.accent].map((c, i) => (
        <span
          key={i}
          className="rounded-full ring-1 ring-ink/10"
          style={{ backgroundColor: c, width: size, height: size }}
        />
      ))}
    </span>
  );
}

export function paletteNameFor(value: Value, all: PaletteRecord[]): string {
  const found = all.find((p) => p.id === value.palette_id);
  return found ? found.name : "Custom";
}

function matches(query: string, p: { name: string } & Palette) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (p.name.toLowerCase().includes(q)) return true;
  return [p.background, p.primary, p.accent].some((c) => c.toLowerCase().includes(q));
}

function RolePicker({
  role,
  label,
  value,
  inGift,
  onChange,
}: {
  role: Role;
  label: string;
  value: Palette;
  inGift: string[];
  onChange: (part: Role, hex: string) => void;
}) {
  const current = value[role];
  const hasEyeDropper =
    typeof window !== "undefined" && "EyeDropper" in (window as unknown as Record<string, unknown>);

  async function pickWithEyeDropper() {
    try {
      const Ctor = (window as unknown as Record<string, new () => { open: () => Promise<{ sRGBHex: string }> }>)[
        "EyeDropper"
      ]!;
      const result = await new Ctor().open();
      onChange(role, result.sRGBHex);
    } catch {
      /* cancelled */
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex flex-1 flex-col items-center gap-1.5">
          <span
            className="size-11 rounded-xl ring-1 ring-ink/10"
            style={{ backgroundColor: current }}
          />
          <span className="text-[11px] text-muted">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3">
        <p className="text-sm font-medium">{label} colour</p>
        <input
          type="color"
          aria-label={`${label} colour`}
          value={current}
          onChange={(e) => onChange(role, e.target.value)}
          className="h-28 w-full cursor-pointer rounded-xl border border-line bg-transparent"
        />
        <div className="flex items-center gap-2">
          <input
            value={current}
            onChange={(e) => onChange(role, e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-line bg-cream px-2 py-1.5 font-mono text-xs"
          />
          {hasEyeDropper ? (
            <button
              type="button"
              aria-label="Pick a colour from the screen"
              onClick={() => void pickWithEyeDropper()}
              className="grid size-8 place-items-center rounded-lg border border-line"
            >
              <Pipette className="size-4" />
            </button>
          ) : null}
        </div>
        <div>
          <p className="text-[11px] text-muted">Colors in this gift</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {inGift.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => onChange(role, c)}
                className="size-6 rounded-md ring-1 ring-ink/10"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Palettes made for one engine theme (seeded with it). They show as that
 * theme's suggestions, not in everyone's "more palettes" list, so a draft
 * theme's colours don't appear before the theme does.
 */
const THEME_ONLY_PALETTES = new Set(["Winter Cabin", "Snowy Pine", "Kraft Mail", "Air Mail", "Balikbayan", "Parol Night", "Capiz", "Debut Rose", "Debut Night"]);

export function PalettePicker({
  theme,
  value,
  onChange,
  photoUrls = [],
  part = "all",
}: {
  theme: Theme | null;
  value: Value;
  onChange: (next: Value) => void;
  photoUrls?: string[];
  /** "suggested": the occasion's palettes as cards. "more": everything else (hex box, own colors, the rest). */
  part?: "all" | "suggested" | "more";
}) {
  const { data: all = [] } = usePalettes();
  const suggested = suggestedPalettes(theme, all);
  const [query, setQuery] = useState("");
  const [seeAll, setSeeAll] = useState(false);
  const [mine, setMine] = useState<SavedPalette[]>([]);
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [photoColors, setPhotoColors] = useState<string[][]>([]);

  useEffect(() => {
    setMine(savedPalettes());
  }, []);

  useEffect(() => {
    let alive = true;
    const urls = photoUrls.slice(0, 3);
    if (urls.length === 0) {
      setPhotoColors([]);
      return;
    }
    void Promise.all(urls.map((u) => colorsFromImage(u, 5))).then((rows) => {
      if (alive) setPhotoColors(rows.filter((r) => r.length > 0));
    });
    return () => {
      alive = false;
    };
  }, [photoUrls.join("|")]);

  const suggestedIds = new Set(suggested.map((p) => p.id));
  const rest = useMemo(
    () => all.filter((p) => !suggestedIds.has(p.id) && !THEME_ONLY_PALETTES.has(p.name) && matches(query, p)),
    [all, query, suggested],
  );
  const shownRest = seeAll || query ? rest : rest.slice(0, 6);
  const inGift = [value.colors.background, value.colors.primary, value.colors.accent];

  function pick(p: PaletteRecord) {
    onChange({
      palette_id: p.id,
      colors: { background: p.background, primary: p.primary, accent: p.accent },
    });
  }

  function setColor(part: Role, hex: string) {
    const next = { ...value.colors, [part]: hex };
    onChange({ palette_id: null, colors: next });
    setMine(saveCustomPalette(next));
  }

  const row = (p: PaletteRecord) => (
    <button
      key={p.id}
      type="button"
      onClick={() => pick(p)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
        value.palette_id === p.id ? "border-accent bg-accent/8" : "border-line bg-cream"
      }`}
    >
      <Dots palette={p} />
      <span className="truncate text-xs">{p.name}</span>
    </button>
  );

  const warning = (["primary", "accent"] as const).map((role) =>
    tooCloseToBackground(value.colors[role], value.colors.background) ? (
      <p key={role} className="mt-2 text-xs text-accent">
        Your {role === "primary" ? "Main" : "Accent"} is hard to read on this background.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => setColor(role, nudgeContrast(value.colors[role], value.colors.background, 3))}
        >
          Fix it
        </button>
      </p>
    ) : null,
  );

  if (part === "suggested") {
    const own = !suggested.some((p) => p.id === value.palette_id);
    const cards = suggested.slice(0, 3);
    const card = (key: string, name: string, colors: Palette, on: boolean, onClick: () => void) => (
      <button
        key={key}
        type="button"
        onClick={onClick}
        aria-pressed={on}
        className={`squish overflow-hidden rounded-2xl border text-left transition-colors ${on ? "border-accent ring-2 ring-accent/25" : "border-line hover:border-ink/25"}`}
      >
        <span className="relative block h-14" style={{ background: colors.background }}>
          <span className="absolute bottom-2 left-2 size-5 rounded-full ring-1 ring-black/5" style={{ background: colors.primary }} />
          <span className="absolute bottom-2 left-6 size-5 rounded-full ring-2 ring-white/70" style={{ background: colors.accent }} />
        </span>
        <span className="block truncate bg-cream px-2 py-1.5 text-[11px] font-medium">{name}</span>
      </button>
    );
    return (
      <div>
        <div className={`grid gap-2 ${own ? "grid-cols-4" : "grid-cols-3"}`}>
          {cards.map((p) => card(p.id, p.name, p, value.palette_id === p.id, () => pick(p)))}
          {own ? card("own", "Your colors", value.colors, true, () => undefined) : null}
        </div>
        {warning}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={'Try "pink" or "#F49AB6"'}
        className="w-full rounded-xl border border-line bg-cream px-3 py-2 text-sm outline-none focus:border-accent"
      />

      <div>
        <p className="text-[11px] tracking-wide text-muted uppercase">Palette</p>
        <div className="mt-2 flex gap-3">
          {ROLES.map((r) => (
            <RolePicker
              key={r.key}
              role={r.key}
              label={r.label}
              value={value.colors}
              inGift={inGift}
              onChange={setColor}
            />
          ))}
        </div>
        {part === "all" ? warning : null}
      </div>

      {part === "all" && suggested.filter((p) => matches(query, p)).length > 0 ? (
        <div>
          <p className="text-[11px] tracking-wide text-muted uppercase">
            Suggested for {theme?.name ?? "this theme"}
          </p>
          <div className="mt-2 space-y-1.5">
            {suggested.filter((p) => matches(query, p)).map(row)}
          </div>
        </div>
      ) : null}

      {shownRest.length > 0 ? (
        <div>
          <p className="text-[11px] tracking-wide text-muted uppercase">{part === "more" ? "Palettes" : "More palettes"}</p>
          <div className="mt-2 space-y-1.5">{shownRest.map(row)}</div>
          {!query && rest.length > 6 ? (
            <button
              type="button"
              onClick={() => setSeeAll((s) => !s)}
              className="mt-2 text-xs text-accent underline"
            >
              {seeAll ? "Show fewer" : "See all"}
            </button>
          ) : null}
        </div>
      ) : null}

      {mine.length > 0 ? (
        <div>
          <p className="text-[11px] tracking-wide text-muted uppercase">Your palettes</p>
          <div className="mt-2 space-y-1.5">
            {mine.map((p, i) => (
              <div
                key={`${p.colors.background}-${p.colors.primary}-${p.colors.accent}`}
                className="group flex items-center gap-3 rounded-xl border border-line bg-cream px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => onChange({ palette_id: null, colors: p.colors })}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Dots palette={p.colors} />
                  {renamingIdx === i ? null : <span className="truncate text-xs">{p.name}</span>}
                </button>
                {renamingIdx === i ? (
                  <input
                    autoFocus
                    defaultValue={p.name}
                    onBlur={(e) => {
                      setMine(renameCustomPalette(i, e.target.value.trim() || p.name));
                      setRenamingIdx(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-accent bg-paper px-2 py-1 text-xs"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setRenamingIdx(i)}
                    className="text-[11px] text-muted opacity-0 group-hover:opacity-100"
                  >
                    Rename
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => setMine(deleteCustomPalette(i))}
                  className="text-muted opacity-0 group-hover:opacity-100 hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {photoColors.length > 0 ? (
        <div>
          <p className="text-[11px] tracking-wide text-muted uppercase">Photo colors</p>
          <div className="mt-2 space-y-1.5">
            {photoColors.map((row2, i) => (
              <div key={i} className="flex gap-1.5">
                {row2.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setColor("accent", c)}
                    className="h-7 flex-1 rounded-md ring-1 ring-ink/10"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
