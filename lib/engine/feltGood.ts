import type { LifeCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/*
 * Категории, в которых человеку было хорошо: прожитые истории недели,
 * после которых он отметил эмоцию в чек-ине («Как это было?»).
 *
 * Это самый честный сигнал интереса из всех, что у нас есть: не «мне
 * кажется, я люблю природу» из онбординга, а «я сходил, и мне было хорошо».
 * Поэтому он и сильнее заявленного — и в подборе недели, и в строке
 * «почему тебе» на карточке (lib/engine/cardContext.ts).
 *
 * Отложенные истории (deferred) не считаются: их не прожили.
 */
export async function getFeltGoodCategories(userId: string): Promise<Set<LifeCategory>> {
  const memories = await prisma.memory.findMany({
    where: { weeklyStory: { userId }, emotion: { not: null }, deferred: false },
    select: { weeklyStory: { select: { experience: { select: { category: true } } } } },
  });
  const categories = new Set<LifeCategory>();
  for (const m of memories) {
    const category = m.weeklyStory.experience?.category;
    if (category) categories.add(category);
  }
  return categories;
}
