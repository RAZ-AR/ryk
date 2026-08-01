import type { ExperienceKind, LifeCategory } from "@/generated/prisma/enums";
import {
  buildTranslations,
  type ExperienceTranslation,
  type ExperienceTranslations,
} from "@/lib/i18n/experience";

/*
 * Разбор формы куратора в поля Experience.
 *
 * Отдельная чистая функция, а не логика внутри server action: правила
 * «что считается валидным событием» — продуктовые, их надо проверять тестами,
 * а не кликами. Куратор торопится и вводит грязные данные (цена «2 200 дин»,
 * ссылка без схемы) — здесь мы это нормализуем, а не отбиваем ошибкой.
 */

export const CATEGORIES: LifeCategory[] = [
  "JOY",
  "CONNECTION",
  "DISCOVERY",
  "MOVEMENT",
  "CULTURE",
  "NATURE",
  "CHALLENGE",
  "REST",
  "CONTRIBUTION",
];

/**
 * Типы впечатления. Нужны куратору отдельным полем: без него каждое новое
 * впечатление становится событием, и каталог со временем снова съезжает
 * в афишу города — ровно то, от чего мы уходим.
 */
export const KINDS: ExperienceKind[] = ["EVENT", "CHALLENGE", "RITUAL"];

/**
 * Языки перевода в форме. Базовый (русский) сюда не входит: он и есть
 * основные поля карточки.
 */
export const TRANSLATION_LOCALES = ["en", "es"] as const;

export type ExperienceInput = {
  title: string;
  description: string | null;
  category: LifeCategory;
  kind: ExperienceKind;
  imageUrl: string | null;
  city: string | null;
  location: string | null;
  startTime: Date | null;
  durationMin: number | null;
  price: number | null;
  currency: string;
  bookingUrl: string | null;
  sponsored: boolean;
  /** Английский и испанский текст карточки. Пустые языки не попадают сюда. */
  translations: ExperienceTranslations;
};

export type ParseResult =
  | { ok: true; value: ExperienceInput }
  /** Коды, а не текст: сообщения живут в UI и переводимы. */
  | { ok: false; errors: string[] };

function str(v: FormDataEntryValue | null, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Число из «2 200», «2200 rsd», «» — куратор не обязан печатать чисто. */
function num(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string") return null;
  const digits = v.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Ссылка на билеты. Схему дописываем сами (куратор вставит `ticketmaster.rs/…`),
 * но пускаем только http(s): `javascript:` в bookingUrl — это XSS в чужом клике.
 */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Переводы из полей вида `title_en`, `description_es`, `location_en`.
 *
 * Незаполненный язык — не ошибка: карточку надо уметь завести быстро,
 * пока событие не ушло, а перевод дописать следующим заходом. Пока его
 * нет, англоязычный пользователь увидит русский текст — это хуже перевода,
 * но лучше пустой карточки (см. lib/i18n/experience.ts).
 */
function parseTranslationFields(form: FormData): ExperienceTranslations {
  const draft: Partial<Record<(typeof TRANSLATION_LOCALES)[number], ExperienceTranslation>> = {};

  for (const locale of TRANSLATION_LOCALES) {
    draft[locale] = {
      title: str(form.get(`title_${locale}`), 140),
      description: str(form.get(`description_${locale}`), 500),
      location: str(form.get(`location_${locale}`), 140),
    };
  }

  // buildTranslations сам выбросит пустые поля и пустые языки.
  return buildTranslations(draft);
}

export function parseExperienceInput(form: FormData): ParseResult {
  const errors: string[] = [];

  const title = str(form.get("title"), 140);
  if (title.length < 3) errors.push("title");

  const rawCategory = str(form.get("category"), 32) as LifeCategory;
  if (!CATEGORIES.includes(rawCategory)) errors.push("category");

  // Дата и время местные для куратора; в БД уходит как есть (datetime-local
  // без зоны). Пилот — один часовой пояс, Europe/Belgrade.
  const rawStart = str(form.get("startTime"), 32);
  let startTime: Date | null = null;
  if (rawStart) {
    const parsed = new Date(rawStart);
    if (Number.isNaN(parsed.getTime())) errors.push("startTime");
    else startTime = parsed;
  }

  // Тип по умолчанию — событие: старые формы и импорты без поля продолжают
  // работать так же, как до появления вызовов и ритуалов.
  const rawKind = (str(form.get("kind"), 16) || "EVENT") as ExperienceKind;
  if (!KINDS.includes(rawKind)) errors.push("kind");

  const rawUrl = str(form.get("bookingUrl"), 500);
  const bookingUrl = rawUrl ? normalizeUrl(rawUrl) : null;
  if (rawUrl && !bookingUrl) errors.push("bookingUrl");

  const rawImage = str(form.get("imageUrl"), 500);
  const imageUrl = rawImage ? normalizeUrl(rawImage) : null;
  if (rawImage && !imageUrl) errors.push("imageUrl");

  if (errors.length > 0) return { ok: false, errors };

  const currency = str(form.get("currency"), 8).toUpperCase() || "RSD";

  return {
    ok: true,
    value: {
      title,
      description: str(form.get("description"), 500) || null,
      category: rawCategory,
      kind: rawKind,
      imageUrl,
      city: str(form.get("city"), 80) || null,
      location: str(form.get("location"), 140) || null,
      startTime,
      durationMin: num(form.get("durationMin")),
      price: num(form.get("price")),
      currency,
      bookingUrl,
      // Прозрачность спонсорства — продуктовое обещание (PRD §7):
      // отметка ставится здесь и дальше всегда видна пользователю.
      sponsored: form.get("sponsored") === "on",
      translations: parseTranslationFields(form),
    },
  };
}
