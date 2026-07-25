import type { Locale, OnboardingState } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getSession } from "./session";

export type CurrentUser = {
  id: string;
  telegramId: string;
  locale: Locale;
  onboardingState: OnboardingState;
  city: string | null;
};

/**
 * Текущий пользователь по сессии. null, если сессии нет
 * или запись удалена/не найдена. Для серверных компонентов и действий.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findFirst({
    where: { id: session.userId, deletedAt: null },
    select: { id: true, telegramId: true, locale: true, onboardingState: true, city: true },
  });

  return user;
}
