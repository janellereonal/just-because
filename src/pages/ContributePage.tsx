import { useEffect, useMemo, useRef, useState } from "react";
import {useParams} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteOwnContribution, getGiftRoom, submitContribution, updateOwnContribution } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { getDeviceId } from "@/lib/device";
import {
  FONT_PAIRINGS,
  GUEST_MODULES,
  fetchCalendarEntries,
  fetchContributions,
  fetchModules,
  fetchSealedContributions,
  fetchSiteBySlug,
  fetchTheme,
  resolvePalette,
  ORNAMENTS,
  type Contribution,
  type OrnamentKey,
  type ModuleType,
  type ViewContribution,
} from "@/lib/gift";
import { readableInk, surfaceColor } from "@/lib/palettes";
import { GiftSiteView } from "@/components/GiftSiteView";
import { ComicIssueView } from "@/components/ComicIssueView";
import { ModuleExample } from "@/components/ModuleExample";
import Bo from "@/components/Bo";
import { PageError, PageLoading, PageNotFound } from "@/components/PageStates";


/* ---- remembering this device's own contributions ---- */

type MineRecord = {
  id: string;
  edit_token: string;
  module_type: ModuleType;
  author_name: string;
  text_content: string | null;
  media_url: string | null;
  external_link: string | null;
  ornament_key: OrnamentKey | null;
  visibility: "public" | "recipient";
  created_at: string;
};

const mineKey = (siteId: string) => `jb:mine:${siteId}`;

function readMine(siteId: string): MineRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(mineKey(siteId));
    return raw ? (JSON.parse(raw) as MineRecord[]) : [];
  } catch {
    return [];
  }
}

function writeMine(siteId: string, records: MineRecord[]) {
  try {
    window.localStorage.setItem(mineKey(siteId), JSON.stringify(records));
  } catch {
    /* private browsing */
  }
}

function toView(record: MineRecord, siteId: string): ViewContribution {
  return {
    id: record.id,
    site_id: siteId,
    module_type: record.module_type,
    author_name: record.author_name,
    text_content: record.text_content,
    media_url: record.media_url,
    external_link: record.external_link,
    status: "pending",
    created_at: record.created_at,
    ornament_key: record.ornament_key,
    visibility: record.visibility,
    mine: true,
  };
}

