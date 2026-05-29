// Ready-to-use, legally-reviewed-pending safety copy from the Listener
// Guidelines & In-Product Safety doc, Part B. Keep wording verbatim; final
// strings subject to legal review. Centralised so every surface stays consistent.

export const BRAND = {
  name: "gonatter",
  tagline: "Real people. Real conversations. Real connection.",
};

// B1 — "What gonatter is" panel
export const WHAT_IS = {
  heading: "Real people. Real conversations.",
  body: "gonatter is a friendly place to talk to a real person — about your day, your interests, or whatever's on your mind. It's good company, not therapy or a crisis service. If you ever need urgent or professional help, we'll always show you where to find it.",
};

// B2 — Not-a-crisis-service notice
export const NOT_A_CRISIS =
  "gonatter is for friendly conversation, not emergencies or mental-health support. If you're in crisis or in danger, please contact a professional or your local emergency services.";

// B6 — Pre-call platonic reminder (first-time callers, once)
export const PLATONIC_REMINDER =
  "A quick note: gonatter is for friendly, respectful conversation. Anything sexual, abusive, or aimed at someone under 18 isn't allowed, and either person can end a call at any time.";

// B7 — Age gate
export const AGE_GATE =
  "You must be 18 or over to use gonatter. By continuing, you confirm you're an adult.";

// B8 — Spend-cap reassurance
export const SPEND_CAP =
  "You're in control of what you spend. You'll only ever be charged for the time you actually talk, up to the length you choose here. You can end the call whenever you like.";

// B4 — Report reasons (maps to reports.category in the DB)
export const REPORT_REASONS = [
  { value: "sexual_adult", label: "Sexual or adult content" },
  { value: "distress_self_harm", label: "Someone seems to be in distress or at risk" },
  { value: "abuse_harassment", label: "Abuse, harassment or threats" },
  { value: "scam_fraud", label: "A scam or request for money" },
  { value: "csam", label: "I think this person is under 18" },
  { value: "other", label: "Something else" },
] as const;

export const REPORT_INTRO =
  "Tell us what happened. Our team reviews every report. This isn't an emergency line — if someone is in immediate danger, please call your local emergency services.";

export const REPORT_CONFIRMATION =
  "Thank you — we've received your report and our team will look into it. If anyone is in immediate danger, please contact your local emergency services now.";

// B5 — Safety-end confirmation
export const SAFETY_END =
  "You've ended the call. You won't be charged beyond the time already spent, and you can report what happened if you'd like to.";

// Default opening message for pre-chat (§5.4)
export const PRECHAT_OPENER = "Are you free to talk?";
