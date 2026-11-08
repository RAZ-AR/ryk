"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { trackDayLeafViewed } from "@/app/actions/analytics";
import { PrintArt } from "@/components/PrintArt";
import type { SoonItem, Today } from "@/lib/engine/today";
import type { PrintShape } from "@/lib/ui/print";
import { soonWhen } from "@/lib/ui/dayLeaf";
import type { WeatherKind } from "@/lib/weather/openMeteo";
import styles from "./DayLeaf.module.css";

/*
 * «Лист дня» (ryk_docs/22-daily-joy-plan.md, фаза 5; вид — ADR-017) —
 * первая полоса дня прямо на бумаге, без карточки: оттиск дня, дата
 * гротеском и погода курсивом («8 ноября. / Облачно.»), одна маленькая
 * радость, свет дня спецификацией и что скоро.
 *
 * Оттиск дня: фигура говорит о погоде — ясно — лучи, облачно — свечение,
 * дождь — волна, снег — цветок, гроза — кольца. Без прогноза — по дате.
 *
 * Это не дашборд: ни метрик, ни прогресса, ни кнопок «сделал». Радость
 * только читается. Нет данных для строки — строки нет, лист короче, а не
 * заполнен заглушкой. «Скоро» — без обратного отсчёта (см. lib/ui/dayLeaf.ts)
 * и мелким шрифтом: число на листе одно, и это сегодняшнее.
 */

/** Дата листа — календарная, без пояса: форматируем её как полночь UTC. */
function utcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Месяц берём из formatToParts вместе с числом, а не отдельным
 * `{ month: "long" }`: так русский получает родительный падеж («12 мая»),
 * а не именительный («май»).
 */
function monthOf(iso: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).formatToParts(utcDate(iso));
  return parts.find((p) => p.type === "month")?.value ?? "";
}

/** Фигура оттиска по погоде. Без прогноза — по дате, как у карточек. */
const WEATHER_SHAPE: Record<WeatherKind, PrintShape> = {
  CLEAR: "rays",
  CLOUDY: "glow",
  RAIN: "wave",
  SNOW: "flower",
  STORM: "rings",
};

/** «облачно» → «Облачно.» — вторая строка заголовка, как подпись к числу. */
function sentence(word: string, locale: string): string {
  return `${word.charAt(0).toLocaleUpperCase(locale)}${word.slice(1)}.`;
}

function formatDate(iso: string, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(utcDate(iso));
}

export function DayLeaf({
  today,
  trackView = true,
}: {
  today: Today;
  /** Витрина дизайн-системы показывает лист без аналитики. */
  trackView?: boolean;
}) {
  const t = useTranslations("home.leaf");
  const tAll = useTranslations();
  const locale = useLocale();

  // Один раз на монтирование: повторные рендеры (refresh после реакции на
  // карточку) не должны раздувать просмотры.
  const viewedRef = useRef(false);
  const hasWeather = today.weather !== null;
  const soonCount = today.soon.length;
  useEffect(() => {
    if (!trackView || viewedRef.current) return;
    viewedRef.current = true;
    void trackDayLeafViewed(hasWeather, soonCount);
  }, [trackView, hasWeather, soonCount]);

  const day = Number(today.dateIso.slice(8, 10));
  const month = monthOf(today.dateIso, locale);
  const weekday = formatDate(today.dateIso, locale, { weekday: "long" });
  const place = [today.cityName, today.countryName].filter(Boolean).join(" / ");

  const w = today.weather;
  // Свет дня — спецификацией: подпись моно над значением.
  const sky = w
    ? [
        { label: t("skyLabel"), value: `${w.tempMax > 0 ? "+" : ""}${Math.round(w.tempMax)}°` },
        w.sunrise ? { label: t("sunriseLabel"), value: w.sunrise } : null,
        w.sunset ? { label: t("sunsetLabel"), value: w.sunset } : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    : null;

  const seed = `day-${today.dateIso}`;
  const greeting = today.name ? t("greeting", { name: today.name }) : null;
  // Вторая строка заголовка: погода, а без прогноза — обращение по имени.
  const second = w ? sentence(tAll(`week.weather.${w.kind}`), locale) : greeting;

  const when = (item: SoonItem): string => {
    // День памяти называем только датой: «в пятницу · …» звучало бы как
    // приглашение, а 24 апреля — не повод для планов.
    const quiet = item.type === "moment" && item.quiet;
    const rel = quiet ? ({ kind: "date" } as const) : soonWhen(today.dateIso, item.date);
    switch (rel.kind) {
      case "today":
        return t("today");
      case "tomorrow":
        return t("tomorrow");
      case "weekday":
        return t(`on.${rel.weekday}`);
      case "date":
        return formatDate(item.date, locale, { day: "numeric", month: "long" });
    }
  };

  const title = (item: SoonItem): string =>
    item.type === "moment" ? tAll(`moments.${item.key}`) : item.title;

  return (
    <section className={styles.leaf} aria-label={t("aria")}>
      <div className={styles.art}>
        <PrintArt seed={seed} shape={w ? WEATHER_SHAPE[w.kind] : undefined} ratio={1} />
      </div>

      <p className={styles.eyebrow}>
        {weekday}
        <span className={styles.slash} aria-hidden="true">
          /
        </span>
        <span className={styles.srOnly}>, </span>
        {t("dayOfYear", { n: today.dayOfYear })}
      </p>

      <h2 className={styles.headline}>
        <time dateTime={today.dateIso}>
          {day}&nbsp;{month}.
        </time>
        {second ? <span className={styles.second}>{second}</span> : null}
      </h2>

      {/* Обращение — отдельной тихой строкой, если имя не ушло в заголовок. */}
      {w && greeting ? <p className={styles.greeting}>{greeting}</p> : null}

      <p className={styles.joy}>{tAll(`joy.${today.joyKey}`, today.joyParams ?? {})}</p>

      {place ? <p className={styles.place}>{place}</p> : null}

      {sky && sky.length > 0 && (
        <dl className={styles.sky}>
          {sky.map((item) => (
            <div key={item.label}>
              <dt className={styles.skyLabel}>{item.label}</dt>
              <dd className={styles.skyValue}>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {today.soon.length > 0 && (
        <div className={styles.soonBlock}>
          <p className={styles.soonLabel}>{t("soon")}</p>
          <ul className={styles.soon} aria-label={t("soon")}>
            {today.soon.map((item) => (
              <li
                key={`${item.type}-${item.date}-${item.type === "moment" ? item.key : item.id}`}
                className={item.type === "moment" && item.quiet ? styles.quiet : undefined}
              >
                <time dateTime={item.date} className={styles.when}>
                  {when(item)}
                </time>
                <span aria-hidden="true"> · </span>
                <span>{title(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
