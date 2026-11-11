"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CardReason, CardWhen } from "@/lib/engine/cardContext";

/*
 * Слова для контекста карточки: «почему тебе» и «когда».
 * Один источник для ленты, колоды и листа — чтобы одна и та же карточка
 * не объясняла себя по-разному на трёх экранах.
 */
export function useCardContextText() {
  const t = useTranslations("home");
  const tCat = useTranslations("categories");
  const tWeather = useTranslations("week.weather");
  const locale = useLocale();

  const reason = (r: CardReason | null): string | undefined => {
    if (!r) return undefined;
    switch (r.code) {
      case "FELT_GOOD":
      case "LIKED_CATEGORY":
        return t(`reason.${r.code}`, { category: tCat(r.category) });
      case "NEARBY":
        return t("reason.NEARBY", { km: r.km });
      default:
        return t(`reason.${r.code}`);
    }
  };

  /** «Сегодня · 19:00 · ясно, +14°» — словом или датой, без отсчёта. */
  const when = (w: CardWhen | null): string | undefined => {
    if (!w) return undefined;
    const day = (() => {
      switch (w.rel.kind) {
        case "today":
          return t("leaf.today");
        case "tomorrow":
          return t("leaf.tomorrow");
        case "weekday":
          return t(`leaf.on.${w.rel.weekday}`);
        case "date": {
          const [y, m, d] = w.date.split("-").map(Number);
          return new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          }).format(new Date(Date.UTC(y, m - 1, d)));
        }
      }
    })();
    const weather = w.weather
      ? `${tWeather(w.weather.kind)}, ${w.weather.tempMax > 0 ? "+" : ""}${Math.round(w.weather.tempMax)}°`
      : null;
    return [day, w.time, weather].filter(Boolean).join(" · ");
  };

  return { reason, when, reasonLabel: t("reasonLabel") };
}
