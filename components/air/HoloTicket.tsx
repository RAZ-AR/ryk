import type { ReactNode } from "react";
import { Fog, type FogMood } from "./Fog";
import styles from "./HoloTicket.module.css";

/*
 * Билет «Воздуха»: сверху голографическая афиша с крупным названием,
 * снизу белый корешок со строгой сеткой — день, место, цена, с кем.
 * Эмоция и порядок на одном предмете: верх хочется прожить, низ понятно,
 * как прожить. Вырезы — вырубка формы (mask), а не кружки поверх.
 */

export type TicketRow = { label: string; value: string };

type Props = {
  mood?: FogMood;
  /** Строка над названием: «RYK · НЕДЕЛЯ 33». */
  kicker: string;
  title: string;
  /** Под названием: категория — «ПРИРОДА». */
  subtitle?: string;
  place: string;
  placeLabel: string;
  /** Крупная дата справа: «16» / «АВГ». */
  day: string;
  month: string;
  rows: TicketRow[];
  footnote: string;
  /** Знак в углу корешка — например, пиктограмма категории. */
  stamp?: ReactNode;
};

export function HoloTicket({
  mood = "holo",
  kicker,
  title,
  subtitle,
  place,
  placeLabel,
  day,
  month,
  rows,
  footnote,
  stamp,
}: Props) {
  return (
    <article className={styles.ticket}>
      <Fog mood={mood} grain className={styles.poster}>
        <span className={styles.hole} aria-hidden="true" />
        <span className={[styles.hole, styles.holeRight].join(" ")} aria-hidden="true" />
        <div className={styles.kicker}>{kicker}</div>
        <div className={styles.titleWrap}>
          <svg
            className={styles.orbit}
            viewBox="0 0 200 60"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <ellipse cx="100" cy="30" rx="98" ry="22" transform="rotate(-8 100 30)" />
          </svg>
          <h3 className={styles.title}>{title}</h3>
        </div>
        {subtitle && <div className={styles.subtitle}>+ {subtitle} +</div>}
        <span className={styles.bar} aria-hidden="true" />
      </Fog>

      <div className={styles.stub}>
        <div className={styles.head}>
          <div>
            <div className={styles.label}>{placeLabel}</div>
            <div className={styles.place}>{place}</div>
          </div>
          <div className={styles.date}>
            <span>{day}</span>
            <span className={styles.month}>{month}</span>
          </div>
        </div>
        <dl className={styles.grid}>
          {rows.map((r) => (
            <div key={r.label} className={styles.cell}>
              <dt className={styles.label}>{r.label}</dt>
              <dd className={styles.value}>{r.value}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.foot}>
          <span className={styles.barcode} aria-hidden="true" />
          <span className={styles.footnote}>{footnote}</span>
          {stamp && <span className={styles.stamp}>{stamp}</span>}
        </div>
      </div>
    </article>
  );
}
