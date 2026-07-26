"use client";

import { useTranslations } from "next-intl";
import type { WeeklyView } from "@/lib/engine/weekly";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./WeekBlock.module.css";

/*
 * Состояние недели одним блоком: что сейчас требуется от человека.
 * Тап открывает полный цикл — сам цикл не переписан, он живёт в WeekSection.
 */
export function WeekBlock({ view, onOpen }: { view: WeeklyView; onOpen: () => void }) {
  const t = useTranslations("home");
  const tWeek = useTranslations("week");

  /** Сколько дней осталось — считаем здесь же, чтобы не тащить весь nudge. */
  const daysLeft = (iso: string | null): number | null => {
    if (!iso) return null;
    const target = new Date(`${iso}T00:00:00.000Z`).getTime();
    const today = new Date();
    const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    return Math.round((target - start) / 86_400_000);
  };

  const daysWord = (n: number) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return tWeek("daysLeftOne", { count: n });
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
      return tWeek("daysLeftFew", { count: n });
    return tWeek("daysLeftMany", { count: n });
  };

  const content = () => {
    switch (view.kind) {
      case "choose":
        return {
          kicker: t("weekKicker"),
          title: t("chooseTitle"),
          line: t("chooseLine", { count: view.candidates.length }),
          days: null,
          quiet: false,
        };
      case "commit":
        return {
          kicker: t("weekKicker"),
          title: view.story.title,
          line: t("commitLine"),
          days: null,
          quiet: false,
        };
      case "committed": {
        const left = daysLeft(view.commitment.plannedFor);
        return {
          kicker: t("weekKicker"),
          title: view.story.title,
          line: view.commitment.companionName
            ? t("committedWith", { who: view.commitment.companionName })
            : t("committedSolo"),
          days: left != null && left > 0 ? left : null,
          quiet: false,
        };
      }
      case "checkin":
        return {
          kicker: t("weekKicker"),
          title: view.story.title,
          line: t("checkinLine"),
          days: null,
          quiet: false,
        };
      case "completed":
        return {
          kicker: t("weekDone"),
          title: view.story.title,
          line: t("completedLine"),
          days: null,
          quiet: false,
        };
      case "deferred":
        return {
          kicker: t("weekQuiet"),
          title: t("deferredTitle"),
          line: t("deferredLine"),
          days: null,
          quiet: true,
        };
    }
  };

  const c = content();

  return (
    <button
      type="button"
      className={[styles.block, c.quiet && styles.quiet].filter(Boolean).join(" ")}
      onClick={onOpen}
    >
      <span className={styles.head}>
        <SvcLabel tone="ink">{c.kicker}</SvcLabel>
        <SvcLabel tone={c.quiet ? "muted" : "ink"}>{t("open")}</SvcLabel>
      </span>

      <span className={styles.title}>{c.title}</span>
      <span className={styles.line}>{c.line}</span>

      {c.days != null && (
        <span className={styles.countdown}>
          <span className={styles.num}>{c.days}</span>
          <span className={styles.unit}>
            {daysWord(c.days)} {tWeek("untilStory")}
          </span>
        </span>
      )}
    </button>
  );
}
