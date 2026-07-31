import { localizeExperience } from "@/lib/i18n/experience";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { signedPhotoUrl } from "@/lib/storage/memoryPhotos";
import { prisma } from "@/lib/prisma";
import type { MemoryView } from "./weekly";

/*
 * Архив воспоминаний (PRD 5.9). Показываем истории по неделям, включая
 * перенесённые — «незавершённые желания без чувства вины».
 */

export async function getMemories(
  userId: string,
  locale: string = DEFAULT_LOCALE,
  limit = 24,
): Promise<MemoryView[]> {
  const stories = await prisma.weeklyStory.findMany({
    where: { userId, memory: { isNot: null } },
    orderBy: { weekStart: "desc" },
    take: limit,
    include: { experience: true, memory: true },
  });

  const rows = stories.flatMap((s) => (s.memory ? [{ story: s, memory: s.memory }] : []));

  /*
   * Ссылки подписываем разом: бакет приватный, прямого адреса у файла нет.
   * Подпись живёт час — этого хватает на просмотр, но ссылка не утекает
   * навсегда, если человек ею с кем-то поделится.
   */
  const photos = await Promise.all(
    rows.map(({ memory }) => {
      // Первое фото — обложка кадра. Остальные не показываем: «Плёнка» —
      // про одно воспоминание в кадре, а не про галерею.
      const path = memory.media[0];
      return path ? signedPhotoUrl(path) : Promise.resolve(null);
    }),
  );

  return rows.map(({ story, memory }, i) => ({
    id: memory.id,
    weekLabel: story.weekStart.toISOString().slice(0, 10),
    title: story.experience ? localizeExperience(story.experience, locale).title : "",
    note: memory.note,
    emotion: memory.emotion,
    companion: memory.companion,
    category: story.experience?.category ?? null,
    deferred: memory.deferred,
    photo: photos[i],
  }));
}
