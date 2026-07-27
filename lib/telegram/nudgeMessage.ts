import type { Locale } from "@/generated/prisma/enums";
import type { NudgeCode } from "@/lib/engine/nudges";

/*
 * Текст сообщения, которое бот шлёт первым.
 *
 * Не next-intl по той же причине, что и в inviteCard: у крона нет
 * request-контекста, которым живёт useTranslations.
 *
 * Тон отдельно важен здесь. Это единственное место, где мы приходим к
 * человеку сами, не дожидаясь, пока он откроет приложение. Поэтому:
 * никакого «не забудь», никаких вопросов «ну что, идёшь?», ни одного
 * восклицательного знака. Каждое сообщение заканчивается конкретным
 * действием или прямо говорит, что делать ничего не нужно.
 */

type Template = (ctx: NudgeContext) => string;

export type NudgeContext = {
  title: string;
  /** Локализованное название дня для WEATHER_SWAP («в субботу»). */
  suggestedDay?: string;
  /** Короткое описание погоды предложенного дня («ясно, +18°»). */
  suggestedWeather?: string;
};

const TEMPLATES: Record<Locale, Partial<Record<NudgeCode, Template>>> = {
  RU: {
    WEATHER_SWAP: (c) =>
      `«${c.title}» — в выбранный день обещают непогоду.\n` +
      `${c.suggestedDay ? `${c.suggestedDay} лучше: ${c.suggestedWeather}.` : ""}\n` +
      `Перенести день можно в приложении.`,
    TOMORROW: (c) => `«${c.title}» — завтра.\nОсталось решить, во сколько выходишь.`,
    INVITE_SOMEONE: (c) =>
      `«${c.title}» — ты собирался не один, но спутник пока не назван.\n` +
      `Позвать можно из приложения, в одно касание.`,
  },
  EN: {
    WEATHER_SWAP: (c) =>
      `"${c.title}" — the forecast for your day looks rough.\n` +
      `${c.suggestedDay ? `${c.suggestedDay} looks better: ${c.suggestedWeather}.` : ""}\n` +
      `You can move the day in the app.`,
    TOMORROW: (c) => `"${c.title}" — that's tomorrow.\nAll that's left is deciding when you leave.`,
    INVITE_SOMEONE: (c) =>
      `"${c.title}" — you meant to go with someone, but no one is named yet.\n` +
      `You can invite them from the app in one tap.`,
  },
  ES: {
    WEATHER_SWAP: (c) =>
      `«${c.title}» — para ese día anuncian mal tiempo.\n` +
      `${c.suggestedDay ? `${c.suggestedDay} pinta mejor: ${c.suggestedWeather}.` : ""}\n` +
      `Puedes cambiar el día en la app.`,
    TOMORROW: (c) => `«${c.title}» — es mañana.\nSolo queda decidir a qué hora sales.`,
    INVITE_SOMEONE: (c) =>
      `«${c.title}» — querías ir acompañado, pero aún no hay nadie.\n` +
      `Puedes invitar desde la app, en un toque.`,
  },
};

/** Итог недели для свидетеля: он видит только обещание и результат (Flow E). */
const WITNESS_TEMPLATES: Record<Locale, { done: Template; deferred: Template }> = {
  RU: {
    done: (c) => `«${c.title}» — состоялось.\nТы был свидетелем этого обещания.`,
    deferred: (c) =>
      `«${c.title}» — перенеслось на другой раз.\n` + `Это не провал, и отвечать ничего не нужно.`,
  },
  EN: {
    done: (c) => `"${c.title}" — it happened.\nYou witnessed that promise.`,
    deferred: (c) =>
      `"${c.title}" — it moved to another time.\nThat's not a failure, and no reply is needed.`,
  },
  ES: {
    done: (c) => `«${c.title}» — ocurrió.\nFuiste testigo de esa promesa.`,
    deferred: (c) =>
      `«${c.title}» — se ha movido a otro momento.\n` +
      `No es un fracaso y no hace falta responder.`,
  },
};

/** null — для этого кода бот не пишет (см. WORTH_SENDING в nudgeDelivery). */
export function buildNudgeMessage(
  code: NudgeCode,
  locale: Locale,
  ctx: NudgeContext,
): string | null {
  const template = TEMPLATES[locale]?.[code] ?? TEMPLATES.RU[code];
  if (!template) return null;
  // Пустая строка появляется, когда у WEATHER_SWAP нет дня-замены.
  return template(ctx).split("\n").filter(Boolean).join("\n");
}

export function buildWitnessMessage(
  outcome: "done" | "deferred",
  locale: Locale,
  ctx: NudgeContext,
): string {
  const templates = WITNESS_TEMPLATES[locale] ?? WITNESS_TEMPLATES.RU;
  return templates[outcome](ctx);
}
