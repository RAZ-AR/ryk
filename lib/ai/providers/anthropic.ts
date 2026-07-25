import Anthropic from "@anthropic-ai/sdk";
import {
  normalizeWish,
  WISH_SCHEMA,
  WISH_SYSTEM_PROMPT,
  type StructuredWish,
} from "@/lib/ai/types";

/*
 * Провайдер Anthropic Claude — включается, если задан ANTHROPIC_API_KEY.
 * Платный; используется, когда нужна максимальная точность разбора.
 *
 * Возвращает null при любой проблеме — вызывающий уходит в фолбэк.
 */

const MODEL = "claude-opus-4-8";

export async function structureWishWithClaude(text: string): Promise<StructuredWish | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: WISH_SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: WISH_SCHEMA } },
      messages: [{ role: "user", content: text }],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;

    return normalizeWish(JSON.parse(block.text));
  } catch {
    return null;
  }
}
