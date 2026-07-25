import type { LifeCategory, WishStatus } from "@/generated/prisma/enums";

/** Разобранное желание (Flow B, «Ryk понял так»). */
export type StructuredWish = {
  category: LifeCategory;
  budget: number | null;
  timing: Extract<WishStatus, "SOON" | "THIS_MONTH" | "SOMEDAY">;
};

export const WISH_CATEGORIES: readonly LifeCategory[] = [
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

export const WISH_TIMINGS = ["SOON", "THIS_MONTH", "SOMEDAY"] as const;

/** Инструкция модели — общая для всех провайдеров. */
export const WISH_SYSTEM_PROMPT = `Ты — помощник продукта Ryk. Пользователь описывает желание — впечатление, которое он хочет прожить.
Определи по тексту:
- category: одна из 9 категорий жизненного баланса.
- budget: ориентировочная стоимость в сербских динарах (RSD) целым числом; 0, если непонятно.
- timing: насколько срочно (SOON — на днях, THIS_MONTH — в этом месяце, SOMEDAY — когда-нибудь).
Отвечай только структурой. Не выдумывай точную цену, если её нет в тексте — ставь 0.`;

/** JSON-схема ответа — общая форма для structured outputs. */
export const WISH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string", enum: WISH_CATEGORIES },
    budget: { type: "integer" },
    timing: { type: "string", enum: WISH_TIMINGS },
  },
  required: ["category", "budget", "timing"],
} as const;

/** Приводим сырой ответ модели к нашему типу, отбрасывая мусор. */
export function normalizeWish(raw: unknown): StructuredWish | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { category?: unknown; budget?: unknown; timing?: unknown };

  const category = WISH_CATEGORIES.includes(r.category as LifeCategory)
    ? (r.category as LifeCategory)
    : null;
  if (!category) return null;

  const timing = (WISH_TIMINGS as readonly string[]).includes(r.timing as string)
    ? (r.timing as StructuredWish["timing"])
    : "SOMEDAY";

  const budget = typeof r.budget === "number" && r.budget > 0 ? Math.round(r.budget) : null;

  return { category, budget, timing };
}
