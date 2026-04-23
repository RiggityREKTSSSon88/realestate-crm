import Anthropic from "@anthropic-ai/sdk";

// TODO: ADD API KEY — set NEXT_PUBLIC_ANTHROPIC_API_KEY in .env.local before launch
export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}
