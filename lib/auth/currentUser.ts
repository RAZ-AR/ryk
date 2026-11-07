import type { Locale, OnboardingState } from "@/generated/prisma/enums";
import { parseJoyTraits } from "@/lib/engine/joyTraits";
import { prisma } from "@/lib/prisma";
import { getSession } from "./session";

export type CurrentUser = {
  id: string;
  telegramId: string;
  locale: Locale;
  onboardingState: OnboardingState;
  city: string | null;
  /** Как обращаться: выбранное человеком имя, иначе имя из Telegram. */
  name: string | null;
  /** Маленькие радости «про меня» — уже проверенный список черт. */
  joyTraits: string[];
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
    select: {
      id: true,
      telegramId: true,
      locale: true,
      onboardingState: true,
      city: true,
      firstName: true,
      displayName: true,
      joyTraits: true,
    },
  });
  if (!user) return null;

  // Json из БД разворачиваем здесь: дальше никому не нужно знать форму
  // хранения, а битое значение не должно доехать до подбора радости.
  const { firstName, displayName, joyTraits, ...rest } = user;
  return { ...rest, name: displayName ?? firstName, joyTraits: parseJoyTraits(joyTraits) };
}
