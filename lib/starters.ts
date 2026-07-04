import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Haiku-generated conversation starters for the call page. Server-only.
// Perspective-aware: callers get openers to say to the listener; listeners
// get openers to welcome the caller and draw them out.

const StartersSchema = z.object({
  starters: z.array(z.string()).describe("Three short, natural conversation openers"),
});

export type StarterInput = {
  speakerName: string;
  speakerRole: "caller" | "listener";
  otherName: string;
  otherBio: string | null;
  otherTopics: string[];
};

const CALLER_FALLBACK = [
  "What's been the best part of your week so far?",
  "Have you been watching, reading or listening to anything good lately?",
  "What do you usually do to unwind at the end of the day?",
];

const LISTENER_FALLBACK = [
  "Lovely to meet you — how's your day been treating you?",
  "So what made you fancy a natter today?",
  "Tell me a bit about yourself — what do you enjoy doing?",
];

// Lazy client — constructed on first use so builds don't need the env var.
let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function generateConversationStarters(input: StarterInput): Promise<string[]> {
  const fallback = input.speakerRole === "caller" ? CALLER_FALLBACK : LISTENER_FALLBACK;
  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  const hasProfile = Boolean(input.otherBio) || input.otherTopics.length > 0;
  const profile = [
    `You are writing openers for ${input.speakerName}, the ${input.speakerRole} on this call.`,
    `The other person is ${input.otherName}, the ${input.speakerRole === "caller" ? "listener" : "caller"}.`,
    input.otherBio ? `${input.otherName}'s bio: ${input.otherBio}` : null,
    input.otherTopics.length
      ? `Topics ${input.otherName} likes talking about: ${input.otherTopics.join(", ")}`
      : null,
    !hasProfile
      ? `${input.otherName}'s profile is minimal, so suggest warm, open questions anyone could enjoy answering.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const roleGuidance =
    input.speakerRole === "caller"
      ? "Write 3 openers the caller could say out loud to start the chat — reference the listener's bio or topics where possible."
      : "Write 3 openers the listener could say to welcome the caller and get them talking — friendly hosting questions that draw the caller out.";

  try {
    const response = await anthropic().messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system:
        "You suggest conversation starters for gonatter, a platform for friendly, platonic phone chats between strangers. " +
        `${roleGuidance} Each opener is one short sentence, warm and natural. No emojis, no numbering, nothing flirtatious.`,
      messages: [{ role: "user", content: profile }],
      output_config: { format: zodOutputFormat(StartersSchema) },
    });
    const starters = response.parsed_output?.starters?.filter((s) => s.trim().length > 0) ?? [];
    return starters.length >= 3 ? starters.slice(0, 3) : fallback;
  } catch (e) {
    console.error("Starter generation failed:", e instanceof Error ? e.message : e);
    return fallback;
  }
}
