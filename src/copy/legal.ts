/**
 * The legal pages, in plain language. Drafts until reviewed (SITE.legalDraft).
 * Each page is a list of sections; each section has a heading and paragraphs
 * or bullet lists. Keep it plain, no em dashes.
 */
import { SITE } from "@/config/site";
import { TIERS } from "@/config/pricing";

export type LegalBlock = string | { list: string[] };
/** `summary` is a plain-English line shown above the section; the body is what counts. */
export type LegalSection = { h: string; summary?: string; body: LegalBlock[] };
/** `numbered` shows "1.", "2." before each heading and a list of sections at the top. */
export type LegalDoc = { title: string; intro: string; numbered?: boolean; sections: LegalSection[] };

const email = SITE.contactEmail;
const plans = TIERS.map((t) => `${t.name}: ${t.liveFor.label}`).join(", ");

export const PRIVACY: LegalDoc = {
  title: "Privacy policy",
  intro: `This policy explains what ${SITE.name} collects when you make a gift, add to one or open one, why we collect it, who helps us run the service, how long we keep it, and the choices you have. We follow the Philippine Data Privacy Act of 2012 (Republic Act No. 10173). Each section starts with a short summary in plain English. The summary helps you find your way, but the full text under it is what counts.`,
  numbered: true,
  sections: [
    {
      h: "What this policy covers",
      summary: "This is how Just Because handles information about the people who make gifts, the friends who add to them and the people who open them.",
      body: [
        `${SITE.name} (${SITE.url}) makes group gift pages. An organiser sets up a gift, friends add letters, photos, songs and more through a shared link, and the person the gift is for opens one finished page. In this policy, "${SITE.name}", "we" and "us" mean the team that runs the service, and "the service" means the website and everything on it.`,
        "This policy applies to everyone who uses the service: organisers (people who make a gift), friends (people who add to a gift), recipients (the person a gift is for) and visitors. If you don't want your information handled as described here, please don't use the service.",
      ],
    },
    {
      h: "Information we collect",
      summary: "We collect what you give us (your account, the gift and the notes in it), a little from Google if you sign in with it, and basic technical data that every website needs. We don't buy data about you from anyone.",
      body: [
        "(a) Information you give us",
        { list: [
          "Organisers: your name and email address, and a password, which we store only as a secure hash. If you sign in with Google, we receive your Google account name and email instead of a password.",
          "The gift you set up: the recipient's name or nickname, the words you write, the theme, colors, layout, sections, dates and any pictures you upload for it.",
          "Friends: the name you type and what you add to a gift, such as letters, photos, voice notes, videos, drawings, song links, quiz answers and map pins.",
          "Messages you send us, for example through the contact page, a report about a gift, or a request for us to set up a gift for you.",
          "Payment records: which plan you bought, the amount, the date and the payment reference. Your card, bank or e-wallet details go straight to our payment provider and never reach us.",
        ] },
        "(b) Information we receive from others",
        { list: [
          "Google, if you choose to sign in with Google: your name, email address and a technical id for your Google account. We don't receive your Google password or anything else in your Google account.",
          "PayMongo, our payment provider: whether a payment went through, the amount and a reference, so we can open your gift.",
        ] },
        "(c) Information collected automatically",
        { list: [
          "Basic technical data: your IP address, browser type, device type and the pages you open. Our hosting provider records this to run and protect the site. We use it for security, to limit spam and abuse, and to fix errors.",
          "Your approximate country, worked out from your IP address. We use it only as a country code (for example, PH), to understand in total numbers where gifts are made and opened. We don't keep your IP address with it and we don't collect your precise location.",
          "Error reports: if a page breaks, your browser can send us a short technical report. We remove names, emails and note content from these reports before they're stored.",
          "Product events: we count things like \"a gift was made\" or \"a note was added\" to see how the service is used. These events never include the words, photos or recordings in a note.",
        ] },
        "(d) Cookies and storage on your device",
        { list: [
          "Sign-in cookies keep you signed in as an organiser.",
          "If a gift has a password, a cookie remembers that you entered it, so you don't have to type it again.",
          "Friends' devices keep a random device id and a private edit key, so you can change or delete your own note and so we can count how many people joined. They don't identify who you are.",
          "Your browser also remembers small preferences, such as whether you've seen the opening of a gift or a short guide.",
          "We don't use advertising cookies, tracking pixels or third-party analytics.",
        ] },
        "(e) Photos",
        "Photos can carry hidden details, such as the place they were taken. We remove location details from photos when they're uploaded.",
      ],
    },
    {
      h: "How we use your information",
      summary: "We use your information to make and deliver the gift, take payment, send the emails the service needs, keep things safe and improve the service. We don't sell it, we don't use it for ads and we don't use your notes to train AI.",
      body: [
        { list: [
          "To provide the service: letting you sign in, make and edit a gift, invite friends, approve notes and send the finished gift.",
          "To let friends add to a gift and edit or delete their own notes.",
          "To take payment, open the gift for the length of your plan and send receipts.",
          "To send emails the service needs: confirming your email address, resetting your password, telling you a new note is waiting, telling you a gift is live and reminding you before a gift ends. We don't send marketing emails unless you've asked for them.",
          "To keep the service safe: limiting spam and abuse, looking into reports about a gift, and protecting accounts.",
          "To fix problems and answer your questions, including looking at a gift when you ask us for help with it.",
          "To understand, in total numbers, how the service is used so we can improve it.",
          "To follow the law and respond to valid legal requests.",
        ] },
        "We don't sell or rent your information. We don't show ads, and we don't share your information with advertisers. We don't use the contents of gifts (notes, photos, recordings or drawings) to train artificial intelligence.",
        "Our legal bases under the Data Privacy Act are: the contract with you (making and delivering the gift you asked for), your consent (for anything optional), our legitimate interest in running a safe and working service, and our legal obligations (for example, keeping payment records).",
      ],
    },
    {
      h: "How gifts are shared",
      summary: "A gift opens by its link, so anyone with the link can see it. Friends only see notes the organiser has approved. Share links with care, and use a password if you want an extra lock.",
      body: [
        "There are two links for each gift: the friends link, where people add notes, and the gift link, which the recipient opens. Anyone who has a link can use it, and people you send a link to can send it on.",
        { list: [
          "Every note waits for the organiser. Friends and recipients only see notes the organiser has approved.",
          "The organiser can see every note, including ones still waiting, and can hide or delete any of them.",
          "Ornaments and notes marked \"only for the recipient\" are never sent to other friends' browsers.",
          "On plans that include it, the organiser can add a password. The gift then only opens with that password.",
          "Gift pages and friend pages are hidden from search engines, so they don't show up in Google.",
          "A friend's name appears next to what they add, so the organiser and the recipient can see who wrote what.",
        ] },
        "Please don't add anything to a gift that you wouldn't want the organiser, the recipient or others with the link to see.",
      ],
    },
    {
      h: "Who helps us run the service",
      summary: "A few trusted companies host the site, store files, take payments and send emails for us. They only use your information to do that work.",
      body: [
        "We share information with these service providers only as far as they need it to provide their service to us. They're not allowed to use it for their own purposes.",
        { list: [
          "Vercel (United States): hosts and runs the website, and stores photos, voice notes and videos (Vercel Blob).",
          "Neon (United States): our database.",
          "PayMongo (Philippines): takes payments.",
          "Resend (United States): sends our emails.",
          "Google (United States): sign-in with Google, if you choose it, and the web fonts our pages load.",
        ] },
        "If a friend adds a Spotify or YouTube link, the player is loaded from Spotify or YouTube when the gift is opened. Those companies' own privacy policies apply to what happens inside their players.",
      ],
    },
    {
      h: "Other times we may share information",
      summary: "We'd only share information otherwise if the law requires it, to protect people from harm, in total numbers that don't identify anyone, or if the service changes hands (and we'd tell you first).",
      body: [
        { list: [
          "With authorities, when the law requires it or when we believe in good faith that it's needed to stop fraud, abuse, illegal activity or harm to someone.",
          "In total numbers that don't identify anyone, for example \"200 gifts were made last month\".",
          "If Just Because is merged, sold or reorganised, information may move to the new owner, who must keep protecting it as this policy says. We'll tell organisers by email before that happens.",
          "With your permission, for anything else.",
        ] },
      ],
    },
    {
      h: "Where your information is stored",
      summary: "Some of our providers store data outside the Philippines, mostly in the United States. We choose providers that protect it well.",
      body: [
        "Your information is stored and processed in the Philippines and in the countries where our service providers operate, mainly the United States. Those countries may have different data protection laws. We pick providers with strong security and privacy commitments, and we stay responsible for your information under the Data Privacy Act wherever it's stored.",
      ],
    },
    {
      h: "Keeping your information safe",
      summary: "We use encryption, hashed passwords and strict access rules. No website can promise perfect security, but we'll tell you if something goes wrong.",
      body: [
        { list: [
          "Connections to the site are encrypted.",
          "Passwords are stored only as secure hashes, so nobody, including us, can read them.",
          "Only the organiser (and our admins, when needed to help or keep the service safe) can manage a gift or see notes that are waiting for approval.",
          "Payments are handled by PayMongo. We never see card or e-wallet details.",
          "Repeated wrong guesses at a gift password are blocked for a while.",
        ] },
        "Please keep your password safe and be careful who you send gift links to. If a security problem affects your personal information, we'll tell you and the National Privacy Commission as the law requires.",
      ],
    },
    {
      h: "Your choices and rights",
      summary: "You can see, change, download or delete your information. Most of it you can do yourself. For anything else, email us.",
      body: [
        "Under the Data Privacy Act, you have the right to be informed, to access your information, to object, to have it corrected or deleted, to get a copy of it, to be compensated for damages, and to complain to the National Privacy Commission (privacy.gov.ph).",
        { list: [
          "Organisers can edit or delete a gift, download everything in it (notes, photos and voice notes) and delete their account from My gifts and Account.",
          "Friends can edit or delete their own note from the same device while the gift is still being made. After that, ask the organiser, or write to us.",
          "Recipients and anyone else named or shown in a gift can ask the organiser to remove it, or write to us.",
          `For any other request, or to withdraw consent you gave us, email ${email}. We may ask you to confirm who you are. We answer within 15 days.`,
        ] },
        "Sometimes we can't do everything that's asked. For example, we may need to keep payment records for tax rules, or a request may affect another person's rights. If so, we'll explain why.",
      ],
    },
    {
      h: "How long we keep your information",
      summary: "A gift stays for its plan, plus 90 days so you can extend or download it. Then it's deleted. Deleting a gift or account deletes its contents straight away.",
      body: [
        `A gift stays open for the length of its plan (${plans}), and the organiser can extend it. After a plan ends, the gift stops opening and we keep its contents for 90 days, so the organiser can extend it or download everything. Then we delete them.`,
        "Draft gifts that were never paid for are deleted after 12 months without changes. If you delete a gift or your account, we delete its contents, including photos, voice notes and videos, straight away.",
        "We keep payment records for as long as tax and accounting rules require, even after a gift or account is deleted, but without the gift's contents. Server logs and error reports are kept for a short time and then deleted. Backups are overwritten on a regular schedule.",
      ],
    },
    {
      h: "Children",
      summary: "You need to be at least 16 to make a gift or add to one. Gifts can be for children, but the organiser is responsible for what goes in them.",
      body: [
        "The service is meant for people aged 16 and over. We don't knowingly collect information from younger children without a parent's or guardian's permission. Organisers who make a gift for a child are responsible for what is added to it. If you think a child has given us information without permission, email us and we'll delete it.",
      ],
    },
    {
      h: "Links to other websites",
      summary: "If you leave Just Because through a link, that website's own privacy policy applies.",
      body: [
        "Gifts can contain links to other websites, and song links open players from Spotify or YouTube. We don't control those websites, and this policy doesn't cover them. Please read their privacy policies.",
      ],
    },
    {
      h: "Changes to this policy",
      summary: "If we change something important, we'll update the date at the top and email organisers.",
      body: [
        "We may update this policy as the service changes or the law requires. When we do, we'll change the date at the top. If a change matters, for example if we start using your information in a new way, we'll tell organisers by email before it takes effect.",
      ],
    },
    {
      h: "How to contact us",
      summary: `Questions, requests or complaints about your privacy: ${email}.`,
      body: [
        `For questions about this policy, requests about your information, or complaints, email our Data Protection Officer at ${email}. We answer within 15 days.`,
        "If you're not happy with our answer, you can complain to the National Privacy Commission of the Philippines at privacy.gov.ph.",
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: "Terms of use",
  intro: `These terms are the agreement between you and ${SITE.name} when you use ${SITE.url}. By making a gift, adding to one, opening one or buying a plan, you agree to them. Each section starts with a short summary in plain English. The summary helps you find your way, but the full text under it is what counts.`,
  numbered: true,
  sections: [
    {
      h: "Who these terms apply to",
      summary: "These terms apply to everyone who uses Just Because: people who make gifts, friends who add to them and people who open them.",
      body: [
        `${SITE.name} lets you make a group gift page, invite friends to add letters, photos, songs and more, and send one finished page to the person it's for. In these terms, "${SITE.name}", "we" and "us" mean the team that runs the service, and "the service" means the website and everything on it.`,
        "\"Organiser\" means the person who makes a gift. \"Friend\" means someone who adds to a gift. \"Recipient\" means the person a gift is for. \"Content\" means anything people add, such as words, photos, voice notes, videos, drawings and links.",
        "Our Privacy policy and Refund policy are part of these terms.",
      ],
    },
    {
      h: "Who can use the service",
      summary: "You need to be at least 16, and you need to give us true information.",
      body: [
        "You must be at least 16 years old to make an account or add to a gift. If you use the service for a group, a school or a company, you confirm you're allowed to accept these terms for them.",
        "Friends don't need an account. They can add to a gift through its friends link.",
      ],
    },
    {
      h: "Your account",
      summary: "Keep your sign-in safe. You're responsible for what happens in your account.",
      body: [
        "Give us a real email address and keep your password private. You're responsible for everything done in your account. If you think someone else has used your account, change your password and tell us straight away.",
        "You can delete your account at any time from Account. Deleting it deletes your gifts and everything in them.",
      ],
    },
    {
      h: "Making and sharing a gift",
      summary: "The organiser runs the gift: who gets the link, which notes appear and when it's sent. Anyone with a link can use it, so share it with care.",
      body: [
        { list: [
          "The organiser decides which sections a gift has, approves or hides every note, and chooses when to send it.",
          "Each gift has a friends link and a gift link. Anyone who has a link can use it and send it on. You're responsible for who you share links with.",
          "Friends can edit or delete their own note from the same device while the gift is still being made.",
          "Gift pages are hidden from search engines, but they aren't secret from people who have the link. Plans that include a password give you an extra lock.",
        ] },
      ],
    },
    {
      h: "Your content",
      summary: "What you add stays yours. You let us store it and show it to the people you share the gift with, only so the service works.",
      body: [
        "You keep all rights to the content you add. You give us a limited permission to store it, copy it (for example, making smaller versions of photos), show it to the people who have the gift's links, and process it in other ways needed to run the service. This permission ends when the content is deleted, apart from copies kept for a short time in backups.",
        "You promise that you have the right to add what you add, and that people who appear in your photos, videos or recordings would be happy to be in the gift. Don't add other people's private information without their permission.",
        "We don't use your content to advertise, and we don't use it to train artificial intelligence.",
      ],
    },
    {
      h: "What's not allowed",
      summary: "Be kind and use the service as it's meant to be used. We can remove gifts that break these rules.",
      body: [
        "Don't use the service to:",
        { list: [
          "harass, threaten, bully or embarrass anyone, including the recipient",
          "share sexual content involving anyone under 18, or any illegal content",
          "share hate speech, violence, scams, spam or malware",
          "share content you don't have the right to share, such as someone else's photos or music files",
          "pretend to be someone else in a way that misleads people",
          "break, overload or get around the limits of the service, or access gifts or accounts that aren't yours",
          "copy, resell or build a competing product from the service, its designs or its code",
        ] },
        "Anyone can report a gift with the Report link at the bottom of a gift or friend page, or by emailing us. We may look at a reported gift, hide content, remove a gift or suspend an account that breaks these rules. Where a rule was clearly broken, we won't give a refund.",
      ],
    },
    {
      h: "Our designs and software",
      summary: "The themes, openings, layouts, Bo and the rest of the service belong to us. You can use them in your gifts, not copy them elsewhere.",
      body: [
        `The service and everything we make for it, including the themes, openings, layouts, illustrations, our mascot Bo, the ${SITE.name} name and logo, and the code, belong to ${SITE.name} or the people we license them from. You may use them inside your gifts through the service. You may not copy, sell or reuse them outside the service without our written permission.`,
        "If you send us ideas or feedback, we may use them without owing you anything.",
      ],
    },
    {
      h: "Plans and payment",
      summary: "Making a gift and collecting notes is free. You pay once to send it. There's no subscription and nothing renews on its own.",
      body: [
        `Making, editing and collecting notes is free. Sending the finished gift to the recipient needs a paid plan. A plan opens one gift for a set time (${plans}) and comes with the limits shown when you buy it, such as how many friends and photos it holds.`,
        { list: [
          "Prices are shown in Philippine pesos before you pay, with an approximate amount in US dollars for reference. You pay the peso amount.",
          "Each payment is a one-time payment. Plans don't renew on their own and we never charge you again without you choosing to.",
          "You can upgrade a gift to a bigger plan by paying the difference, or extend it for another period before or after it ends.",
          "Payments are handled by PayMongo. Their terms also apply to the payment itself.",
          "We may change prices for future purchases. A change never affects a plan you've already paid for.",
        ] },
        "Refunds follow our Refund policy.",
      ],
    },
    {
      h: "When a gift ends",
      summary: "When a plan runs out, the gift stops opening. You have 90 days to extend it or download everything before it's deleted.",
      body: [
        "When a plan's time is up, the gift link stops opening for the recipient. We email the organiser before that happens. After the plan ends, the organiser has 90 days to extend the gift or download everything in it, and then we delete it, as explained in our Privacy policy.",
      ],
    },
    {
      h: "Availability and changes to the service",
      summary: "We work hard to keep gifts online, but we can't promise the service will never be interrupted or never change.",
      body: [
        "We may update, improve or change features, themes and layouts over time. If we ever stop offering the service altogether, we'll give organisers with active paid gifts at least 30 days' notice and a way to download their gifts.",
        "The service is provided \"as is\". We don't promise it will always be available, free of errors or right for every purpose, except where the law says we must.",
      ],
    },
    {
      h: "Our responsibility to you",
      summary: "If something goes wrong, our responsibility is limited to what you paid us in the last 12 months. Your rights as a consumer under Philippine law still apply.",
      body: [
        "As far as the law allows, we aren't responsible for indirect or unexpected losses, such as lost profits, lost opportunities or hurt feelings caused by what other people add to a gift. Our total responsibility to you for any claim is limited to the amount you paid us in the 12 months before the claim.",
        "Nothing in these terms limits rights you have under the Consumer Act of the Philippines or any other law that can't be limited by agreement.",
      ],
    },
    {
      h: "Your responsibility",
      summary: "If something you add or do causes a legal problem for us, you're responsible for it.",
      body: [
        "If someone makes a claim against us because of content you added or because you broke these terms, you agree to cover the reasonable costs that result, as far as the law allows.",
      ],
    },
    {
      h: "Ending your use of the service",
      summary: "You can stop any time. We can suspend accounts that break these terms.",
      body: [
        "You can stop using the service, delete your gifts or delete your account at any time. We may suspend or close an account, or remove a gift, if these terms are broken, if the law requires it or to protect other people. Where it's safe and reasonable, we'll tell you why first.",
      ],
    },
    {
      h: "Disagreements and the law",
      summary: "If you have a problem, email us first and we'll try to sort it out. These terms follow Philippine law.",
      body: [
        `If you have a complaint, please email ${email} first. We'll try to resolve it within 30 days. These terms are governed by the laws of the Republic of the Philippines, and any dispute will be handled by the courts of the Philippines.`,
      ],
    },
    {
      h: "Changes to these terms",
      summary: "If we change something important, we'll update the date and tell organisers by email.",
      body: [
        "We may update these terms as the service changes or the law requires. We'll change the date at the top, and if a change matters, we'll email organisers before it takes effect. If you keep using the service after that, the new terms apply.",
      ],
    },
    {
      h: "Contact us",
      summary: `Questions about these terms: ${email}.`,
      body: [`For questions about these terms, email ${email}.`],
    },
  ],
};

export const REFUNDS: LegalDoc = {
  title: "Refund policy",
  intro: "We want every gift to land well. Here's when you can get your money back and how to ask. Each section starts with a short summary in plain English.",
  numbered: true,
  sections: [
    {
      h: "When you can get a full refund",
      summary: "Double charges, gifts that didn't open because of us, and change-of-mind within 7 days if the recipient hasn't opened it yet.",
      body: [{ list: [
        "You were charged twice for the same gift.",
        "You paid, but the gift didn't open because of a problem on our side, and we couldn't fix it within 3 days of you telling us.",
        "You ask within 7 days of paying and the recipient hasn't opened the gift yet.",
      ] }],
    },
    {
      h: "When we can't give a refund",
      summary: "Once the recipient has opened the gift, or the plan has run its full length, the plan has done its job.",
      body: [{ list: [
        "The recipient has already opened the gift.",
        "The plan has run its full length.",
        "The gift was removed for breaking our Terms of use.",
      ] }],
    },
    {
      h: "Upgrades and extensions",
      summary: "The same rules apply, for the amount you paid for the upgrade or extension.",
      body: ["Upgrades and extensions follow the same rules as a first plan, for the amount you paid for them. If a full refund of a first plan is approved, any upgrade or extension on that gift is refunded too."],
    },
    {
      h: "How to ask",
      summary: `Email ${email} with the email you paid with and the gift's link. We reply within 3 working days.`,
      body: [
        `Email ${email} with the email address you paid with and the gift's link. Tell us briefly what happened. We reply within 3 working days.`,
        "Approved refunds go back to the way you paid, through PayMongo. They usually arrive within 5 to 10 working days, depending on your bank or e-wallet. When a full refund is made, the gift's plan ends and the gift stops opening.",
      ],
    },
    {
      h: "Your rights",
      summary: "This policy adds to your rights under Philippine consumer law. It doesn't take any away.",
      body: ["Nothing in this policy limits rights you have under the Consumer Act of the Philippines."],
    },
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
