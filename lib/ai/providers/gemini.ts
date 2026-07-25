import { GoogleGenAI } from "@google/genai";
import {
  normalizeWish,
  WISH_SCHEMA,
  WISH_SYSTEM_PROMPT,
  type StructuredWish,
} from "@/lib/ai/types";

/*
 * Провайдер Google Gemini — бесплатный tier, structured outputs.
 * Основной вариант, пока нет платного ключа (см. ADR-008).
 *
 * Возвращает null при любой проблеме — вызывающий уходит в фолбэк.
 */

const MODEL = "gemini-3.6-flash";

export async function structureWishWithGemini(text: string): Promise<StructuredWish | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const interaction = await ai.interactions.create({
      model: MODEL,
      input: `${WISH_SYSTEM_PROMPT}\n\nЖелание пользователя: ${text}`,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: WISH_SCHEMA,
      },
    });

    const out = interaction.output_text;
    if (!out) return null;

    return normalizeWish(JSON.parse(out));
  } catch {
    // Сеть, квота, странный ответ — не блокируем пользователя.
    return null;
  }
}
