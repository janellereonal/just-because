import { useState } from "react";
import { HandHeart } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CONCIERGE_COPY as C } from "@/copy/strings";
import { concierge, conciergePrice } from "@/config/pricing";
import { isFlagOn } from "@/config/flags";
import { submitConciergeRequest } from "@/lib/api";
import { viewerZone } from "@/lib/time";

/**
 * Concierge beta offer card + request form. Behind the `concierge` flag (off in production).
 * Payment is handled by hand for now, so the form only collects details.
 */
export function ConciergeOffer({
  siteId = null,
  recipient = "",
  occasion = "",
  compact = false,
}: {
  siteId?: string | null;
  recipient?: string;
  occasion?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!isFlagOn("concierge")) return null;
  return (
    <>
      <div className={`rounded-2xl border border-line bg-cream ${compact ? "p-3" : "p-4"}`}>
        <div className="flex items-start gap-3">
          <HandHeart className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
              {C.title}
              <span className="rounded-full bg-butter px-2 py-0.5 text-[11px] font-medium text-ink">{concierge.badge}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {C.pitch} <span className="font-medium text-ink">{conciergePrice()}</span>
            </p>
            <button type="button" onClick={() => setOpen(true)} className="mt-2 text-xs font-medium text-accent underline underline-offset-2">
              {C.cta}
            </button>
          </div>
        </div>
      </div>
      <ConciergeDialog open={open} onOpenChange={setOpen} siteId={siteId} recipient={recipient} occasion={occasion} />
    </>
  );
}

function ConciergeDialog({
  open,
  onOpenChange,
  siteId,
  recipient,
  occasion,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  siteId: string | null;
  recipient: string;
  occasion: string;
}) {
  const [form, setForm] = useState({ recipient, occasion, deadline: "", friends: "", contact: "", timeZone: viewerZone(), notes: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const field = "mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-accent";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await submitConciergeRequest({
        data: {
          siteId,
          recipient: form.recipient,
          occasion: form.occasion,
          deadline: form.deadline,
          friends: Number(form.friends) || 0,
          contact: form.contact,
          timeZone: form.timeZone,
          ...(form.notes.trim() ? { notes: form.notes } : {}),
        },
      });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error && err.message.length < 160 ? err.message : "We couldn't send that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto bg-paper">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">{sent ? C.doneTitle : C.formTitle}</DialogTitle>
          <DialogDescription>{sent ? C.doneHint : C.formIntro}</DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="rounded-2xl bg-cream p-4 text-sm" role="status">
            {C.done}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-muted">{C.fields.recipient}</span>
                <input required maxLength={60} value={form.recipient} onChange={set("recipient")} className={field} />
              </label>
              <label className="block">
                <span className="text-xs text-muted">{C.fields.occasion}</span>
                <input required maxLength={80} value={form.occasion} onChange={set("occasion")} className={field} placeholder="A 60th birthday" />
              </label>
              <label className="block">
                <span className="text-xs text-muted">{C.fields.deadline}</span>
                <input required type="date" value={form.deadline} onChange={set("deadline")} className={field} />
              </label>
              <label className="block">
                <span className="text-xs text-muted">{C.fields.friends}</span>
                <input required type="number" min={1} max={1000} inputMode="numeric" value={form.friends} onChange={set("friends")} className={field} />
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-muted">{C.fields.contact}</span>
              <input required maxLength={160} value={form.contact} onChange={set("contact")} className={field} />
              <span className="mt-1 block text-[11px] text-muted">{C.fields.contactHint}</span>
            </label>
            <label className="block">
              <span className="text-xs text-muted">{C.fields.timeZone}</span>
              <input required maxLength={64} value={form.timeZone} onChange={set("timeZone")} className={field} />
            </label>
            <label className="block">
              <span className="text-xs text-muted">{C.fields.notes}</span>
              <textarea maxLength={1500} value={form.notes} onChange={set("notes")} placeholder={C.fields.notesPlaceholder} className={`${field} min-h-24`} />
            </label>
            <p className="text-xs text-muted">
              {conciergePrice()} · {concierge.badge}
            </p>
            <Button type="submit" disabled={busy} className="h-11 w-full rounded-full">
              {busy ? C.sending : C.send}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
