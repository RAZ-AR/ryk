import type { NudgeCode } from "@/lib/engine/nudges";

/*
 * Когда боту вообще позволено написать первым.
 *
 * Это самое опасное место продукта: push дёшев, а вовлечение через него —
 * ровно тот тёмный паттерн, который у нас запрещён (16-risks-and-guardrails).
 * Поэтому правила жёсткие и лежат отдельным чистым модулем, чтобы их можно
 * было прочитать целиком и проверить тестами, а не выискивать по роуту.
 *
 * Принцип из 07-ai-companion: «помощь важнее напоминаний». Сообщение
 * отправляется, только если у него есть конкретное действие, которое человек
 * может совершить прямо сейчас. «Не забудь» и «всё идёт по плану» —
 * не сообщения, а шум.
 */

/** Больше двух сообщений за неделю — это уже давление, а не помощь. */
export const MAX_NUDGES_PER_WEEK = 2;

/**
 * Коды, ради которых стоит написать. Остальные молчат, и вот почему:
 *
 *  - ON_TRACK — «всё в порядке, делать ничего не нужно». Сообщение,
 *    которое ничего не просит и ничего не даёт, — чистый шум.
 *  - WEATHER_WATCH — «погода так себе», но запасного дня нет. Это тревога
 *    без действия; человеку от неё только хуже.
 *  - TODAY — «это сегодня». В день события уже поздно помогать, и такое
 *    сообщение читается как «ну что, идёшь?» — то самое давление.
 */
const WORTH_SENDING: ReadonlyArray<NudgeCode> = ["WEATHER_SWAP", "TOMORROW", "INVITE_SOMEONE"];

export type DeliveryDecision =
  | { send: true; code: NudgeCode }
  | { send: false; reason: "opted_out" | "nothing_to_say" | "already_said" | "weekly_cap" };

export function decideDelivery(input: {
  code: NudgeCode;
  /** Коды, уже отправленные этому человеку на этой неделе. */
  sentThisWeek: ReadonlyArray<NudgeCode>;
  /** Выключил уведомления в профиле — молчим полностью. */
  notificationsEnabled: boolean;
}): DeliveryDecision {
  const { code, sentThisWeek, notificationsEnabled } = input;

  if (!notificationsEnabled) return { send: false, reason: "opted_out" };
  if (!WORTH_SENDING.includes(code)) return { send: false, reason: "nothing_to_say" };
  // Одно и то же дважды за неделю — это уже нытьё, а не подсказка.
  if (sentThisWeek.includes(code)) return { send: false, reason: "already_said" };
  if (sentThisWeek.length >= MAX_NUDGES_PER_WEEK) return { send: false, reason: "weekly_cap" };

  return { send: true, code };
}

/**
 * Читает `User.notificationPreferences`. Умолчание — включено: человек
 * согласился на бота, заведя историю недели, и одна подсказка накануне
 * ожидаема. Выключается одним переключателем в профиле.
 */
export function notificationsEnabled(preferences: unknown): boolean {
  if (preferences && typeof preferences === "object" && "nudges" in preferences) {
    return (preferences as { nudges?: unknown }).nudges !== false;
  }
  return true;
}
