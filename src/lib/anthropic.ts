import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt, parseEmailJson, type PromptArgs } from "./prompts";

// 一箇所変えるだけで切替できるよう定数化
export const CLAUDE_MODEL = "claude-sonnet-4-5";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY が未設定です");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

export async function generateSalesEmail(args: PromptArgs): Promise<GeneratedEmail> {
  const client = getClient();
  const system = buildSystemPrompt();
  const user = buildUserPrompt(args);

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    temperature: 0.55,
    system,
    messages: [{ role: "user", content: user }]
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return parseEmailJson(text);
}
