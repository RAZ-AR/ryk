"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { detectPlace } from "@/lib/geo/detectedCity";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";

/*
 * Ответ на вопрос «ты сейчас в другом городе?» (Flow J).
 *
 * Город берём не из аргумента, а заново из заголовка запроса: клиент здесь
 * не источник правды, иначе подменённым телом можно было бы переставить
 * чужой профиль в любой город.
 */

export type TravelResult = { ok: true } | { ok: false; reason: string };

export async function answerTravel(accept: boolean): Promise<TravelResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const place = await detectPlace();
  // Города пилота нет — отвечать не на что: вопрос в этом случае и не задавался.
  if (!place.city) return { ok: false, reason: "no_city" };

  /*
   * Храним каноническое написание на языке по умолчанию, а не на текущем:
   * `findCity` узнаёт город по любому из них, а показ всё равно идёт через
   * `localizeCity`. Иначе один и тот же город лежал бы в базе тремя
   * разными строками в зависимости от того, каким языком человек пользовался.
   */
  const canonical = place.city.names[DEFAULT_LOCALE];

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: accept
        ? // Переехал (или в поездке достаточно надолго): город профиля меняется,
          // прошлый отказ больше ничего не значит.
          { city: canonical, travelDismissedCity: null }
        : // Остался при своём: помним, чтобы не спросить второй раз.
          { travelDismissedCity: canonical },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}
