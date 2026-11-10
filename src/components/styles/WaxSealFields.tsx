/**
 * The editor's Wax Seal fields.
 *  - `WaxSealOpeningFields`: the seal's initial, the "for" line, the card's line and the
 *    event date, saved in intro_settings.seal (shown in the Opening screen group).
 *  - `WaxSealDayFields`: the time and place, who it's from, the plan for the day and the
 *    menu, saved in format_settings.event (its own "The day" group).
 * Both autosave through the editor's draft like every other field.
 */
import { Plus, X } from "lucide-react";
import type { IntroSettings } from "@/lib/intro";
import { viewerZone } from "@/lib/time";
import {
  EVENT_LIMITS,
  cardWords,
  sealInitial,
  type Course,
  type EventSettings,
  type PlanStep,
  type SealSettings,
} from "@/lib/waxSeal";

const field =
  "mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent";
const small = "text-xs text-muted";

export function WaxSealOpeningFields({
  settings,
  onChange,
  recipient,
  occasion,
}: {
  settings: IntroSettings;
  onChange: (update: (prev: IntroSettings) => IntroSettings) => void;
  recipient: string;
  occasion: string | null | undefined;
}) {
  const seal = settings.seal ?? {};
  const words = cardWords(occasion, recipient);
  const set = (patch: Partial<SealSettings>) =>
    onChange((prev) => {
      const next: Record<string, unknown> = { ...(prev.seal ?? {}), ...patch };
      for (const k of Object.keys(next)) if (!next[k]) delete next[k];
      const out = { ...prev } as IntroSettings;
      if (Object.keys(next).length) out.seal = next as SealSettings;
      else delete out.seal;
      return out;
    });
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[5.5rem_1fr] gap-2.5">
        <label className="block">
          <span className={small}>Seal letter</span>
          <input
            className={`${field} text-center italic`}
            maxLength={2}
            placeholder={sealInitial(undefined, recipient)}
            value={seal.initial ?? ""}
            onChange={(e) => set({ initial: e.target.value })}
            aria-describedby="ws-seal-hint"
          />
        </label>
        <label className="block">
          <span className={small}>Over the envelope</span>
          <input
            className={field}
            maxLength={40}
            placeholder={recipient ? `for ${recipient.toLocaleLowerCase()}` : "for you"}
            value={seal.for_line ?? ""}
            onChange={(e) => set({ for_line: e.target.value })}
          />
        </label>
      </div>
      <p id="ws-seal-hint" className={small}>
        One or two letters pressed into the wax.
      </p>
      <label className="block">
        <span className={small}>On the card</span>
        <input
          className={field}
          maxLength={40}
          placeholder={words.line}
          value={seal.card_line ?? ""}
          onChange={(e) => set({ card_line: e.target.value })}
        />
        <span className="mt-1 block text-xs text-muted">Under “{words.kicker}”.</span>
      </label>
      <label className="block">
        <span className={small}>The date (optional)</span>
        <input
          type="date"
          className={field}
          value={seal.date ?? ""}
          onChange={(e) => set({ date: e.target.value })}
        />
        <span className="mt-1 block text-xs text-muted">
          On the card, at the top of the gift and in the details.
        </span>
      </label>
    </div>
  );
}

