"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { setLocaleCookie } from "@/lib/i18n/localeCookie";
import { isAppLocale, toDbLocale } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";

/*
 * Смена языка из шапки — отдельным действием, а не через updateProfile.
 *
 * updateProfile требует весь профиль целиком (город, радиус, бюджет,
 * уведомления) и провалит валидацию, если чего-то не передать. Для одного
 * переключателя это лишнее: он должен работать с любого экрана и ничего
 * больше не трогать.
 *
 * Язык живёт в двух местах, и писать надо в оба: cookie читает next-intl
 * (i18n/request.ts) — от неё зависит текущий рендер; `users.locale` нужен
 * там, где запроса нет вовсе, — например крону, который шлёт подсказки.
 */

export type LocaleResult = { ok: true } | { ok: false; reason: string };

export async function switchLocale(locale: string): Promise<LocaleResult> {
  if (!isAppLocale(locale)) return { ok: false, reason: "bad_locale" };

  const dbLocale = toDbLocale(locale);

  /*
   * Порядок важен: сначала база, потом cookie.
   *
   * Было наоборот, и провал записи оставлял систему в противоречии — cookie
   * уже переключена, действие вернуло ошибку, клиент не обновил экран.
   * Человек нажимал EN, не видел ничего, а на следующем переходе приложение
   * внезапно оказывалось английским.
   *
   * Теперь неудача не меняет ничего, и повторный тап — единственное, что
   * нужно сделать. Гость проходит мимо базы: профиля у него просто нет.
   */
  const session = await getSession();
  if (session) {
    try {
      await prisma.user.update({ where: { id: session.userId }, data: { locale: dbLocale } });
    } catch {
      return { ok: false, reason: "db_error" };
    }
  }

  await setLocaleCookie(dbLocale);

  revalidatePath("/");
  return { ok: true };
}
