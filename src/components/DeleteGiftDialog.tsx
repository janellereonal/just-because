/**
 * "Delete this gift", from the editor's Gift settings and the dashboard. One confirm step for a
 * draft; a paid gift also asks for DELETE to be typed, because its link closes for good and the
 * payment isn't refunded. The server checks the same thing (`deleteSite`).
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteSite } from "@/lib/api";
import { DELETE_GIFT_COPY as C } from "@/copy/strings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DeleteGiftDialog({
  siteId,
  recipient,
  paid,
  open,
  onOpenChange,
  onDeleted,
}: {
  siteId: string;
  recipient: string;
  paid: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const ready = !paid || typed.trim().toUpperCase() === "DELETE";

  function remove() {
    if (!ready || busy) return;
    setBusy(true);
    deleteSite({ data: { id: siteId, ...(paid ? { confirm: "DELETE" } : {}) } })
      .then(async () => {
        toast.success(C.done);
        onOpenChange(false);
        await queryClient.invalidateQueries({ queryKey: ["my-sites"] });
        onDeleted?.();
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error && err.message.length < 160 ? err.message : C.failed);
      })
      .finally(() => setBusy(false));
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) setTyped("");
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{C.title(recipient)}</AlertDialogTitle>
          <AlertDialogDescription>{paid ? C.bodyPaid : C.bodyDraft}</AlertDialogDescription>
        </AlertDialogHeader>
        {paid ? (
          <label className="block text-sm">
            <span className="text-ink/75">{C.typePrompt}</span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") remove();
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={20}
              aria-label={C.typePrompt}
              className="mt-1.5 w-full rounded-full border border-line bg-paper px-4 py-2.5 font-mono text-sm tracking-wide uppercase outline-none focus:border-[#B4322E]"
            />
          </label>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{C.keep}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || !ready}
            className="bg-[#B4322E] text-white hover:bg-[#9A2A27] disabled:opacity-50"
            onClick={(e) => {
              e.preventDefault();
              remove();
            }}
          >
            {busy ? C.deleting : C.button}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
