import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { TelegramBootstrap } from "@/components/TelegramBootstrap";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getDiscoverDeck } from "@/lib/engine/discover";
import { getMemories } from "@/lib/engine/memories";
import { notificationsEnabled } from "@/lib/engine/nudgeDelivery";
import { localizeCity } from "@/lib/i18n/city";
import { localizeExperience } from "@/lib/i18n/experience";
import { isPhotoStorageConfigured } from "@/lib/storage/memoryPhotos";
import { getUpcoming } from "@/lib/engine/upcoming";
import { getWeeklyView } from "@/lib/engine/weekly";
import { getYear } from "@/lib/engine/year";
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

  /*
   * Язык берём у next-intl, а не из user.locale: cookie — единственный
   * источник правды в пределах запроса, и именно она переключается сразу
   * после сохранения профиля. Читать поле из БД значило бы показать
   * карточки на старом языке ровно до следующей перезагрузки.
   */
  const locale = await getLocale();

  const [wishes, weekly, memories, profile, preferences, invites, deck, upcoming, year] =
    await Promise.all([
      prisma.wish.findMany({
        where: { userId: user.id, status: { not: "HIDDEN" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, text: true, category: true, budget: true, status: true },
      }),
      getWeeklyView(user.id, locale),
      getMemories(user.id, locale),
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          city: true,
          radiusKm: true,
          budgetMax: true,
          socialMode: true,
          locale: true,
          noveltyRatio: true,
          notificationPreferences: true,
        },
      }),
      prisma.preference.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, category: true, entity: true, sentiment: true },
      }),
      // Только те, что уже закреплены за мной и ждут ответа — по ним горит значок.
      prisma.invite.findMany({
        where: { recipientId: user.id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          role: true,
          inviterName: true,
          inviterUsername: true,
          weeklyStory: {
            select: {
              plannedFor: true,
              experience: { select: { title: true, location: true, translations: true } },
            },
          },
        },
      }),
      getDiscoverDeck(user.id, locale),
      getUpcoming(user.id, locale),
      getYear(user.id),
    ]);

  const inviteViews = invites
    .filter((i) => i.weeklyStory.experience !== null)
    .map((i) => {
      // Приглашение читает получатель — значит и язык его, а не позвавшего.
      const text = localizeExperience(i.weeklyStory.experience!, locale);
      return {
        id: i.id,
        role: i.role,
        inviterName: i.inviterName,
        inviterUsername: i.inviterUsername,
        storyTitle: text.title,
        plannedFor: i.weeklyStory.plannedFor
          ? i.weeklyStory.plannedFor.toISOString().slice(0, 10)
          : null,
        location: text.location,
      };
    });

  return (
    <AppShell
      wishes={wishes}
      weekly={weekly}
      memories={memories}
      // Json из БД разворачиваем здесь: экрану профиля нужен простой флаг,
      // а не форма хранения настроек.
      profile={{ ...profile, nudges: notificationsEnabled(profile.notificationPreferences) }}
      preferences={preferences}
      invites={inviteViews}
      deck={deck}
      upcoming={upcoming}
      year={year}
      canAttachPhoto={isPhotoStorageConfigured()}
      locale={locale}
      city={localizeCity(profile.city, locale)}
    />
  );
}
