import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

/*
 * next-intl без locale-роутинга: язык не в URL, а из пользователя.
 * Источник — cookie `ryk_locale` (ставится при входе по языку Telegram),
 * дефолт — ru. См. ryk_docs/18-decisions-adr.md (i18n en/ru/es).
 */
export const LOCALES = ["ru", "en", "es"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "ru";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("ryk_locale")?.value;
  const locale: AppLocale =
    cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)
      ? (cookieLocale as AppLocale)
      : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
