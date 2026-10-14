import { useMemo, useState } from "react";
import Bo from "@/components/Bo";
import { ORNAMENTS, type ViewContribution } from "@/lib/gift";
import { readableInk } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";

const POSITIONS = [
  [50, 12], [36, 24], [64, 26], [25, 39], [49, 38], [73, 42],
  [17, 56], [38, 54], [61, 58], [82, 60], [28, 74], [68, 76],
] as const;

export function OrnamentIcon({ ornamentKey, className = "" }: { ornamentKey: string | null; className?: string }) {
  const ornament = ORNAMENTS.find(([key]) => key === ornamentKey) ?? ORNAMENTS[0];
  return <span className={className} aria-hidden="true">{ornament[2]}</span>;
}

export function GiftTree({
  contributions,
  palette,
  revealDate,
  sample = false,
}: {
  contributions: ViewContribution[];
  palette: Palette;
  revealDate: string | null;
  sample?: boolean;
}) {
  const sampleItems = useMemo<ViewContribution[]>(() => [
    { id: "tree-sam", site_id: "sample", module_type: "tree", author_name: "Sam", text_content: "You make every Christmas brighter.", media_url: null, external_link: null, status: "approved", created_at: "", ornament_key: "star", visibility: "public" },
    { id: "tree-ana", site_id: "sample", module_type: "tree", author_name: "Ana", text_content: "A little wish, just for you.", media_url: null, external_link: null, status: "approved", created_at: "", ornament_key: "heart", visibility: "public" },
    { id: "tree-bo", site_id: "sample", module_type: "tree", author_name: "Bo", text_content: "Warm hugs from all of us!", media_url: null, external_link: null, status: "approved", created_at: "", ornament_key: "gift", visibility: "public" },
  ], []);
  const items = contributions.length > 0 ? contributions : sample ? sampleItems : [];
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<ViewContribution | null>(null);
  const pages = Math.max(1, Math.ceil(items.length / 12));
  const visible = items.slice(page * 12, page * 12 + 12);
  const today = new Date().toISOString().slice(0, 10);
  const dateLocked = !!revealDate && revealDate > today;

  function select(item: ViewContribution) {
    setOpen(item);
  }

  return (
    <>
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[520px]">
        <div className="absolute bottom-[4%] left-1/2 h-[18%] w-[12%] -translate-x-1/2 rounded-md" style={{ backgroundColor: palette.primary }} />
        {[{ top: 5, width: 48 }, { top: 23, width: 68 }, { top: 43, width: 88 }].map((tier) => (
          <div
            key={tier.top}
            className="absolute left-1/2 aspect-[1.5/1] -translate-x-1/2"
            style={{ top: `${tier.top}%`, width: `${tier.width}%`, backgroundColor: palette.primary, clipPath: "polygon(50% 0, 100% 100%, 0 100%)", opacity: 0.9 }}
          />
        ))}
        {visible.map((item, index) => {
          const [left, top] = POSITIONS[index] ?? POSITIONS[0];
          const locked = item.sealed || item.visibility === "recipient" || dateLocked;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => select(item)}
              className="absolute z-10 flex -translate-x-1/2 flex-col items-center transition-transform hover:scale-110"
              style={{ left: `${left}%`, top: `${top}%`, filter: item.mine ? `drop-shadow(0 0 0 ${palette.accent})` : undefined }}
              aria-label={`${locked ? "Locked ornament" : "Open ornament"} from ${item.author_name}`}
            >
              <span className="grid size-11 place-items-center rounded-full border-2 text-xl shadow-sm" style={{ backgroundColor: palette.background, borderColor: palette.accent, color: palette.accent }}>
                {item.sealed ? <OrnamentIcon ornamentKey={item.ornament_key} /> : locked ? "🔒" : <OrnamentIcon ornamentKey={item.ornament_key} />}
              </span>
              <span className="mt-1 max-w-16 truncate rounded-full bg-[var(--gift-surface,rgba(255,255,255,0.8))] px-2 py-0.5 text-[10px] font-medium" style={{ color: readableInk(palette.background) }}>{item.author_name}</span>
            </button>
          );
        })}
      </div>
      {pages > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          <button type="button" onClick={() => setPage((p) => (p - 1 + pages) % pages)} aria-label="Previous tree">←</button>
          <span className="font-mono text-xs">{page + 1}/{pages}</span>
          <button type="button" onClick={() => setPage((p) => (p + 1) % pages)} aria-label="Next tree">→</button>
        </div>
      ) : null}
      {items.length === 0 ? <p className="text-center text-sm opacity-60">The first ornament is waiting to be hung.</p> : null}

      {open ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/45 p-5" onClick={() => setOpen(null)}>
          <div className="w-full max-w-sm rounded-3xl p-6 text-center shadow-xl" style={{ backgroundColor: palette.background, color: readableInk(palette.background) }} onClick={(event) => event.stopPropagation()}>
            {open.sealed ? (
              <>
                <Bo pose="idle" size={92} />
                <h3 className="mt-2 text-xl font-semibold">Sealed for now</h3>
                <p className="mt-2 text-sm opacity-70">{open.author_name}'s message opens with the gift.</p>
              </>
            ) : open.visibility === "recipient" ? (
              <>
                <Bo pose="idle" size={92} />
                <h3 className="mt-2 text-xl font-semibold">A private ornament</h3>
                <p className="mt-2 text-sm opacity-70">This message is only for the recipient.</p>
              </>
            ) : dateLocked ? (
              <>
                <Bo pose="idle" size={92} />
                <h3 className="mt-2 text-xl font-semibold">Opens on {new Date(`${revealDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</h3>
              </>
            ) : (
              <>
                <OrnamentIcon ornamentKey={open.ornament_key} className="text-5xl" />
                <p className="mt-5 leading-relaxed whitespace-pre-line">{open.text_content}</p>
                <p className="mt-4 text-sm" style={{ color: palette.accent }}>{open.author_name}</p>
              </>
            )}
            <button type="button" onClick={() => setOpen(null)} className="mt-6 w-full rounded-full px-5 py-2.5 text-sm font-medium" style={{ backgroundColor: palette.accent, color: readableInk(palette.accent) }}>Close</button>
          </div>
        </div>
      ) : null}
    </>
  );
}