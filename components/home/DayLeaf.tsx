"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { trackDayLeafViewed } from "@/app/actions/analytics";
import { AuraArt } from "@/components/AuraArt";
import { HandNote } from "@/components/HandNote";
import type { SoonItem, Today } from "@/lib/engine/today";
import { pickAura, type AuraPalette } from "@/lib/ui/aura";
import { soonWhen } from "@/lib/ui/dayLeaf";
import type { WeatherKind } from "@/lib/weather/openMeteo";
import styles from "./DayLeaf.module.css";

/*
 * «Лист дня» (ryk_docs/22-daily-joy-plan.md, фаза 5; вид — ADR-016) —
 * открытка дня: сверху аура дня с числом внутри, ниже на бумаге — где ты,
 * какой сегодня свет, одна маленькая радость и что скоро.
 *
 * Аура дня: фигура меняется каждый день (по дате), а палитра — по погоде:
 * ясно — персик, облачно — сирень, дождь — небо, снег — масло, гроза —
 * сумерки. Открыл приложение — и цвет листа уже говорит, какой сегодня день.
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

/** Палитра ауры по погоде. Без прогноза — палитра по дате, как у карточек. */
const WEATHER_AURA: Record<WeatherKind, AuraPalette> = {
  CLEAR: "peach",
  CLOUDY: "lilac",
  RAIN: "sky",
  SNOW: "butter",
  STORM: "dusk",
};

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
  const place = [today.cityName, today.countryName].filter(Boolean).join(" · ");

  const w = today.weather;
  // Строка погоды — как спецификация на билете: подпись над значением.
  const sky = w
    ? [
        {
          label: t("skyLabel"),
          value: `${tAll(`week.weather.${w.kind}`)}, ${w.tempMax > 0 ? "+" : ""}${Math.round(w.tempMax)}°`,
        },
        w.sunrise ? { label: t("sunriseLabel"), value: w.sunrise } : null,
        w.sunset ? { label: t("sunsetLabel"), value: w.sunset } : null,
      ].filter((x): x is { label: string; value: string } => x !== null)
    : null;

  const seed = `day-${today.dateIso}`;
  const palette = w ? WEATHER_AURA[w.kind] : pickAura(seed).palette;

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
      <div className={styles.poster}>
        <AuraArt seed={seed} palette={palette} blur={16} />
        <div className={styles.posterHead}>
          {/* Обращение — именительным падежом: склонять чужое имя мы не умеем,
              а «Аня, этот день твой» читается естественно на всех трёх языках. */}
          {today.name ? (
            <p className={styles.greeting}>{t("greeting", { name: today.name })}</p>
          ) : (
            <span />
          )}
          <p className={styles.dayOfYear}>{t("dayOfYear", { n: today.dayOfYear })}</p>
        </div>
        {/* Число — внутри ауры дня, как надпись на открытке. */}
        <time className={styles.date} dateTime={today.dateIso}>
          <span className={styles.day}>{day}</span>
          <span className={styles.month}>{month}</span>
        </time>
        <p className={styles.weekday}>{weekday}</p>
      </div>

      <div className={styles.body}>
        <p className={styles.place}>{place}</p>

        {sky && sky.length > 0 && (
          <dl className={styles.sky}>
            {sky.map((item) => (
              <div key={item.label} className={styles.skyItem}>
                <dt className={styles.skyLabel}>{item.label}</dt>
                <dd className={styles.skyValue}>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className={styles.joy}>
          <HandNote size="large">{tAll(`joy.${today.joyKey}`, today.joyParams ?? {})}</HandNote>
        </p>

        {today.soon.length > 0 && (
          <>
            <hr className={styles.divider} />
            <ul className={styles.soon} aria-label={t("soon")}>
              {today.soon.map((item) => (
                <li
                  key={`${item.type}-${item.date}-${item.type === "moment" ? item.key : item.id}`}
                  className={[styles.soonItem, item.type === "moment" && item.quiet && styles.quiet]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <time dateTime={item.date} className={styles.when}>
                    {when(item)}
                  </time>
                  <span aria-hidden="true"> · </span>
                  <span>{title(item)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