function ContributePage() {
  const { slug } = useParams({ from: "/contribute/$slug" });
  const queryClient = useQueryClient();
  const { data: site, isLoading, error: siteError, refetch: refetchSite } = useQuery({
    queryKey: ["site-slug", slug],
    queryFn: () => fetchSiteBySlug(slug),
  });
  const siteId = site?.id ?? null;
  const { data: theme = null } = useQuery({
    queryKey: ["theme", site?.theme_id],
    queryFn: () => fetchTheme(site?.theme_id ?? null),
    enabled: !!site,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["modules", siteId],
    queryFn: () => fetchModules(siteId!),
    enabled: !!siteId,
  });
  /* Sealed rows carry name + section only — never other people's words or media. */
  const { data: sealed = [] } = useQuery({
    queryKey: ["sealed", siteId],
    queryFn: () => fetchSealedContributions(siteId!),
    enabled: !!siteId,
  });
  /* Only fetched when the creator lets friends read each other's notes. */
  const { data: shared = [] } = useQuery({
    queryKey: ["shared-contributions", siteId],
    queryFn: () => fetchContributions(siteId!, true),
    enabled: !!siteId && site?.share_notes === true,
  });
  const { data: calendarEntries = [] } = useQuery({
    queryKey: ["calendar", siteId],
    queryFn: () => fetchCalendarEntries(siteId!),
    enabled: !!siteId,
  });

  /* Paid plans have caps. Knowing up front lets us say so kindly instead of failing. */
  const { data: room, refetch: refetchRoom } = useQuery({
    queryKey: ["room", siteId],
    queryFn: () => getGiftRoom({ data: { siteId: siteId! } }),
    enabled: !!siteId,
  });
  const [fullReason, setFullReason] = useState<"contributors" | "photos" | "ended" | null>(null);

  const [mine, setMine] = useState<MineRecord[]>([]);
  useEffect(() => {
    if (siteId) setMine(readMine(siteId));
  }, [siteId]);

  const [moduleType, setModuleType] = useState<ModuleType | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [ornament, setOrnament] = useState<OrnamentKey>("bauble");
  const [visibility, setVisibility] = useState<"public" | "recipient">("public");
  const [treeStep, setTreeStep] = useState<1 | 2>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const giftRef = useRef<HTMLDivElement | null>(null);

  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  /* Scroll the friend's own item into view right after they send it. */
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => {
      giftRef.current?.querySelector("[data-mine='true']")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [done, submitCount]);

  if (isLoading) {
    return <PageLoading label="Loading this gift…" />;
  }
  if (siteError) {
    return (
      <PageError
        message="We couldn't load this gift just now. Please try again."
        onRetry={() => void refetchSite()}
        showHeader={false}
      />
    );
  }
  if (!site) {
    return (
      <PageNotFound
        message="This gift link doesn't lead anywhere. Double-check the link you were sent."
        showHeader={false}
      />
    );
  }

  const palette = resolvePalette(theme, site.custom_colors);
  const ink = readableInk(palette.background);
  const onAccent = readableInk(palette.accent);
  const surface = surfaceColor(palette.background);
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.romantic;
  const recipient = site.custom_text.recipient_name || site.title;
  const openModules = GUEST_MODULES.filter((m) =>
    modules.some((row) => row.module_type === m.type && row.enabled),
  );
  const active = moduleType ?? openModules[0]?.type ?? null;
  const fieldStyle = {
    backgroundColor: palette.background,
    color: ink,
    border: `1px solid ${ink}22`,
  };
  const canEdit = site.status !== "published";
  const giftEnded = room?.ended || fullReason === "ended";
  /* Someone who already added something can still add more; new names can't. */
  const noRoomForNewPeople = (room?.contributorsFull && mine.length === 0) || fullReason === "contributors";
  const photosFull = room?.photosFull || fullReason === "photos";
  if (giftEnded || noRoomForNewPeople) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center" style={{ backgroundColor: palette.background, color: ink }}>
        <div className="max-w-md">
          <Bo pose="idle" size={140} title="Bo" />
          <h1 className="mt-4 text-3xl font-medium tracking-tight" style={{ fontFamily: fonts.heading }}>
            {giftEnded ? "This gift has ended" : "This gift is full"}
          </h1>
          <p className="mt-2 opacity-80 text-pretty">
            {giftEnded
              ? `${recipient}'s gift isn't taking new notes any more. Thank you for wanting to add something.`
              : `So many people wanted to add to ${recipient}'s gift that it ran out of room. If the organiser makes more room, this link will work again.`}
          </p>
        </div>
      </div>
    );
  }

  const mineIds = new Set(mine.map((m) => m.id));
  const sharedById = new Map(shared.map((c) => [c.id, c]));
  const giftContributions: ViewContribution[] = [
    ...sealed
      .filter((item) => !mineIds.has(item.id))
      .map((item) => {
        const open = sharedById.get(item.id);
        /* "Only the recipient" notes stay sealed even when sharing is on. */
        return open && item.visibility === "public" ? ({ ...open } as ViewContribution) : item;
      }),
    ...mine.map((record) => toView(record, site.id)),
  ];
  const friendCount = new Set(giftContributions.map((c) => c.author_name.toLowerCase())).size;

  function resetForm() {
    setText("");
    setLink("");
    setFile(null);
    setTreeStep(1);
    setEditingId(null);
  }

  function startEdit(record: MineRecord) {
    setModuleType(record.module_type);
    setEditingId(record.id);
    setName(record.author_name);
    setText(record.text_content ?? "");
    setLink(record.external_link ?? "");
    setVisibility(record.visibility);
    setFile(null);
    if (record.ornament_key) setOrnament(record.ornament_key);
    setTreeStep(2);
    setDone(false);
  }

  async function removeMine(record: MineRecord) {
    const result = await deleteOwnContribution({
      data: { id: record.id, token: record.edit_token },
    }).catch(() => null);
    if (!result?.ok) {
      toast.error("That can't be removed any more.");
      return;
    }
    const next = mine.filter((m) => m.id !== record.id);
    setMine(next);
    writeMine(site!.id, next);
    void queryClient.invalidateQueries({ queryKey: ["sealed", site!.id] });
    toast.success("Removed.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !site) return;
    if (active === "photobooth" && !file && !editingId) {
      toast.error("Please choose a photo.");
      return;
    }
    if (active === "letters" && !text.trim()) {
      toast.error("Please write a message.");
      return;
    }
    if (active === "songs" && !link.trim()) {
      toast.error("Please paste a Spotify or YouTube link.");
      return;
    }
    if (active === "wordcloud" && !text.trim()) {
      toast.error("Please add at least one word.");
      return;
    }
    if (active === "voice" && !file && !editingId) {
      toast.error("Please choose an audio file.");
      return;
    }
    if (active === "tree" && !text.trim()) {
      toast.error("Please leave a message for your ornament.");
      return;
    }
    setBusy(true);
    let mediaPath: string | null = null;
    if (file) {
      try {
        mediaPath = await uploadFile(file, "contribution", site.id);
      } catch {
        setBusy(false);
        toast.error("That file couldn't be uploaded.");
        return;
      }
    }

    if (editingId) {
      const record = mine.find((m) => m.id === editingId);
      if (!record) {
        setBusy(false);
        return;
      }
      const result = await updateOwnContribution({
        data: {
          id: record.id,
          token: record.edit_token,
          textContent: text.trim() || null,
          externalLink: link.trim() || null,
          mediaUrl: mediaPath,
          visibility: active === "tree" ? visibility : "public",
        },
      }).catch(() => null);
      setBusy(false);
      if (!result?.ok) {
        toast.error("That can't be changed any more.");
        return;
      }
      const next = mine.map((m) =>
        m.id === record.id
          ? {
              ...m,
              text_content: text.trim() || null,
              external_link: link.trim() || null,
              media_url: mediaPath ?? m.media_url,
              visibility: active === "tree" ? visibility : m.visibility,
            }
          : m,
      );
      setMine(next);
      writeMine(site.id, next);
      setFile(null);
      setSubmitCount((c) => c + 1);
      setEditingId(null);
      setDone(true);
      toast.success("Updated.");
      return;
    }

    const editToken = crypto.randomUUID();
    const newId = crypto.randomUUID();
    /* Pending rows aren't readable by guests, so the id is minted here. */
    let failed = false;
    if (active === "countdown" || active === "calendar") {
      setBusy(false);
      return;
    }
    let full: "contributors" | "photos" | "ended" | null = null;
    try {
      const result = await submitContribution({
        data: {
          id: newId,
          editToken,
          siteId: site.id,
          moduleType: active,
          authorName: name.trim() || "Anonymous",
          textContent: text.trim() || null,
          mediaUrl: mediaPath,
          externalLink: link.trim() || null,
          ornamentKey: active === "tree" ? ornament : null,
          visibility: active === "tree" ? visibility : "public",
          deviceId: getDeviceId(),
        },
      });
      full = result.full;
    } catch {
      failed = true;
    }
    setBusy(false);
    if (full) {
      setFullReason(full);
      void refetchRoom();
      return;
    }
    if (failed) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    const record: MineRecord = {
      id: newId,
      edit_token: editToken,
      module_type: active,
      author_name: name.trim() || "Anonymous",
      text_content: text.trim() || null,
      media_url: mediaPath,
      external_link: link.trim() || null,
      ornament_key: active === "tree" ? ornament : null,
      visibility: active === "tree" ? visibility : "public",
      created_at: new Date().toISOString(),
    };
    const next = [...mine, record];
    setMine(next);
    writeMine(site.id, next);
    setFile(null);
    void queryClient.invalidateQueries({ queryKey: ["sealed", site.id] });
    setSubmitCount((count) => count + 1);
    setDone(true);
  }

  const dropZone = (kind: "photo" | "voice note") => (
    <label
      className="mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm"
      style={{ borderColor: `${ink}33` }}
    >
      <input
        type="file"
        accept={kind === "photo" ? "image/*" : "audio/*"}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
      {file ? (
        <>
          {kind === "photo" && filePreview ? (
            <img src={filePreview} alt="" className="h-24 w-24 rounded-xl object-cover" />
          ) : filePreview ? (
            <audio controls src={filePreview} className="w-full" />
          ) : null}
          <span className="max-w-full truncate font-medium">{file.name}</span>
          <span className="underline opacity-70">Change</span>
        </>
      ) : (
        <>
          <span className="text-xl" aria-hidden>
            ⬆
          </span>
          <span className="font-medium">Tap to choose a {kind}</span>
        </>
      )}
    </label>
  );

  return (
    <div
      className="min-h-screen px-5 py-12"
      style={{ backgroundColor: palette.background, color: ink, fontFamily: fonts.body }}
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,460px)_1fr]">
        <div>
          {done ? (
            <div className="flex items-center justify-center gap-3 text-left">
              <Bo pose="delivery" size={120} animateKey={submitCount} />
              <p className="max-w-[14ch] text-2xl leading-tight" style={{ fontFamily: fonts.heading }}>
                Your note is on its way to {recipient}
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <Bo pose="delivery" size={120} animateKey={submitCount} />
              </div>
              <p
                className="mt-2 text-center text-[11px] tracking-[0.2em] uppercase"
                style={{ color: palette.accent }}
              >
                You've been invited
              </p>
              <h1
                className="mt-3 text-center text-4xl leading-tight"
                style={{ fontFamily: fonts.heading }}
              >
                Add something for {recipient}
              </h1>
              {site.custom_text.intro_message ? (
                <p className="mt-3 text-center text-sm opacity-80">
                  {site.custom_text.intro_message}
                </p>
              ) : null}
            </>
          )}

          {done ? (
            <div className="mt-8 rounded-3xl p-8 text-center" style={{ backgroundColor: surface }}>
              <p className="text-sm opacity-80">
                Your contribution is waiting for the organiser to add it in.
              </p>
              <button
                onClick={() => {
                  setDone(false);
                  resetForm();
                }}
                className="mt-6 rounded-full px-5 py-2.5 text-sm font-medium"
                style={{ backgroundColor: palette.accent, color: onAccent }}
              >
                Add something else
              </button>
            </div>
          ) : openModules.length === 0 ? (
            <p className="mt-10 text-center text-sm opacity-80">
              This gift isn't accepting contributions right now.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-8 rounded-3xl p-6" style={{ backgroundColor: surface }}>
              <div className="flex flex-wrap gap-2">
                {openModules.map((mod) => (
                  <button
                    key={mod.type}
                    type="button"
                    onClick={() => {
                      setModuleType(mod.type);
                      setEditingId(null);
                      if (mod.type === "tree") setTreeStep(1);
                    }}
                    className="rounded-full px-4 py-2 text-sm font-medium"
                    style={
                      active === mod.type
                        ? { backgroundColor: palette.accent, color: onAccent }
                        : { border: `1px solid ${ink}33`, color: ink }
                    }
                  >
                    {mod.contributorPrompt}
                  </button>
                ))}
              </div>

              {active ? (
                <div className="mt-4 max-w-[240px]">
                  <p className="mb-2 text-xs opacity-70">Here's how it will look:</p>
                  <ModuleExample
                    type={active}
                    tone={{ bg: palette.background, ink, accent: palette.accent }}
                  />
                </div>
              ) : null}

              {active === "tree" && treeStep === 1 ? (
                <div className="mt-6">
                  <p className="text-sm font-medium">1. Pick an ornament</p>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {ORNAMENTS.map(([key, label, glyph]) => (
                      <button
                        key={key}
                        type="button"
                        title={label}
                        aria-label={label}
                        onClick={() => setOrnament(key)}
                        className="grid aspect-square place-items-center rounded-xl border text-2xl"
                        style={{
                          borderColor: ornament === key ? palette.accent : `${ink}22`,
                          backgroundColor: ornament === key ? `${palette.accent}22` : palette.background,
                        }}
                      >
                        {glyph}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTreeStep(2)}
                    className="mt-5 w-full rounded-full px-5 py-3 font-medium"
                    style={{ backgroundColor: palette.accent, color: onAccent }}
                  >
                    Next: leave a message
                  </button>
                </div>
              ) : null}

              {active !== "tree" || treeStep === 2 ? (
                <>
                  {active === "tree" ? (
                    <div className="mt-5 text-center">
                      <span className="text-5xl">
                        {ORNAMENTS.find(([key]) => key === ornament)?.[2]}
                      </span>
                      <p className="mt-2 text-sm font-medium">2. Leave a message</p>
                      <button
                        type="button"
                        onClick={() => setTreeStep(1)}
                        className="mt-2 text-xs underline opacity-80"
                      >
                        Choose another ornament
                      </button>
                    </div>
                  ) : null}
                  <label className="mt-5 block text-sm font-medium">
                    {active === "tree" ? "From" : "Your name"}
                  </label>
                  <input
                    value={name}
                    maxLength={active === "tree" ? 20 : undefined}
                    disabled={!!editingId}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={active === "tree" ? "Nickname" : "Who's this from?"}
                    className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  />
                </>
              ) : null}

              {active === "photobooth" && photosFull && !editingId ? (
                <p className="mt-5 rounded-2xl px-4 py-3 text-sm" style={{ border: `1px solid ${ink}22` }}>
                  This gift has all the photos it can hold. You can still leave a note in another section.
                </p>
              ) : active === "photobooth" ? (
                <>
                  <label className="mt-4 block text-sm font-medium">Photo</label>
                  {dropZone("photo")}
                  <label className="mt-4 block text-sm font-medium">Caption (optional)</label>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  />
                </>
              ) : null}

              {active === "letters" ? (
                <>
                  <label className="mt-4 block text-sm font-medium">Your message</label>
                  <textarea
                    rows={5}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  />
                </>
              ) : null}

              {active === "songs" ? (
                <>
                  <label className="mt-4 block text-sm font-medium">Spotify or YouTube link</label>
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://open.spotify.com/track/…"
                    className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  />
                  <label className="mt-4 block text-sm font-medium">Why this song? (optional)</label>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  />
                </>
              ) : null}

              {active === "wordcloud" ? (
                <>
                  <label className="mt-4 block text-sm font-medium">
                    A few words that describe them
                  </label>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="kind, funny, unstoppable"
                    className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  />
                  <p className="mt-2 text-xs opacity-70">Separate words with commas.</p>
                </>
              ) : null}

              {active === "voice" ? (
                <>
                  <label className="mt-4 block text-sm font-medium">Your voice note</label>
                  {dropZone("voice note")}
                  <label className="mt-4 block text-sm font-medium">A short note (optional)</label>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  />
                </>
              ) : null}

              {active === "tree" && treeStep === 2 ? (
                <>
                  <label className="mt-4 block text-sm font-medium">Message</label>
                  <textarea
                    rows={5}
                    maxLength={500}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="mt-2 w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={fieldStyle}
                  />
                  <p className="mt-1 text-right text-xs opacity-70">{text.length}/500</p>
                </>
              ) : null}

              {active !== "tree" || treeStep === 2 ? (
                <fieldset className="mt-4">
                  <legend className="text-sm font-medium">Who can read this?</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["public", "recipient"] as const).map((option) => (
                      <label
                        key={option}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm"
                        style={{ borderColor: visibility === option ? palette.accent : `${ink}22` }}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          checked={visibility === option}
                          onChange={() => setVisibility(option)}
                        />
                        {option === "public" ? "Anyone with the link" : `🔒 Only ${recipient}`}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {active !== "tree" || treeStep === 2 ? (
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-6 w-full rounded-full px-5 py-3.5 font-medium disabled:opacity-60"
                  style={{ backgroundColor: palette.accent, color: onAccent }}
                >
                  {busy ? "Sending…" : editingId ? "Save changes" : "Send it"}
                </button>
              ) : null}
              <p className="mt-3 text-center text-xs opacity-70">
                No account needed. The organiser sees it before it goes up.
              </p>
            </form>
          )}

          {mine.length > 0 ? (
            <div className="mt-6 rounded-3xl p-5" style={{ backgroundColor: surface }}>
              <p className="text-sm font-medium">What you've added</p>
              <ul className="mt-3 space-y-2 text-sm">
                {mine.map((record) => (
                  <li key={record.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate opacity-85">
                      {record.text_content || record.external_link || record.media_url || "Your item"}
                    </span>
                    {canEdit ? (
                      <span className="flex shrink-0 gap-3 text-xs">
                        <button type="button" className="underline" onClick={() => startEdit(record)}>
                          Edit
                        </button>
                        <button type="button" className="underline" onClick={() => void removeMine(record)}>
                          Delete
                        </button>
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs opacity-70">Gift is published</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium" style={{ fontFamily: fonts.heading }}>
              Here's the gift so far
            </h2>
            <p className="text-xs opacity-70">
              {friendCount === 0
                ? "Be the first to add something"
                : `${friendCount} friend${friendCount === 1 ? " has" : "s have"} added something so far`}
            </p>
          </div>
          <div
            ref={giftRef}
            className="mt-3 max-h-[75vh] overflow-y-auto rounded-3xl ring-1 ring-black/5"
            style={{ backgroundColor: palette.background }}
          >
            {site.format === "comic" ? (
              <ComicIssueView site={site} modules={modules} contributions={giftContributions} calendarEntries={calendarEntries} palette={palette} sample />
            ) : (
              <GiftSiteView site={site} theme={theme} modules={modules} contributions={giftContributions} calendarEntries={calendarEntries} sample />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Contribution };

export default ContributePage;
