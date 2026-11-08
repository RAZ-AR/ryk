"use server";

import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";

/*
 * События, которые происходят на экране, а не в действии пользователя.
 * Пока такое одно — просмотр кандидатов, первый шаг воронки. Без него
 * не посчитать Weekly Selection Rate (11-analytics).
 */

export async function trackCandidatesViewed(count: number): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await track(session.userId, { name: "candidates_viewed", props: { count } });
}

/** Клик по ссылке Google Calendar — сама ссылка открывается напрямую, .ics-роут трекает себя сам. */
export async function trackCalendarAdded(method: "google"): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await track(session.userId, { name: "calendar_added", props: { method } });
}

/**
 * Открытие пикера Telegram — не «отправлено»: switchInlineQuery не даёт
 * знать, довёл ли человек дело до выбора чата и отправки.
 */
export async function trackInviteInitiated(role: "companion" | "witness"): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await track(session.userId, { name: "invite_initiated", props: { role } });
}

/**
 * Экран-вдохновение онбординга показан. Без аргументов — мерить нечего,
 * кроме самого факта: доля дошедших до мини-билетов против выбравших их.
 */
export async function trackOnboardingInspirationSeen(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await track(session.userId, { name: "onboarding_inspiration_seen", props: {} });
}

/**
 * «Лист дня» показан. Server action — открытая точка входа, поэтому
 * аргументы не берём на веру: флаг приводим к boolean, а число строк
 * зажимаем в 0–2 — больше на листе не бывает, и мусор не должен попасть
 * в воронку.
 */
export async function trackDayLeafViewed(hasWeather: boolean, soonCount: number): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const count = Number.isFinite(soonCount) ? Math.min(2, Math.max(0, Math.trunc(soonCount))) : 0;
  await track(session.userId, {
    name: "day_leaf_viewed",
    props: { hasWeather: hasWeather === true, soonCount: count },
  });
}
