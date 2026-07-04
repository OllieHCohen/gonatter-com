import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "gonatter <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

// Best-effort transactional email. Never throws — notifications must not block
// or break the user flow if the mail provider hiccups.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email:", subject);
    return;
  }
  try {
    await resend.emails.send({ from, to, subject, html });
  } catch (e) {
    console.error("sendEmail failed:", (e as Error).message);
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function shell(heading: string, body: string, ctaLabel: string, ctaPath: string): string {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#1c3045">
    <h1 style="font-size:20px;color:#1c3045">${heading}</h1>
    <p style="font-size:15px;line-height:1.6;color:#5b6b7b">${body}</p>
    <p><a href="${APP_URL}${ctaPath}" style="display:inline-block;background:#00bbaf;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${ctaLabel}</a></p>
    <p style="font-size:12px;color:#9aa7b2;margin-top:24px">gonatter — friendly conversation with real people. Not a crisis service.</p>
  </div>`;
}

export function newMessageEmail(fromName: string): { subject: string; html: string } {
  return {
    subject: `${fromName} messaged you on gonatter`,
    html: shell(
      "You have a new message",
      `${fromName} reached out to you on gonatter. Open your messages to reply.`,
      "View message",
      "/messages",
    ),
  };
}

export function incomingCallEmail(callerName: string, conversationId: string): { subject: string; html: string } {
  return {
    subject: `📞 ${callerName} is calling you on gonatter`,
    html: shell(
      `${callerName} is calling you now`,
      `${callerName} has started a call and is waiting for you. Join now to talk — they're on the line.`,
      "Join the call",
      `/call/${conversationId}`,
    ),
  };
}

export function acceptedEmail(listenerName: string): { subject: string; html: string } {
  return {
    subject: `${listenerName} is ready to chat`,
    html: shell(
      "Your listener accepted",
      `${listenerName} accepted your conversation. You can start a call whenever you're ready.`,
      "Open conversation",
      "/messages",
    ),
  };
}
