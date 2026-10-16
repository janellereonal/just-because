/**
 * The legal pages, in plain language. Drafts until reviewed (SITE.legalDraft).
 * Each page is a list of sections; each section has a heading and paragraphs
 * or bullet lists. Keep it plain, no em dashes.
 */
import { SITE } from "@/config/site";
import { TIERS } from "@/config/pricing";

export type LegalBlock = string | { list: string[] };
export type LegalSection = { h: string; body: LegalBlock[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

const email = SITE.contactEmail;
const plans = TIERS.map((t) => `${t.name}: ${t.liveFor.label}`).join(", ");

export const PRIVACY: LegalDoc = {
  title: "Privacy policy",
  intro: `This explains what ${SITE.name} collects, why, who helps us run the service, how long we keep things and how to ask us to delete them. We follow the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) and treat everything people add to a gift as personal and private.`,
  sections: [
    {
      h: "Who we are",
      body: [`${SITE.name} (${SITE.url}) makes group gift pages. One person sets up a gift, friends add notes through a shared link, and the person it's for opens one finished page. You can reach us at ${email}.`],
    },
    {
      h: "What we collect",
      body: [
        "From organisers (people who make a gift):",
        { list: ["Your name, email address and password (stored only as a secure hash), or your Google account name and email if you sign in with Google.", "The gift you set up: who it's for, its words, theme, colors, sections and any pictures you upload for it.", "Payment records: which plan you bought, the amount and the payment reference. Card and wallet details are handled by our payment provider and never reach us."] },
        "From friends (people who add to a gift):",
        { list: ["The name you type, and what you add: letters, photos, voice notes, videos, drawings, song links and answers.", "A random device id kept on your phone or computer, so you can edit your own note and so we can count how many people joined. It doesn't identify you."] },
        "From everyone:",
        { list: ["Basic technical data our hosting needs to run and protect the site, such as your IP address, browser type and the pages you open. We use this for security, rate limits and fixing errors, not for advertising."] },
      ],
    },
    {
      h: "Why we use it",
      body: [{ list: ["To make, show and deliver the gift you asked for.", "To let friends add to a gift and edit their own notes.", "To take payment and send receipts and gift emails (for example, that a new note is waiting, or that a gift is live).", "To keep the service safe: stopping spam and abuse, and looking into reports.", "To understand, in total numbers, how the service is used so we can improve it. We don't sell your data or use it for ads."] }, "Our legal bases are the contract with you (making the gift you asked for), your consent (for anything optional) and our legitimate interest in running a safe service."],
    },
    {
      h: "Who can see a gift",
      body: [
        "A gift page is reached by its link. Anyone with the link can open it, so share it with care.",
        { list: ["Friends only see notes the organiser has approved. Ornaments marked for the recipient only are never sent to other visitors.", "The organiser sees every note, including ones waiting for approval.", "Password-protected gifts only open with the password.", "Private gift pages are hidden from search engines."] },
      ],
    },
    {
      h: "Who helps us run the service",
      body: [
        "We use these providers (processors). They only use your data to provide their service to us.",
        { list: [
          "Vercel (United States): hosting and running the site, and Vercel Blob for storing photos, voice notes and videos.",
          "Neon (United States): our database.",
          "PayMongo (Philippines): taking payments.",
          "Resend (United States): sending emails.",
          "Google (United States): sign-in with Google, if you choose it, and the web fonts the pages load.",
          "Spotify and YouTube: if a friend adds a song link, the player is loaded from them when the gift is opened.",
        ] },
        "Some of these providers store data outside the Philippines. We pick providers that protect it to a standard comparable to the Data Privacy Act.",
      ],
    },
    {
      h: "How long we keep things",
      body: [`A gift stays open for the length of its plan (${plans}), and the organiser can extend it. After a plan ends, the gift stops opening and we keep its contents for 90 days so the organiser can extend or download it, then we delete them. Drafts that were never paid for are deleted after 12 months without changes. If you delete a gift or your account, we delete its contents straight away, apart from payment records we must keep by law.`],
    },
    {
      h: "Your rights",
      body: [
        "Under the Data Privacy Act you can ask to see, correct, download or delete your personal data, object to how we use it, and complain to the National Privacy Commission (privacy.gov.ph).",
        { list: ["Organisers can edit or delete a gift, and delete their account, from My gifts.", "Friends can edit or delete their own note while the gift is still being made. After that, ask the organiser, or write to us.", `For anything else, email ${email}. We answer within 15 days.`] },
      ],
    },
    { h: "Children", body: ["The service is for people aged 16 and over. Organisers who make a gift for a child are responsible for what is added to it."] },
    { h: "Security", body: ["Connections are encrypted, passwords are hashed, payments run through PayMongo, and only the organiser can manage a gift. No service is perfectly secure. If something goes wrong that affects you, we'll tell you and the National Privacy Commission as the law requires."] },
    { h: "Changes", body: ["If we change this policy in a way that matters, we'll update the date at the top and tell organisers by email."] },
  ],
};

export const TERMS: LegalDoc = {
  title: "Terms of use",
  intro: `These terms are the agreement between you and ${SITE.name} when you use ${SITE.url}. By making a gift, adding to one or buying a plan, you agree to them.`,
  sections: [
    { h: "The service", body: ["You can make a gift page, invite friends to add notes, photos, songs and more, and send it to someone. Making, editing and collecting notes is free. Opening the finished gift to the recipient needs a paid plan."] },
    { h: "Your account", body: ["Keep your sign-in details safe. You're responsible for what happens in your account. You must be 16 or older to make an account."] },
    {
      h: "What you add",
      body: [
        "You keep the rights to everything you add. You give us permission to store it, show it to the people you share the gift with, and make the copies needed to run the service (for example, smaller versions of photos).",
        "Only add things you have the right to share, and only add photos or recordings of other people if they'd be happy to be in the gift.",
      ],
    },
    {
      h: "Acceptable use",
      body: [
        "Please don't use the service to:",
        { list: ["harass, threaten or bully anyone, or share someone's private information without permission", "share sexual content involving anyone under 18, or any illegal content", "share hate, violence, scams, spam or malware", "pretend to be someone else in a way that misleads people", "break the site, get around its limits, or access gifts that aren't yours"] },
        "Anyone can report a gift with the Report link at the bottom of a gift or friend page. We may hide or remove gifts or accounts that break these rules, without a refund where the rules were clearly broken.",
      ],
    },
    { h: "Organisers", body: ["The organiser approves what appears in a gift and is responsible for who they share the link with."] },
    { h: "Plans and payment", body: [`Prices are shown in Philippine pesos before you pay, with an approximate amount in US dollars. A plan opens one gift for a set time (${plans}). Payments are handled by PayMongo. Refunds follow our Refund policy.`] },
    { h: "Availability", body: ["We work hard to keep gifts online, but the service is provided as is. We can't promise it will never be interrupted."] },
    { h: "Liability", body: ["To the extent the law allows, we aren't liable for indirect losses, and our total liability to you is limited to what you paid us in the 12 months before the claim. Nothing in these terms limits rights you have under Philippine consumer law."] },
    { h: "Ending", body: ["You can delete your gifts or account at any time. We may suspend accounts that break these terms."] },
    { h: "Law", body: ["These terms are governed by the laws of the Republic of the Philippines."] },
    { h: "Contact", body: [`Questions about these terms: ${email}.`] },
  ],
};

export const REFUNDS: LegalDoc = {
  title: "Refund policy",
  intro: "We want every gift to land well. Here's when you can get your money back.",
  sections: [
    {
      h: "You can get a full refund if",
      body: [{ list: ["you were charged twice for the same gift", "you paid but the gift didn't open because of a problem on our side, and we couldn't fix it within 3 days", "you ask within 7 days of paying and the recipient hasn't opened the gift yet"] }],
    },
    { h: "We can't refund", body: [{ list: ["a gift the recipient has already opened", "a plan that has run its full length", "gifts removed for breaking our Terms of use"] }] },
    { h: "Upgrades and extensions", body: ["Upgrades and extensions follow the same rules, for the amount you paid for them."] },
    { h: "How to ask", body: [`Email ${email} with the email you paid with and the gift's link. We reply within 3 working days. Approved refunds go back to the way you paid, through PayMongo, and usually arrive in 5 to 10 working days depending on your bank or wallet.`] },
  ],
};

export const CONTACT = {
  title: "Contact us",
  intro: "Questions, problems with a gift, refund requests or privacy requests. A real person reads every message.",
  email,
  topics: ["A problem with a gift", "Payments and refunds", "Privacy or deleting my data", "Reporting a gift", "Something else"],
  reply: "We usually reply within 2 working days.",
  report: "To report a gift, you can also use the Report link at the bottom of the gift or friend page.",
} as const;
