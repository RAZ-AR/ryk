"use client";

import { useTranslations } from "next-intl";
import type { YearView } from "@/lib/engine/year";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./YearSection.module.css";

/*
 * Из чего сложился год.
 *
 * Здесь нет процентов, целей и «идеального баланса»: колесо жизни с целевыми
 * значениями — это счёт, а за счётом приходит стыд. Полосы показывают только
 * то, что было, длина — относительно самой длинной.
 *
 * Категории с нулём не выводятся вовсе: девять полос, из которых восемь
 * пустые, читаются как список дел. Вывод «мало природы» человек сделает сам,
 * мы его не произносим.
 */
export function YearSection({ year }: { year: YearView }) {
  const t = useTranslations("year");
  const tCat = useTranslations("categories");

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <SvcLabel tone="pink">{t("kicker", { year: year.year })}</SvcLabel>
          <h1 className={styles.title}>{t("title")}</h1>
        </div>
        <span className={styles.count}>{year.total}</span>
      </div>

      {year.rows.length === 0 ? (
        <p className={styles.empty}>{t("empty")}</p>
      ) : (
        <>
          {year.top ? (
            <p className={styles.lead}>
              {/* Названия категорий — самостоятельные подписи и потому с
                  заглавной; внутри фразы она читается как ошибка. */}
              {t("mostly", { category: tCat(year.top).toLocaleLowerCase() })}
            </p>
          ) : null}

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
        </>
      )}
    </div>
  );
}
