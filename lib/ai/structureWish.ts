import type { LifeCategory } from "@/generated/prisma/enums";
import { structureWishWithClaude } from "./providers/anthropic";
import { structureWishWithGemini } from "./providers/gemini";
import type { StructuredWish } from "./types";

export type { StructuredWish } from "./types";

/*
 * Разбор желания в структуру (Flow B). Провайдер выбирается по наличию ключа:
 *   GEMINI_API_KEY     → Gemini Flash (бесплатный tier) — приоритет
 *   ANTHROPIC_API_KEY  → Claude (платный, точнее)
 *   ничего             → эвристика по ключевым словам
 *
 * Порядок задан ADR-008: бесплатное по умолчанию, платное — осознанный выбор.
 * Любой сбой провайдера уводит в следующий вариант, вплоть до эвристики:
 * пользователь никогда не остаётся без результата.
 */

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
  return (
    (await structureWishWithGemini(text)) ??
    (await structureWishWithClaude(text)) ??
    heuristic(text)
  );
}
