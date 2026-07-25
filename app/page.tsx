import { AppShell } from "@/components/AppShell";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { TelegramBootstrap } from "@/components/TelegramBootstrap";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getMemories } from "@/lib/engine/memories";
import { getWeeklyView } from "@/lib/engine/weekly";
import { prisma } from "@/lib/prisma";

/*
 * Точка входа Mini App:
 *   нет сессии          → вход через Telegram initData (или dev локально)
 *   онбординг не пройден → Flow A
 *   готово              → каркас приложения с данными
 */
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <TelegramBootstrap />;
  if (user.onboardingState !== "DONE") return <OnboardingFlow initialCity={user.city} />;

  const [wishes, weekly, memories] = await Promise.all([
    prisma.wish.findMany({
      where: { userId: user.id, status: { not: "HIDDEN" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, text: true, category: true, budget: true, status: true },
    }),
    getWeeklyView(user.id),
    getMemories(user.id),
  ]);

  return <AppShell wishes={wishes} weekly={weekly} memories={memories} />;
}
