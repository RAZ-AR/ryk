import type { Locale } from "@/generated/prisma/enums";

/*
 * Единственное место, где живёт язык.
 *
 * Языков три (ADR: i18n en / ru / es) и представлений у языка тоже три:
 *   Locale     — "RU" | "EN" | "ES", как в БД (Prisma enum);
 *   AppLocale  — "ru" | "en" | "es", как у next-intl и в атрибуте <html lang>;
 *   BCP-47     — "ru-RU" | "en-GB" | "es-ES", для Intl.NumberFormat и дат.
 *
 * Раньше преобразования были размазаны по authenticate.ts, request.ts и
 * компонентам (где числа форматировались жёстко по "ru-RU" при любом языке
 * интерфейса). Теперь — здесь, и только здесь.
 */

export const LOCALES = ["ru", "en", "es"] as const;
export type AppLocale = (typeof LOCALES)[number];

/**
 * Русский по умолчанию: пилот в Белграде, аудитория первых недель
 * русскоязычная, и базовый текст каталога написан по-русски.
 */
export const DEFAULT_LOCALE: AppLocale = "ru";
export const DEFAULT_DB_LOCALE: Locale = "RU";

/** Имя cookie, из которой next-intl (i18n/request.ts) берёт язык запроса. */
export const LOCALE_COOKIE = "ryk_locale";

/** Месяц: столько живёт выбор языка между заходами в Mini App. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Локаль для Intl: форматирование чисел и дат.
 * en-GB, а не en-US — пилот европейский: день впереди месяца, 24 часа.
 */
const BCP47: Record<AppLocale, string> = {
  ru: "ru-RU",
  en: "en-GB",
  es: "es-ES",
};

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function toAppLocale(locale: Locale): AppLocale {
  const lower = locale.toLowerCase();
  return isAppLocale(lower) ? lower : DEFAULT_LOCALE;
}

export function toDbLocale(locale: string): Locale {
  const upper = locale.toUpperCase();
  return upper === "RU" || upper === "EN" || upper === "ES" ? upper : DEFAULT_DB_LOCALE;
}

/** Тег для Intl.NumberFormat / Intl.DateTimeFormat. Принимает оба вида локали. */
export function intlTag(locale: string): string {
  const app = locale.toLowerCase();
  return isAppLocale(app) ? BCP47[app] : BCP47[DEFAULT_LOCALE];
}

/** Число по правилам языка: 2 200 / 2,200 / 2.200 — разделитель везде свой. */
export function formatNumber(value: number, locale: string): string {
  return value.toLocaleString(intlTag(locale));
}
