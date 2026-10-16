/**
 * Transactional email through Resend's HTTP API. Without RESEND_API_KEY
 * (local dev) emails are printed to the server log instead of sent.
 */

export function siteUrl() {
  if (process.env["APP_BASE_URL"]) return process.env["APP_BASE_URL"].replace(/\/$/, "");
  if (process.env["BETTER_AUTH_URL"]) return process.env["BETTER_AUTH_URL"].replace(/\/$/, "");
  if (process.env["VERCEL_PROJECT_PRODUCTION_URL"])
    return `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  return "http://localhost:8080";
}

export function emailEnabled() {
  return Boolean(process.env["RESEND_API_KEY"] && process.env["EMAIL_FROM"]);
}

type Mail = { to: string; subject: string; heading: string; body: string[]; button?: { label: string; url: string }; footnote?: string };

const C = {
  paper: "#FBF8F2",
  cream: "#F4EEE3",
  line: "#D9CFC0",
  ink: "#2B2522",
  muted: "#6B5E52",
  terracotta: "#B5623E",
};

function escape(text: string) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function render(mail: Mail) {
  const paragraphs = mail.body
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.ink}">${escape(p)}</p>`)
    .join("");
  const button = mail.button
    ? `<p style="margin:22px 0 8px"><a href="${escape(mail.button.url)}" style="display:inline-block;background:${C.terracotta};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px">${escape(mail.button.label)}</a></p>
       <p style="margin:0 0 14px;font-size:12px;color:${C.muted};word-break:break-all">Or paste this link: ${escape(mail.button.url)}</p>`
    : "";
  const foot = mail.footnote
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:${C.muted}">${escape(mail.footnote)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:${C.cream};font-family:'DM Sans',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.paper};border:1px solid ${C.line};border-radius:20px;padding:32px 28px">
      <tr><td>
        <p style="margin:0 0 18px;font-family:Georgia,serif;font-size:18px;font-weight:600;color:${C.ink}">Just <span style="color:${C.terracotta}">Because</span></p>
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:500;line-height:1.3;color:${C.ink}">${escape(mail.heading)}</h1>
        ${paragraphs}${button}${foot}
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:${C.muted}">Made with Just Because</p>
  </td></tr></table></body></html>`;
}

function plainText(mail: Mail) {
  return [mail.heading, "", ...mail.body, mail.button ? `\n${mail.button.label}: ${mail.button.url}` : "", mail.footnote ?? ""]
    .join("\n")
    .trim();
}

/** Sends one email. Never throws: a failed email shouldn't break the action that caused it. */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!emailEnabled()) {
    console.info(`[email:dev] to=${mail.to} subject="${mail.subject}"\n${plainText(mail)}`);
    return false;
  }
  try {
    const res = await fetch(process.env["RESEND_API_URL"] ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["RESEND_API_KEY"]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env["EMAIL_FROM"],
        to: [mail.to],
        subject: mail.subject,
        html: render(mail),
        text: plainText(mail),
        ...(process.env["EMAIL_REPLY_TO"] ? { reply_to: process.env["EMAIL_REPLY_TO"] } : {}),
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend refused:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}

/* ---- the four emails ---- */

export function verifyEmail(to: string, name: string, url: string) {
  return sendMail({
    to,
    subject: "Confirm your email for Just Because",
    heading: `Hi ${name || "there"}, one quick step`,
    body: ["Tap the button to confirm this is your email. Then you can start making gifts for the people you love."],
    button: { label: "Confirm my email", url },
    footnote: "If you didn't sign up for Just Because, you can ignore this email.",
  });
}

/** Someone tried to sign up with an email that already has an account. */
export function existingAccountEmail(to: string, name: string) {
  const base = siteUrl();
  return sendMail({
    to,
    subject: "You already have a Just Because account",
    heading: `Hi ${name || "there"}, you're already in`,
    body: [
      "Someone (hopefully you) tried to make a new account with this email, but you already have one.",
      "Sign in with your password. If you forgot it, you can set a new one from the sign-in page.",
    ],
    button: { label: "Sign in", url: `${base}/auth` },
    footnote: "If this wasn't you, you can ignore this email. Nothing changed on your account.",
  });
}

export function resetPasswordEmail(to: string, name: string, url: string) {
  return sendMail({
    to,
    subject: "Reset your Just Because password",
    heading: "Let's get you back in",
    body: [`Hi ${name || "there"}, someone (hopefully you) asked to reset your password. The link works for one hour.`],
    button: { label: "Choose a new password", url },
    footnote: "If you didn't ask for this, you can ignore it. Your password stays the same.",
  });
}

