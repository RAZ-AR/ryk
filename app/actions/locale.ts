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
  await setLocaleCookie(dbLocale);

  // Гость языком тоже управляет: cookie уже записана, профиля просто нет.
  const session = await getSession();
  if (session) {
    try {
      await prisma.user.update({ where: { id: session.userId }, data: { locale: dbLocale } });
    } catch {
      // Cookie важнее: интерфейс переключится, а профиль догонит при
      // следующем сохранении. Ронять переключатель из-за этого незачем.
      return { ok: false, reason: "db_error" };
    }
  }

  revalidatePath("/");
  return { ok: true };
}
