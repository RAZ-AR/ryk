import { AppShell } from "@/components/AppShell";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { TelegramBootstrap } from "@/components/TelegramBootstrap";
import { getCurrentUser } from "@/lib/auth/currentUser";

/*
 * Точка входа Mini App:
 *   нет сессии          → вход через Telegram initData (или dev локально)
 *   онбординг не пройден → Flow A
 *   готово              → каркас приложения
 */
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return <TelegramBootstrap />;
  if (user.onboardingState !== "DONE") return <OnboardingFlow initialCity={user.city} />;
  return <AppShell />;
}
