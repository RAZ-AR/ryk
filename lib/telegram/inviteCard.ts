import type { Locale } from "@/generated/prisma/enums";

/*
 * Текст приглашения для инлайн-карточки Telegram (switchInlineQuery).
 *
 * Не next-intl: у вебхука нет cookie/request-контекста, которым живёт
 * обычный useTranslations, а next-intl не экспортирует автономный
 * translator верхнего уровня (createTranslator живёт в use-intl — не
 * прямая зависимость проекта). Здесь несколько шаблонных строк, не
 * полноценный ICU-движок — лишний модуль ради подстановки не оправдан.
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

/** Кто зовёт — снимок из inline_query.from, в users имена не хранятся. */
export type InviteInviter = {
  name: string;
  username: string | null;
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
    companion:
      "Привет! Это RYK бот. Вас пригласил {inviter} с собой на «{title}», {date}{place}{price}",
    witness:
      "Привет! Это RYK бот. {inviter} хочет, чтобы вы стали свидетелем обещания: «{title}», {date}",
  },
  EN: {
    companion:
      'Hi! This is the RYK bot. {inviter} invites you to join them: "{title}", {date}{place}{price}',
    witness: 'Hi! This is the RYK bot. {inviter} asks you to witness a promise: "{title}", {date}',
  },
  ES: {
    companion:
      "¡Hola! Soy el bot RYK. {inviter} te invita a acompañarle: «{title}», {date}{place}{price}",
    witness:
      "¡Hola! Soy el bot RYK. {inviter} quiere que seas testigo de una promesa: «{title}», {date}",
  },
};

/** Приписка со ссылкой: и принять, и завести профиль — одним касанием. */
const CTA: Record<Locale, string> = {
  RU: "Принять или отказаться:",
  EN: "Accept or decline:",
  ES: "Aceptar o rechazar:",
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

/** «Артём (@raz_ar)» — или просто «Артём», если username скрыт настройками. */
function formatInviter(inviter: InviteInviter): string {
  return inviter.username ? `${inviter.name} (@${inviter.username})` : inviter.name;
}

/**
 * Ссылка на Mini App с параметром приглашения. Требует включённого
 * Main Mini App у бота (BotFather → Configure Mini App): только тогда
 * Telegram передаёт `startapp` в `initDataUnsafe.start_param`.
 */
export function buildInviteLink(botUsername: string, inviteId: string): string {
  return `https://t.me/${botUsername}?startapp=${inviteId}`;
}

export function buildInviteCard(
  role: InviteRole,
  story: InviteStoryContext,
  locale: Locale,
  inviter: InviteInviter,
  inviteLink: string,
): InviteCard {
  const date = formatDate(story.plannedForISO, locale);
  // Место и цена — только companion. Свидетель (Flow E) видит лишь обещание и дату.
  const isCompanion = role === "companion";
  const place = isCompanion && story.location ? ` · ${story.location}` : "";
  const price =
    isCompanion && story.price != null
      ? ` · ${story.price === 0 ? FREE_LABEL[locale] : `${story.price} ${story.currency}`}`
      : "";

  const body = TEMPLATES[locale][role]
    .replace("{inviter}", formatInviter(inviter))
    .replace("{title}", story.title)
    .replace("{date}", date)
    .replace("{place}", place)
    .replace("{price}", price);

  return {
    id: role,
    title: story.title,
    messageText: `${body}\n\n${CTA[locale]} ${inviteLink}`,
  };
}
