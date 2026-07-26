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

  const [wishes, weekly, memories, profile, preferences] = await Promise.all([
    prisma.wish.findMany({
      where: { userId: user.id, status: { not: "HIDDEN" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, text: true, category: true, budget: true, status: true },
    }),
    getWeeklyView(user.id),
    getMemories(user.id),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        city: true,
        radiusKm: true,
        budgetMax: true,
        socialMode: true,
        locale: true,
        noveltyRatio: true,
      },
    }),
    prisma.preference.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, category: true, entity: true, sentiment: true },
    }),
  ]);

  return (
    <AppShell
      wishes={wishes}
      weekly={weekly}
      memories={memories}
      profile={profile}
      preferences={preferences}
    />
  );
}
