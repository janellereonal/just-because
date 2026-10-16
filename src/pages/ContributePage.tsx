import { OrnamentIcon } from "@/components/GiftTree";
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
import { FormatView } from "@/components/formats/FormatView";
import { DevicePreview, DeviceToggle, type PreviewDevice } from "@/components/DevicePreview";
import { ModuleExample } from "@/components/ModuleExample";
import { centerInScroller } from "@/lib/scroll";
import { themeKindOf } from "@/lib/themeKind";
import Bo from "@/components/Bo";
import { Brush, CalendarDays, CircleHelp, Hourglass, Image as ImageIcon, Lock, Mail, MailOpen, MapPin, Mic, Music2, Sparkles, Ticket, Trophy, Type, Users, Video } from "lucide-react";
import { SectionFields } from "@/components/sections/SectionFields";
import { SECTION_NEEDS, isNewSection, normalizeSectionData } from "@/lib/sections";
import { meshGradient } from "@/lib/giftPieces";

const MODULE_ICON: Partial<Record<ModuleType, typeof Mail>> = {
  letters: Mail, photobooth: ImageIcon, songs: Music2, wordcloud: Type, voice: Mic, tree: Sparkles, calendar: CalendarDays,
  openwhen: MailOpen, capsule: Hourglass, superlatives: Trophy, quiz: CircleHelp, map: MapPin, coupons: Ticket, video: Video, doodle: Brush,
};
/** Short tab names for the newer sections. */
const SHORT: Partial<Record<ModuleType, string>> = { openwhen: "Open-when", capsule: "Time capsule", superlatives: "Award", quiz: "Quiz", map: "Memory pin", coupons: "Coupon", video: "Video", doodle: "Doodle" };
import { PageError, PageLoading, PageNotFound } from "@/components/PageStates";
import { REPORT_COPY } from "@/copy/strings";
import { ReportGift } from "@/components/ReportGift";


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
  data?: Record<string, unknown> | null;
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
    data: record.data ?? null,
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
  const [sectionData, setSectionData] = useState<Record<string, unknown>>({});
  const giftRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef<HTMLDivElement | null>(null);
  const [device, setDevice] = useState<PreviewDevice>("phone");

  const filePreview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  /* Scroll the friend's own item into view right after they send it. */
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => {
      // The form collapses into a short message, so bring that message (and "Add something else") into view,
      // then show their note inside the preview without moving the page again.
      const card = doneRef.current?.getBoundingClientRect();
      if (card && (card.top < 0 || card.bottom > window.innerHeight)) {
        window.scrollTo({ top: window.scrollY + card.top - 96, behavior: "smooth" });
      }
      const mine = giftRef.current?.querySelector("[data-mine='true']");
      if (mine) centerInScroller(mine, giftRef.current);
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

  if (site.disabled_at) {
    return <PageNotFound title={REPORT_COPY.pausedTitle} message={REPORT_COPY.pausedBody} actionLabel={REPORT_COPY.makeYourOwn} actionTo="/" showHeader={false} />;
  }
  const palette = resolvePalette(theme, site.custom_colors);
  const ink = readableInk(palette.background);
  const onAccent = readableInk(palette.accent);
  const surface = surfaceColor(palette.background);
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.romantic;
  // Older gifts may have no recipient name; never fall back to the gift's name (often the organiser's own).
  const named = site.custom_text.recipient_name?.trim() ?? "";
  const recipient = named || "them";
  const theirGift = named ? `${named}'s gift` : "This gift";
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
  if (site.solo) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center" style={{ backgroundColor: palette.background, color: ink }}>
        <div className="max-w-md">
          <Bo pose="idle" size={140} title="Bo" />
          <h1 className="mt-4 text-3xl font-medium tracking-tight" style={{ fontFamily: fonts.heading }}>
            This one is a solo gift
          </h1>
          <p className="mt-2 opacity-80 text-pretty">
            {`${site.custom_text.recipient_name ? `${site.custom_text.recipient_name}'s gift` : "This gift"} is being made by one person, so it isn't taking notes from friends. If you were sent this link, ask them to switch it to "Me and friends".`}
          </p>
        </div>
      </div>
    );
  }
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
              ? `${theirGift} isn't taking new notes any more. Thank you for wanting to add something.`
              : `So many people wanted to add to ${named ? theirGift : "this gift"} that it ran out of room. If the organiser makes more room, this link will work again.`}
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
    setSectionData({});
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
    setSectionData(record.data ?? {});
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
    let cleanData: Record<string, unknown> | null = null;
    if (isNewSection(active)) {
      const needs = SECTION_NEEDS[active];
      const clean = normalizeSectionData(active, sectionData);
      if (!clean) {
        toast.error(active === "capsule" ? "Pick a date at least a day away." : active === "quiz" ? "Add the question, the right answer and at least one wrong one." : "Fill in the first field, please.");
        return;
      }
      if (needs.text === "required" && !text.trim()) {
        toast.error("Write a few words first.");
        return;
      }
      if (needs.media === "required" && !file && !editingId) {
        toast.error(active === "doodle" ? "Draw a little something first." : "Choose the file first.");
        return;
      }
      cleanData = clean as Record<string, unknown>;
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
          ...(cleanData ? { data: cleanData as Record<string, never> } : {}),
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
              data: cleanData ?? m.data ?? null,
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
          data: (cleanData as Record<string, never> | null) ?? null,
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
      data: cleanData,
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
      className="min-h-screen px-4 py-10 sm:px-6 sm:py-14"
      style={{ background: meshGradient(palette.primary, palette.accent, palette.background), color: ink, fontFamily: fonts.body }}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
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
                {named ? `Add something for ${named}` : "Add something to the gift"}
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-center text-[15px] leading-relaxed opacity-80 text-pretty">
                {named ? `Friends are putting together a gift for ${named}.` : "Friends are putting a gift together."} Add a note, a photo or a song. It stays a surprise until they open it.
              </p>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs opacity-70">
                <Users className="size-3.5" />
                {friendCount === 0 ? "Be the first one in" : `${friendCount} ${friendCount === 1 ? "friend has" : "friends have"} added something`}
              </p>
            </>
          )}

          {done ? (
            <div ref={doneRef} className="rise mt-8 rounded-[28px] p-8 text-center shadow-[0_24px_60px_-34px_rgba(43,37,34,.55)]" style={{ backgroundColor: surface }}>
              <p className="text-[15px] opacity-85">
                It's in. The organiser checks every note before the gift goes out, so {named || "they"} won't see it until then.
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
              This gift isn't taking notes right now.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-8 rounded-[28px] p-5 shadow-[0_24px_60px_-34px_rgba(43,37,34,.55)] sm:p-7" style={{ backgroundColor: surface }}>
              <p className="text-sm font-medium">What would you like to add?</p>
              <div className={`mt-3 grid gap-2 ${openModules.length === 1 ? "grid-cols-1" : openModules.length === 2 ? "grid-cols-2" : "grid-cols-3"}`} role="tablist" aria-label="What to add">
                {openModules.map((mod) => {
                  const Icon = MODULE_ICON[mod.type] ?? Mail;
                  const on = active === mod.type;
                  return (
                    <button
                      key={mod.type}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => {
                        setModuleType(mod.type);
                        setEditingId(null);
                        setSectionData({});
                        if (mod.type === "tree") setTreeStep(1);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center text-[13px] leading-tight font-medium transition-transform hover:-translate-y-0.5"
                      style={on ? { backgroundColor: palette.accent, color: onAccent } : { backgroundColor: palette.background, color: ink, boxShadow: `inset 0 0 0 1px ${ink}1a` }}
                    >
                      <Icon className="size-5" />
                      {SHORT[mod.type] ?? (mod.label === "Voice messages" ? "Voice note" : mod.label === "Word cloud" ? "A word" : mod.label === "Photobooth" ? "Photo" : mod.label === "Letters" ? "Letter" : mod.label === "Songs" ? "Song" : mod.label)}
                    </button>
                  );
                })}
              </div>

              {active && !isNewSection(active) ? (
                <div className="mt-5 max-w-[260px]">
                  <p className="mb-2 text-xs opacity-70">It'll look something like this</p>
                  <ModuleExample
                    type={active}
                    kind={themeKindOf(theme)}
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
                        className="squish grid aspect-square place-items-center rounded-2xl border p-1.5 transition-colors"
                        style={{
                          borderColor: ornament === key ? palette.accent : `${ink}22`,
                          backgroundColor: ornament === key ? `${palette.accent}22` : palette.background,
                        }}
                      >
                        <OrnamentIcon ornamentKey={key} className="size-full" />
                        <span className="sr-only">{glyph}</span>
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
                      <OrnamentIcon ornamentKey={ornament} big className="mx-auto size-24" />
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

              {active && isNewSection(active) ? (
                <SectionFields
                  type={active}
                  data={sectionData}
                  onData={setSectionData}
                  text={text}
                  onText={setText}
                  file={file}
                  onFile={setFile}
                  fieldStyle={fieldStyle}
                  accent={palette.accent}
                  onAccent={onAccent}
                />
              ) : null}

              {active === "tree" && treeStep === 2 ? (
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
                        {option === "public" ? (
                          "Everyone who sees the gift"
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Lock className="size-3.5" /> Only {named || "the recipient"}
                          </span>
                        )}
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
                No account needed. The organiser reads it first.
              </p>
            </form>
          )}

          {mine.length > 0 ? (
            <div className="mt-5 rounded-[24px] p-5" style={{ backgroundColor: surface }}>
              <p className="text-sm font-medium">What you've added</p>
              <ul className="mt-3 space-y-2 text-sm">
                {mine.map((record) => (
                  <li key={record.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate opacity-85">
                      {record.text_content || String(Object.values(record.data ?? {}).find((v) => typeof v === "string") ?? "") || record.external_link || (record.media_url ? "A file" : "Your item")}
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
                      <span className="shrink-0 text-xs opacity-70">Already sent</span>
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
          <DeviceToggle value={device} onChange={setDevice} size="sm" className="mt-3" />
          <div className="mt-3">
            <DevicePreview
              device={device}
              frame={device === "laptop"}
              phoneHeight="min(75svh, 760px)"
              scrollRef={giftRef}
              scrollLabel="The gift so far, scrollable"
            >
              <div style={{ backgroundColor: palette.background }}>
                <FormatView site={site} theme={theme} palette={palette} modules={modules} contributions={giftContributions} calendarEntries={calendarEntries} sample />
              </div>
            </DevicePreview>
          </div>
        </div>
      </div>
      <ReportGift slug={site.slug} page="contribute" tone={ink} />
    </div>
  );
}

export type { Contribution };

export default ContributePage;
