/** The quiet "Report" link at the bottom of gift and friend pages, and its dialog. */
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Flag } from "lucide-react";
import { reportGift } from "@/lib/reports";
import { REPORT_COPY } from "@/copy/strings";

type Reason = (typeof REPORT_COPY.reasons)[number][0];

export function ReportGift({ slug, page, tone = "#2B2522" }: { slug: string; page: "gift" | "contribute"; tone?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("harassment");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function send() {
    setState("sending");
    try {
      await reportGift({ data: { slug, reason, details: details.trim() || null, page } });
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <div className="flex justify-center py-6">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs opacity-60 hover:opacity-100 focus-visible:opacity-100" style={{ color: tone }}>
          <Flag className="size-3.5" aria-hidden="true" /> {REPORT_COPY.link}
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-[95] grid place-items-end bg-ink/45 p-3 sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={REPORT_COPY.title}
              className="w-full max-w-md rounded-[24px] bg-white p-5 text-[#2B2522] shadow-xl"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <h2 className="text-lg font-semibold">{REPORT_COPY.title}</h2>
              {state === "sent" ? (
                <>
                  <p className="mt-3 text-sm">{REPORT_COPY.thanks}</p>
                  <button type="button" onClick={() => setOpen(false)} className="mt-5 min-h-11 w-full rounded-full bg-[#2B2522] font-medium text-white">
                    {REPORT_COPY.close}
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-[#6B625C]">{REPORT_COPY.intro}</p>
                  <fieldset className="mt-4 space-y-1.5">
                    {REPORT_COPY.reasons.map(([k, label]) => (
                      <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#EAE3DA] px-3 py-2.5 text-sm has-[:checked]:border-[#2B2522]">
                        <input type="radio" name="reason" value={k} checked={reason === k} onChange={() => setReason(k)} className="accent-[#2B2522]" />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  <label className="mt-3 block text-sm">
                    <span className="text-[#6B625C]">{REPORT_COPY.details}</span>
                    <textarea value={details} onChange={(e) => setDetails(e.target.value.slice(0, 1000))} rows={3} className="mt-1 w-full rounded-xl border border-[#EAE3DA] px-3 py-2 text-[16px] outline-none focus:border-[#2B2522]" />
                  </label>
                  {state === "failed" ? <p className="mt-2 text-sm text-[#B42318]">{REPORT_COPY.failed}</p> : null}
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setOpen(false)} className="min-h-11 flex-1 rounded-full border border-[#EAE3DA] text-sm font-medium">
                      {REPORT_COPY.cancel}
                    </button>
                    <button type="button" disabled={state === "sending"} onClick={() => void send()} className="min-h-11 flex-1 rounded-full bg-[#2B2522] text-sm font-medium text-white disabled:opacity-60">
                      {state === "sending" ? REPORT_COPY.sending : REPORT_COPY.send}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
