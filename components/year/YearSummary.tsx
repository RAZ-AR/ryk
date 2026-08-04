"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { YearView } from "@/lib/engine/year";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./YearSummary.module.css";

/*
 * Из чего сложился год — сводкой внутри «Было», а не отдельным разделом.
 *
 * Год — это те же прожитые истории, что лежат в архиве кадрами, только с
 * другого расстояния. Отдельная вершина навигации под агрегат означала бы,
 * что за ним ходят специально; на деле за ним не ходят — на него
 * натыкаются, разбирая память. Поэтому свёрнутая строка над плёнкой.
 *
 * Свёрнуто по умолчанию намеренно: развёрнутые полосы при каждом входе
 * превращают архив в отчёт о проделанной работе, а это счёт. Год —
 * награда, которую открывают, когда захотят.
 *
 * Здесь по-прежнему нет процентов, целей и нормы (см. lib/engine/year.ts):
 * длина полосы относительна самой длинной, и всё.
 */
export function YearSummary({ year }: { year: YearView }) {
  const t = useTranslations("year");
  const tCat = useTranslations("categories");
  const [open, setOpen] = useState(false);

  // Пустой год не показываем вовсе: строка «пока ничего» под пустым архивом
  // повторяла бы одну и ту же мысль дважды.
  if (year.rows.length === 0 || !year.top) return null;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.head}>
          <SvcLabel tone="muted">{t("kicker", { year: year.year })}</SvcLabel>
          {/* Названия категорий — самостоятельные подписи и потому с
              заглавной; внутри фразы она читается как ошибка. */}
          <span className={styles.lead}>
            {t("mostly", { category: tCat(year.top).toLocaleLowerCase() })}
          </span>
        </span>

        {/*
         * Стрелка — svg, а не глиф ▾: в наборе Prata / PT Serif / Plex Mono
         * его нет, и он приезжал бы из подменного шрифта другой толщиной.
         */}
        <svg
          className={[styles.chevron, open && styles.chevronOpen].filter(Boolean).join(" ")}
          viewBox="0 0 12 12"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <path
            d="M2 4.5 L6 8.5 L10 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
        </svg>
      </button>

      {open && (
        <div className={styles.body}>
          <ul className={styles.rows}>
            {year.rows.map((row) => (
              <li key={row.category} className={styles.row}>
                <span className={styles.label}>{tCat(row.category)}</span>
                <span className={styles.track}>
                  {/* Минимум 6% — чтобы одна история осталась видимой полосой,
                      а не исчезающей чёрточкой рядом с длинной. */}
                  <span
                    className={styles.bar}
                    style={{ width: `${Math.max(row.share * 100, 6)}%` }}
                  />
                </span>
                <span className={styles.value}>{row.count}</span>
              </li>
            ))}
          </ul>

          <p className={styles.note}>{t("note")}</p>
        </div>
      )}
    </div>
  );
}
