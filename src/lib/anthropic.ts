import Anthropic from "@anthropic-ai/sdk";

// Server-side only — ANTHROPIC_API_KEY is NOT prefixed with NEXT_PUBLIC_
// so it is never exposed to the browser. Only call this from API routes
// (i.e. files inside /app/api/), never from client components.
export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}
