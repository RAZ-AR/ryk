import Anthropic from "@anthropic-ai/sdk";
import type { LifeCategory, WishStatus } from "@/generated/prisma/enums";

/*
 * Разбор желания в структуру (Flow B, «Ryk понял так»):
 * категория, ориентировочный бюджет, когда.
 *
 * Использует Anthropic Claude со structured outputs. Если ключа нет
 * (локально до настройки) — мягкий эвристический фолбэк, чтобы флоу работал.
 */

export type StructuredWish = {
  category: LifeCategory;
  budget: number | null;
  timing: Extract<WishStatus, "SOON" | "THIS_MONTH" | "SOMEDAY">;
};

const CATEGORIES: readonly LifeCategory[] = [
  "JOY",
  "CONNECTION",
  "DISCOVERY",
  "MOVEMENT",
  "CULTURE",
  "NATURE",
  "CHALLENGE",
  "REST",
  "CONTRIBUTION",
];

const TIMINGS = ["SOON", "THIS_MONTH", "SOMEDAY"] as const;

const SYSTEM = `Ты — помощник продукта Ryk. Пользователь описывает желание — впечатление, которое он хочет прожить.
Определи по тексту:
- category: одна из 9 категорий жизненного баланса.
- budget: ориентировочная стоимость в сербских динарах (RSD) целым числом; 0, если непонятно.
- timing: насколько срочно (SOON — на днях, THIS_MONTH — в этом месяце, SOMEDAY — когда-нибудь).
Отвечай только структурой. Не выдумывай точную цену, если её нет в тексте — ставь 0.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string", enum: CATEGORIES },
    budget: { type: "integer" },
    timing: { type: "string", enum: TIMINGS },
  },
  required: ["category", "budget", "timing"],
} as const;

/** Эвристика без модели: ключевые слова → категория; бюджет неизвестен; SOMEDAY. */
function heuristic(text: string): StructuredWish {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  let category: LifeCategory = "DISCOVERY";
  if (has("друз", "встрет", "позна", "friend", "amig")) category = "CONNECTION";
  else if (has("гор", "поход", "природ", "море", "лес", "nature", "hike")) category = "NATURE";
  else if (has("концерт", "музе", "театр", "выстав", "culture", "concert")) category = "CULTURE";
  else if (has("бег", "спорт", "йог", "велос", "плав", "sport", "run")) category = "MOVEMENT";
  else if (has("научит", "попроб", "курс", "learn", "try")) category = "CHALLENGE";
  else if (has("отдох", "спа", "выспат", "rest", "relax")) category = "REST";
  else if (has("помо", "волонт", "donate", "help")) category = "CONTRIBUTION";
  else if (has("испеч", "готов", "дома", "joy", "cook")) category = "JOY";
  return { category, budget: null, timing: "SOMEDAY" };
}

export async function structureWish(text: string): Promise<StructuredWish> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return heuristic(text);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 256,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: text }],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return heuristic(text);

    const parsed = JSON.parse(block.text) as {
      category: LifeCategory;
      budget: number;
      timing: (typeof TIMINGS)[number];
    };

    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "DISCOVERY",
      budget: typeof parsed.budget === "number" && parsed.budget > 0 ? parsed.budget : null,
      timing: TIMINGS.includes(parsed.timing) ? parsed.timing : "SOMEDAY",
    };
  } catch {
    // Сеть/квота/парсинг упали — не блокируем пользователя.
    return heuristic(text);
  }
}
