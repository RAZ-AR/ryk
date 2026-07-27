import type { ExperienceKind, LifeCategory } from "@/generated/prisma/enums";
import { liveExperienceWhere } from "@/lib/engine/liveExperiences";
import { dailySeed, mixByKind } from "@/lib/engine/mix";
import { prisma } from "@/lib/prisma";

/*
 * Лента: впечатления, на которые человек ещё не реагировал.
 *
 * Каталог курируемый и небольшой (ADR-006), поэтому колода — это не
 * бесконечный фид: она естественно кончается, и это нормальное состояние
 * экрана, а не ошибка.
 *
 * Порядок задаёт mixByKind: доля событий ограничена сверху, чтобы лента не
 * скатывалась в афишу города, а перемешивание детерминированное по дню —
 * чтобы карточки не прыгали при каждом открытии приложения.
 */

export type DeckCard = {
  id: string;
  title: string;
  description: string | null;
  category: LifeCategory;
  kind: ExperienceKind;
  location: string | null;
  price: number | null;
  currency: string;
  durationMin: number | null;
  imageUrl: string | null;
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
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      kind: true,
      location: true,
      price: true,
      currency: true,
      durationMin: true,
      imageUrl: true,
      sponsored: true,
    },
  });

  return mixByKind(experiences, DECK_LIMIT, dailySeed(userId));
}
