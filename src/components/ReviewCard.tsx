import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { REVIEW_COPY } from "@/copy/strings";
import { signedMediaUrl, type Contribution } from "@/lib/gift";
import { onPhotoError } from "@/lib/media";
import { sectionFields, type SectionField } from "@/lib/sections";
import { formatDay } from "@/lib/time";

const LONG_NOTE = 280;

const FIELD_LABEL: Record<SectionField, string> = {
  when: REVIEW_COPY.openWhen,
  award: REVIEW_COPY.award,
  question: REVIEW_COPY.question,
  answer: REVIEW_COPY.answer,
  wrong: REVIEW_COPY.wrong,
  coupon: REVIEW_COPY.coupon,
  fine_print: REVIEW_COPY.finePrint,
  place: REVIEW_COPY.place,
  unlock_at: REVIEW_COPY.opensOn,
};

/**
 * One friend's note in the editor's review list: everything the gift will show
 * (the words, the file, and every extra field a newer section carries), so the
 * organiser never approves blind.
 */
export function ReviewCard({
  item,
  onApprove,
  onHide,
  onDelete,
}: {
  item: Contribution;
  onApprove: () => void;
  onHide: () => void;
  onDelete: () => Promise<void>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const text = item.text_content ?? "";
  const long = [...text].length > LONG_NOTE;
  const fields = sectionFields(item.module_type, item.data);
  useEffect(() => {
    let active = true;
    signedMediaUrl(item.media_url).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [item.media_url]);

  return (
    <div className="card-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{item.author_name}</p>
        <span className="shrink-0 font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
          {REVIEW_COPY.kind[item.module_type] ?? item.module_type} · {item.status}
        </span>
      </div>
      {fields.length ? (
        <dl className="mt-3 space-y-1.5 text-sm">
          {fields.map(({ field, value }) => (
            <div key={field} className="flex gap-2">
              <dt className="w-24 shrink-0 text-xs leading-5 text-muted">{FIELD_LABEL[field]}</dt>
              <dd className="min-w-0 leading-5 [overflow-wrap:anywhere]" suppressHydrationWarning>
                {field === "unlock_at" ? formatDay(value) : value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {url && item.module_type === "voice" ? (
        <audio controls src={url} className="mt-3 w-full" />
      ) : url && item.module_type === "video" ? (
        <video controls playsInline preload="metadata" src={url} className="mt-3 aspect-video w-full rounded-xl bg-black" />
      ) : url ? (
        <img
          src={url}
          alt=""
          onError={onPhotoError}
          className={`mt-3 w-full rounded-xl ${item.module_type === "doodle" ? "aspect-square bg-white object-contain" : "aspect-square object-cover"}`}
        />
      ) : null}
      {text ? (
        <>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">
            {long && !expanded ? `${[...text].slice(0, LONG_NOTE).join("").trimEnd()}…` : text}
          </p>
          {long ? (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-medium text-accent underline">
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </>
      ) : null}
      {item.module_type === "tree" ? (
        <p className="mt-2 text-xs text-muted">
          Ornament: {item.ornament_key?.replace("-", " ") ?? "bauble"} · {item.visibility === "recipient" ? "Only the recipient" : "Anyone can read"}
        </p>
      ) : null}
      {item.external_link ? (
        <a
          href={item.external_link}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-xs break-all text-accent underline"
        >
          {item.external_link}
        </a>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onApprove}
          disabled={item.status === "approved"}
          className="flex-1 rounded-full bg-accent px-3 py-2 text-xs font-medium text-cream disabled:opacity-40"
        >
          Approve
        </button>
        <button
          onClick={onHide}
          disabled={item.status === "hidden"}
          className="flex-1 rounded-full border border-line bg-cream px-3 py-2 text-xs font-medium disabled:opacity-40"
        >
          Hide
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label={`Delete the note from ${item.author_name}`}
          className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-cream text-muted hover:text-[#B4322E]"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {confirmDelete ? (
        <div role="alert" className="mt-3 rounded-xl border border-line bg-paper p-3">
          <p className="text-sm font-medium">Delete this note from {item.author_name}?</p>
          <p className="mt-1 text-xs text-muted">It's gone for good, with any photo or voice note. Hide it instead if you might want it back.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setDeleting(true);
                void onDelete().finally(() => {
                  setDeleting(false);
                  setConfirmDelete(false);
                });
              }}
              className="rounded-full bg-[#B4322E] px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium"
            >
              Keep it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
