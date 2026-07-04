import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Haiku-generated conversation starters for the call page. Server-only.

const StartersSchema = z.object({
  starters: z.array(z.string()).describe("Three short, natural conversation openers"),
});

export type StarterInput = {
  callerName: string;
  listenerName: string;
  listenerBio: string | null;
  listenerTopics: string[];
};

const FALLBACK = [
  "What's been the best part of your week so far?",
  "Have you been watching, reading or listening to anything good lately?",
  "What do you usually do to unwind at the end of the day?",
];

// Lazy client — constructed on first use so builds don't need the env var.
let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function generateConversationStarters(input: StarterInput): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return FALLBACK;

  const profile = [
    `Listener name: ${input.listenerName}`,
    input.listenerBio ? `Listener bio: ${input.listenerBio}` : null,
    input.listenerTopics.length
      ? `Topics the listener likes talking about: ${input.listenerTopics.join(", ")}`
      : null,
    `Caller name: ${input.callerName}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await anthropic().messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system:
        "You suggest conversation starters for gonatter, a platform for friendly, platonic phone chats between strangers. " +
        "Given the two people's profiles, write exactly 3 openers the caller could actually say out loud — short (one sentence), " +
        "warm, natural, and specific to the listener's bio or topics where possible. No emojis, no numbering, nothing flirtatious.",
      messages: [{ role: "user", content: profile }],
      output_config: { format: zodOutputFormat(StartersSchema) },
    });
    const starters = response.parsed_output?.starters?.filter((s) => s.trim().length > 0) ?? [];
    return starters.length >= 3 ? starters.slice(0, 3) : FALLBACK;
  } catch (e) {
    console.error("Starter generation failed:", e instanceof Error ? e.message : e);
    return FALLBACK;
  }
}
