"use client";

import { useTranslations } from "next-intl";
import type { MemoryView } from "@/lib/engine/weekly";
import { SvcLabel } from "@/components/SvcLabel";
import { FilmFrame } from "./FilmFrame";
import styles from "./MemorySection.module.css";

/*
 * Архив впечатлений (PRD 5.9) — проявленная плёнка, а не сетка превью.
 *
 * Сетка читается как коллекция, которую хочется пополнять: пустые ячейки
 * просят себя заполнить, а это счёт и давление. Плёнка идёт сверху вниз,
 * по одному кадру, и просто заканчивается там, где закончилась.
 *
 * Перенесённые недели — такие же кадры, только тише: «незавершённые
 * желания без чувства вины».
 */

export function MemorySection({ memories }: { memories: MemoryView[] }) {
  const t = useTranslations("memory");
  const tWeek = useTranslations("week");

  const lived = memories.filter((m) => !m.deferred).length;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <SvcLabel tone="pink">{t("kicker")}</SvcLabel>
          <div className={styles.heading}>{t("title")}</div>
        </div>
        <span className={styles.count}>{lived}</span>
      </div>
      <p className={styles.subtitle}>{t("subtitle")}</p>

      {memories.length === 0 ? (
        <p className={styles.empty}>{t("empty")}</p>
      ) : (
        <div className={styles.film}>
          {memories.map((m) => {
            // Неделя как «26.07» — год в кадре лишний шум.
            const d = new Date(`${m.weekLabel}T12:00:00.000Z`);
            const week = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

            return (
              <FilmFrame
                key={m.id}
                id={m.id}
                date={week}
                title={m.deferred ? t("deferredCard") : m.title}
                note={m.note}
                footnote={
                  m.deferred
                    ? t("willReturn")
                    : (m.companion ?? (m.emotion ? tWeek(`emotion.${m.emotion}`) : t("alone")))
                }
                category={m.category}
                photo={m.photo}
                deferred={m.deferred}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
