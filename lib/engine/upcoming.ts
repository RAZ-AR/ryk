import type { LifeCategory } from "@/generated/prisma/enums";
import { weekStartUTC } from "@/lib/engine/weekly";
import { localizeExperience } from "@/lib/i18n/experience";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";

/*
 * Что у человека впереди — лента-карусель на главном.
 *
 * Два источника, потому что одного мало: подтверждённая история недели ровно
 * одна, и карусель из одного кружка смысла не имеет. Второй источник —
 * приглашения, которые человек принял: это тоже его предстоящие события,
 * просто затеянные кем-то другим.
 */

export type UpcomingItem = {
  id: string;
  title: string;
  category: LifeCategory;
  /** YYYY-MM-DD или null, если день ещё не назначен. */
  plannedFor: string | null;
  /** С кем идём: спутник в своей истории или тот, кто позвал. */
  withWhom: string | null;
  /** Своя история недели или принятое приглашение. */
  kind: "mine" | "invited";
};

function isoDay(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export async function getUpcoming(
  userId: string,
  locale: string = DEFAULT_LOCALE,
): Promise<UpcomingItem[]> {
  const weekStart = weekStartUTC();

  const [mine, invited] = await Promise.all([
    prisma.weeklyStory.findMany({
      where: {
        userId,
        status: { in: ["COMMITTED", "AT_RISK"] },
        // Прошлые недели живут в «Памяти», здесь — только предстоящее.
        weekStart: { gte: weekStart },
      },
      orderBy: { weekStart: "asc" },
      select: {
        id: true,
        plannedFor: true,
        companionName: true,
        experience: { select: { title: true, category: true, translations: true } },
      },
    }),
    prisma.invite.findMany({
      where: {
        recipientId: userId,
        status: "ACCEPTED",
        weeklyStory: { weekStart: { gte: weekStart } },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        inviterName: true,
        weeklyStory: {
          select: {
            plannedFor: true,
            experience: { select: { title: true, category: true, translations: true } },
          },
        },
      },
    }),
  ]);

  const items: UpcomingItem[] = [
    ...mine
      .filter((s) => s.experience !== null)
      .map((s) => ({
        id: s.id,
        title: localizeExperience(s.experience!, locale).title,
        category: s.experience!.category,
        plannedFor: isoDay(s.plannedFor),
        withWhom: s.companionName,
        kind: "mine" as const,
      })),
    ...invited
      .filter((i) => i.weeklyStory.experience !== null)
      .map((i) => ({
        id: i.id,
        title: localizeExperience(i.weeklyStory.experience!, locale).title,
        category: i.weeklyStory.experience!.category,
        plannedFor: isoDay(i.weeklyStory.plannedFor),
        withWhom: i.inviterName,
        kind: "invited" as const,
      })),
  ];

  // Ближайшее первым; без даты — в конец, они ещё не привязаны ко дню.
  return items.sort((a, b) => {
    if (a.plannedFor === b.plannedFor) return 0;
    if (a.plannedFor === null) return 1;
    if (b.plannedFor === null) return -1;
    return a.plannedFor < b.plannedFor ? -1 : 1;
  });
}
