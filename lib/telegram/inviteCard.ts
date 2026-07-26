import type { Locale } from "@/generated/prisma/enums";

/*
 * Текст приглашения для инлайн-карточки Telegram (switchInlineQuery).
 *
 * Не next-intl: у вебхука нет cookie/request-контекста, которым живёт
 * обычный useTranslations, а next-intl не экспортирует автономный
 * translator верхнего уровня (createTranslator живёт в use-intl — не
 * прямая зависимость проекта). Здесь нужны две короткие шаблонные строки,
 * не полноценный ICU-движок — простая подстановка {title}/{date} с
 * лишним модулем не оправдана.
 *
 * Свидетелю (witness, Flow E из 08-social-and-accountability) — только
 * название истории и дата, никогда бюджет или место: «друг видит только
 * обещание и итог, без деталей».
 */

export type InviteRole = "companion" | "witness";

export type InviteStoryContext = {
  title: string;
  /** YYYY-MM-DD или null, если день ещё не выбран. */
  plannedForISO: string | null;
  location: string | null;
  price: number | null;
  currency: string;
};

export type InviteCard = {
  /** Уникален в пределах одного inline-ответа. */
  id: string;
  /** Заголовок результата в пикере Telegram. */
  title: string;
  /** Текст, который реально уйдёт в чат при выборе. */
  messageText: string;
};

const LOCALE_TAG: Record<Locale, string> = { RU: "ru-RU", EN: "en-US", ES: "es-ES" };

const TEMPLATES: Record<Locale, Record<InviteRole, string>> = {
  RU: {
    companion: "Пойдёшь со мной? «{title}», {date}{place}{price}",
    witness: "Обещаю себе: «{title}», {date}. Будешь свидетелем?",
  },
  EN: {
    companion: 'Want to join me? "{title}", {date}{place}{price}',
    witness: 'I\'m promising myself: "{title}", {date}. Will you witness it?',
  },
  ES: {
    companion: "¿Te vienes conmigo? «{title}», {date}{place}{price}",
    witness: "Me lo prometo: «{title}», {date}. ¿Serás testigo?",
  },
};

const NO_DATE: Record<Locale, string> = {
  RU: "дата ещё не выбрана",
  EN: "date not set yet",
  ES: "fecha aún sin definir",
};

const FREE_LABEL: Record<Locale, string> = {
  RU: "бесплатно",
  EN: "free",
  ES: "gratis",
};

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return NO_DATE[locale];
  const date = new Date(`${iso}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function buildInviteCard(
  role: InviteRole,
  story: InviteStoryContext,
  locale: Locale,
): InviteCard {
  const date = formatDate(story.plannedForISO, locale);
  // Место и цена — только companion. Свидетель (Flow E) видит лишь обещание и дату.
  const isCompanion = role === "companion";
  const place = isCompanion && story.location ? ` · ${story.location}` : "";
  const price =
    isCompanion && story.price != null
      ? ` · ${story.price === 0 ? FREE_LABEL[locale] : `${story.price} ${story.currency}`}`
      : "";

  const text = TEMPLATES[locale][role]
    .replace("{title}", story.title)
    .replace("{date}", date)
    .replace("{place}", place)
    .replace("{price}", price);

  return {
    id: role,
    title: story.title,
    messageText: text,
  };
}
