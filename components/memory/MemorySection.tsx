"use client";

import { useTranslations } from "next-intl";
import type { LifeCategory } from "@/generated/prisma/enums";
import type { MemoryView } from "@/lib/engine/weekly";
import { MemoryCard, type MemoryDot } from "@/components/MemoryCard";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./MemorySection.module.css";

/*
 * Архив впечатлений (PRD 5.9). Перенесённые недели показываем наравне
 * с прожитыми — «незавершённые желания без чувства вины».
 */

/** Цвет точки по категории — чтобы архив читался как коллекция, а не список. */
function dotFor(category: LifeCategory | null, deferred: boolean): MemoryDot {
  if (deferred) return "empty";
  switch (category) {
    case "NATURE":
    case "MOVEMENT":
      return "gold";
    case "CONNECTION":
    case "JOY":
      return "rose";
    default:
      return "pink";
  }
}

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
        <div className={styles.grid}>
          {memories.map((m) => {
            // Неделя как «26.07» — год в карточке лишний шум.
            const d = new Date(`${m.weekLabel}T12:00:00.000Z`);
            const week = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

            return (
              <MemoryCard
                key={m.id}
                week={week}
                title={m.deferred ? t("deferredCard") : m.title}
                quote={m.note ?? undefined}
                companion={
                  m.deferred
                    ? t("willReturn")
                    : (m.companion ?? (m.emotion ? tWeek(`emotion.${m.emotion}`) : t("alone")))
                }
                dot={dotFor(m.category, m.deferred)}
                deferred={m.deferred}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