export function newNoteEmail(opts: {
  to: string;
  creatorName: string;
  recipient: string;
  authorName: string;
  pendingCount: number;
  editorUrl: string;
}) {
  const others = opts.pendingCount - 1;
  return sendMail({
    to: opts.to,
    subject: `${opts.authorName} added something to ${opts.recipient}'s gift`,
    heading: `${opts.authorName} just added to ${opts.recipient}'s gift`,
    body: [
      others > 0
        ? `You have ${opts.pendingCount} notes waiting for a look, including this one.`
        : "It's waiting for you to take a look and add it in.",
    ],
    button: { label: "Review notes", url: opts.editorUrl },
    footnote: "We send at most one of these every 30 minutes per gift, so your inbox stays calm.",
  });
}

export function giftLiveEmail(opts: { to: string; recipient: string; liveUrl: string; editorUrl: string }) {
  return sendMail({
    to: opts.to,
    subject: `${opts.recipient}'s gift is ready to open`,
    heading: `${opts.recipient}'s gift is wrapped up`,
    body: [`Everything everyone added is in one place now. Send the link to ${opts.recipient} whenever you're ready.`],
    button: { label: "Open the gift", url: opts.liveUrl },
    footnote: `Need to change something? You can still edit it here: ${opts.editorUrl}`,
  });
}

/** A visitor reported a gift. Goes to every admin. */
export function reportEmail(opts: { to: string; slug: string; reason: string; details: string | null; page: string; adminUrl: string }) {
  return sendMail({
    to: opts.to,
    subject: `Gift reported: ${opts.reason}`,
    heading: "Someone reported a gift",
    body: [`Reason: ${opts.reason}`, `Gift: /g/${opts.slug} (reported from the ${opts.page} page)`, ...(opts.details ? [`Details: ${opts.details}`] : [])],
    button: { label: "Review it in admin", url: opts.adminUrl },
  });
}

/** The receipt, sent once per paid order. A first payment also says the gift is live. */
export function receiptEmail(opts: {
  to: string;
  kind: "publish" | "upgrade" | "extend";
  recipient: string;
  planName: string;
  amount: string;
  orderId: string;
  paidOn: string;
  openUntil: string | null;
  liveUrl: string;
  editorUrl: string;
}) {
  const what =
    opts.kind === "publish" ? `${opts.planName} plan` : opts.kind === "upgrade" ? `Upgrade to ${opts.planName}` : `${opts.planName}, more time`;
  const heading =
    opts.kind === "publish"
      ? `${opts.recipient}'s gift is wrapped up`
      : opts.kind === "upgrade"
        ? `${opts.recipient}'s gift is on ${opts.planName} now`
        : `${opts.recipient}'s gift is open for longer`;
  return sendMail({
    to: opts.to,
    subject: opts.kind === "publish" ? `Receipt: ${opts.recipient}'s gift is ready to open` : `Receipt for ${opts.recipient}'s gift`,
    heading,
    body: [
      opts.kind === "publish" ? `Thank you. Everything everyone added is in one place now. Send the link to ${opts.recipient} whenever you're ready.` : "Thank you. Here's your receipt.",
      `Gift: ${opts.recipient}'s gift`,
      `Paid: ${opts.amount} for ${what}, on ${opts.paidOn}`,
      ...(opts.openUntil ? [`Open until: ${opts.openUntil}`] : []),
      `Order: ${opts.orderId}`,
    ],
    button: { label: "Open the gift", url: opts.liveUrl },
    footnote: `PayMongo also sends a payment receipt. Questions about this payment? Reply to this email. Manage the gift here: ${opts.editorUrl}`,
  });
}

/** Two weeks before a plan ends. */
export function expiryReminderEmail(opts: { to: string; recipient: string; endsOn: string; editorUrl: string; liveUrl: string }) {
  return sendMail({
    to: opts.to,
    subject: `${opts.recipient}'s gift closes on ${opts.endsOn}`,
    heading: `${opts.recipient}'s gift closes in two weeks`,
    body: [
      `The link stays open until ${opts.endsOn}. After that it shows a "this gift has been wrapped up" page, and everything friends added stays saved for you.`,
      "Want it open for longer? You can extend it from the editor. You can also download every note and photo there.",
    ],
    button: { label: "Extend or download", url: opts.editorUrl },
    footnote: `The gift: ${opts.liveUrl}`,
  });
}
