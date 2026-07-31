import { cookies } from "next/headers";
import type { Locale } from "@/generated/prisma/enums";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, toAppLocale } from "./locale";

/*
 * Запись языка в cookie — отдельным файлом от lib/i18n/locale.ts, потому что
 * `next/headers` существует только на сервере, а сами преобразования локали
 * нужны и клиентским компонентам (форматирование чисел).
 */

/**
 * Вызывать везде, где язык меняется. next-intl читает именно эту cookie
 * (i18n/request.ts), а не поле `users.locale`: без записи сохранённый
 * в профиле язык не доедет до интерфейса до следующего входа.
 */
export async function setLocaleCookie(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, toAppLocale(locale), {
    // Не httpOnly: язык — не секрет, а клиентскому коду он может понадобиться.
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });
}
