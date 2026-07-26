import type { LifeCategory } from "@/generated/prisma/enums";
import { liveExperienceWhere } from "@/lib/engine/liveExperiences";
import { prisma } from "@/lib/prisma";

/*
 * Лента свайпов: впечатления, на которые человек ещё не реагировал.
 *
 * Каталог курируемый и небольшой (ADR-006), поэтому колода — это просто всё
 * доступное, а не бесконечный фид: она естественно кончается, и это нормальное
 * состояние экрана, а не ошибка.
 */

export type DeckCard = {
  id: string;
  title: string;
  description: string | null;
  category: LifeCategory;
  location: string | null;
  price: number | null;
  currency: string;
  durationMin: number | null;
  sponsored: boolean;
};

const DECK_LIMIT = 30;

export async function getDiscoverDeck(userId: string): Promise<DeckCard[]> {
  const experiences = await prisma.experience.findMany({
    where: {
      ...liveExperienceWhere(),
      // Уже отреагировал — карточка не возвращается.
      reactions: { none: { userId } },
    },
    orderBy: { createdAt: "desc" },
    take: DECK_LIMIT,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      location: true,
      price: true,
      currency: true,
      durationMin: true,
      sponsored: true,
    },
  });

  return experiences;
}