export function WaxSealDayFields({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: EventSettings) => void;
}) {
  const e = asTyped(value);
  const schedule = e.schedule ?? [];
  const menu = e.menu ?? [];
  const set = (patch: Partial<EventSettings>) => {
    const next: Record<string, unknown> = { ...e, ...patch };
    for (const k of Object.keys(next)) {
      const v = next[k];
      if (v === "" || v === undefined || (Array.isArray(v) && v.length === 0)) delete next[k];
    }
    // "Add to calendar" needs to know which clock the time is on: the creator's.
    if (next["time"]) next["tz"] = viewerZone();
    else delete next["tz"];
    onChange(next as EventSettings);
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <label className="block">
          <span className={small}>Starts at</span>
          <input
            type="time"
            className={field}
            value={e.time ?? ""}
            onChange={(ev) => set({ time: ev.target.value })}
          />
        </label>
        <label className="block">
          <span className={small}>Ends at (optional)</span>
          <input
            type="time"
            className={field}
            value={e.end ?? ""}
            onChange={(ev) => set({ end: ev.target.value })}
          />
        </label>
      </div>
      <p className={small}>The date is in the opening, above. Times are where the party is.</p>
      <label className="block">
        <span className={small}>Where</span>
        <input
          className={field}
          maxLength={80}
          placeholder="One Legazpi Park"
          value={e.place ?? ""}
          onChange={(ev) => set({ place: ev.target.value })}
        />
      </label>
      <label className="block">
        <span className={small}>Address or area (optional)</span>
        <input
          className={field}
          maxLength={140}
          placeholder="Legazpi Village, Makati"
          value={e.address ?? ""}
          onChange={(ev) => set({ address: ev.target.value })}
        />
      </label>
      <label className="block">
        <span className={small}>Signed (under the invitation)</span>
        <input
          className={field}
          maxLength={120}
          placeholder="love, danielle, lia, gwyn & aye"
          value={e.sign ?? ""}
          onChange={(ev) => set({ sign: ev.target.value })}
        />
      </label>

      <ListEditor
        title="The plan"
        hint="What happens when. Leave it empty to skip this part."
        rows={schedule}
        max={EVENT_LIMITS.steps}
        cols={[
          { key: "time", label: "When", placeholder: "2:00 PM", max: 20, width: "6.5rem" },
          { key: "what", label: "What", placeholder: "Meet up at the park", max: 120 },
        ]}
        onChange={(rows) => set({ schedule: rows as PlanStep[] })}
      />
      <ListEditor
        title="The menu"
        hint="What's on the table. Leave it empty to skip this part."
        rows={menu}
        max={EVENT_LIMITS.courses}
        cols={[
          { key: "label", label: "Course", placeholder: "to start", max: 40, width: "7.5rem" },
          { key: "what", label: "What", placeholder: "A salad with whatever looks best", max: 140 },
        ]}
        onChange={(rows) => set({ menu: rows as Course[] })}
      />
    </div>
  );
}

/**
 * The day as the creator is typing it: the right shape, but nothing trimmed, so a space
 * typed between two words stays. The server trims and checks it on save (normalizeEvent).
 */
function asTyped(value: unknown): EventSettings {
  const v =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const text = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : undefined);
  const list = (k: string, keys: string[]) =>
    (Array.isArray(v[k]) ? (v[k] as unknown[]) : [])
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .map((r) =>
        Object.fromEntries(
          keys.map((key) => [key, typeof r[key] === "string" ? (r[key] as string) : ""]),
        ),
      );
  const out: Record<string, unknown> = {};
  for (const k of ["time", "end", "tz", "place", "address", "sign"])
    if (text(k) !== undefined) out[k] = text(k);
  out["schedule"] = list("schedule", ["time", "what"]);
  out["menu"] = list("menu", ["label", "what"]);
  return out as EventSettings;
}

type Row = Record<string, string>;

function ListEditor({
  title,
  hint,
  rows,
  max,
  cols,
  onChange,
}: {
  title: string;
  hint: string;
  rows: Row[];
  max: number;
  cols: { key: string; label: string; placeholder: string; max: number; width?: string }[];
  onChange: (rows: Row[]) => void;
}) {
  const blank = Object.fromEntries(cols.map((c) => [c.key, ""]));
  return (
    <fieldset>
      <legend className="text-sm font-medium">{title}</legend>
      <p className={small}>{hint}</p>
      <div className="mt-2 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-end gap-2">
            {cols.map((c) => (
              <label
                key={c.key}
                className="block min-w-0"
                style={c.width ? { width: c.width, flex: "none" } : { flex: 1 }}
              >
                <span className="sr-only">
                  {c.label} {i + 1}
                </span>
                <input
                  className={field}
                  maxLength={c.max}
                  placeholder={c.placeholder}
                  value={row[c.key] ?? ""}
                  onChange={(e) =>
                    onChange(rows.map((r, j) => (j === i ? { ...r, [c.key]: e.target.value } : r)))
                  }
                />
              </label>
            ))}
            <button
              type="button"
              className="mb-1 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-cream hover:text-ink"
              aria-label={`Remove ${title.toLowerCase()} row ${i + 1}`}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      {rows.length < max ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink/25 px-3.5 py-2 text-xs font-medium hover:bg-cream"
          onClick={() => onChange([...rows, blank])}
        >
          <Plus className="size-3.5" /> Add a line
        </button>
      ) : null}
    </fieldset>
  );
}
