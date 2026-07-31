import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "./locale";

/*
 * Перевод карточки впечатления.
 *
 * Каталог курируемый (ADR-006) и написан по-русски, поэтому базовый язык —
 * колонки `title` / `description` / `location` самой строки, а `translations`
 * несёт остальные языки:
 *
 *   { "en": { "title": "…", "description": "…", "location": "…" },
 *     "es": { … } }
 *
 * Правило отката строгое и поштучное: нет языка — берём базовый текст,
 * есть язык, но нет поля — базовое значение только этого поля. Пустая
 * карточка хуже карточки на чужом языке: человек не сможет выбрать неделю.
 *
 * Город (`city`) сюда не входит намеренно: по нему идёт подбор «рядом»
 * (совпадение с `users.city`), и переведённое значение сломало бы сравнение.
 * Пользователю город впечатления и не показывается — только место.
 */

/** Поля, которые куратор пишет словами и которые видит человек. */
export const TRANSLATABLE_FIELDS = ["title", "description", "location"] as const;
export type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number];

export type ExperienceTranslation = Partial<Record<TranslatableField, string>>;

/** Языки перевода — все, кроме базового: его несут сами колонки. */
export type ExperienceTranslations = Partial<Record<AppLocale, ExperienceTranslation>>;

/** То, что приходит из БД: JSON-колонка типизирована как unknown. */
export type TranslatableExperience = {
  title: string;
  description?: string | null;
  location?: string | null;
  translations?: unknown;
};

export type LocalizedText = {
  title: string;
  description: string | null;
  location: string | null;
};

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Разобрать JSON-колонку. Всё, что не похоже на перевод (мусор, старый
 * формат, null), молча отбрасывается: карточка должна показаться в любом
 * случае, пусть и на базовом языке.
 */
export function parseTranslations(raw: unknown): ExperienceTranslations {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: ExperienceTranslations = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const locale = key.toLowerCase();
    if (!isAppLocale(locale) || !value || typeof value !== "object") continue;

    const fields: ExperienceTranslation = {};
    for (const field of TRANSLATABLE_FIELDS) {
      const text = nonEmpty((value as Record<string, unknown>)[field]);
      if (text) fields[field] = text;
    }
    if (Object.keys(fields).length > 0) out[locale] = fields;
  }
  return out;
}

/**
 * Текст карточки на языке интерфейса. Принимает и "ru", и "RU" — вызывающий
 * код живёт по обе стороны от Prisma.
 */
export function localizeExperience(row: TranslatableExperience, locale: string): LocalizedText {
  const base: LocalizedText = {
    title: row.title,
    description: nonEmpty(row.description),
    location: nonEmpty(row.location),
  };

  const app = locale.toLowerCase();
  // Базовый язык уже лежит в колонках — разбирать JSON незачем.
  if (!isAppLocale(app) || app === DEFAULT_LOCALE) return base;

  const translation = parseTranslations(row.translations)[app];
  if (!translation) return base;

  return {
    title: translation.title ?? base.title,
    description: translation.description ?? base.description,
    location: translation.location ?? base.location,
  };
}

/** Собрать колонку из введённого куратором. Пустые поля не сохраняем. */
export function buildTranslations(
  input: Partial<Record<AppLocale, ExperienceTranslation>>,
): ExperienceTranslations {
  return parseTranslations(input);
}
