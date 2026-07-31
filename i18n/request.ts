import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isAppLocale, type AppLocale } from "@/lib/i18n/locale";

/*
 * next-intl без locale-роутинга: язык не в URL, а из пользователя.
 * Источник — cookie `ryk_locale`: её ставит вход по языку Telegram
 * (lib/auth/authenticate.ts) и переставляет сохранение профиля
 * (app/actions/profile.ts). Константы языка — в lib/i18n/locale.ts.
 * См. ryk_docs/18-decisions-adr.md (i18n en/ru/es).
 */

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: AppLocale = isAppLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
