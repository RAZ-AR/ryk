"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { scheduleWish, type WishHorizon } from "@/app/actions/wishes";
import { weekDaysFromToday } from "@/lib/engine/weekDays";
import { Button } from "@/components/Button";
import { HandNote } from "@/components/HandNote";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./WishSchedule.module.css";

/*
 * «Когда» — срок желания.
 *
 * Три горизонта, и точность растёт по мере приближения: «когда-нибудь» и
 * «в этом месяце» — про само желание, «на этой неделе» — уже про неделю,
 * то есть желание становится историей недели. Поэтому третий горизонт
 * доступен ровно одному желанию, и занятую неделю мы не подменяем молча:
 * экшен возвращает `week_taken`, а шторка спрашивает.
 *
 * Дни — только оставшиеся до конца недели: предлагать «пойти во вторник»
 * в четверг бессмысленно, а зачёркнутый вторник в списке — это упрёк.
 */
export function WishSchedule({
  wishId,
  wishText,
  onClose,
}: {
  wishId: string;
  wishText: string;
  onClose: () => void;
}) {
  const t = useTranslations("wishes");
  const router = useRouter();

  const [day, setDay] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const days = weekDaysFromToday();

  const run = (horizon: WishHorizon, replace = false) =>
    start(async () => {
      setFailed(false);
      const res = await scheduleWish(wishId, horizon, horizon === "thisWeek" ? day : null, replace);
      if (res.ok) {
        router.refresh();
        onClose();
        return;
      }
      if (res.reason === "week_taken") {
        setTaken(res.takenTitle);
        return;
      }
      setFailed(true);
    });

  return (
    <div className={styles.sheet} role="dialog" aria-label={t("whenTitle")}>
      <div className={styles.head}>
        <SvcLabel tone="pink">{t("whenTitle")}</SvcLabel>
        <p className={styles.wish}>{wishText}</p>
      </div>

      {taken ? (
        /*
         * Неделя занята. Показываем чем — иначе «заменить?» это вопрос
         * вслепую: человек не помнит, что выбрал в понедельник.
         */
        <div className={styles.taken}>
          <p className={styles.takenLine}>{t("weekTaken", { title: taken })}</p>
          <HandNote>{t("weekTakenNote")}</HandNote>
          <div className={styles.takenActions}>
            <Button variant="primary" disabled={pending} onClick={() => run("thisWeek", true)}>
              {t("replace")}
            </Button>
            <Button variant="ghost" onClick={() => setTaken(null)}>
              {t("keep")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.options}>
            <Button variant="secondary" disabled={pending} onClick={() => run("someday")}>
              {t("timingSOMEDAY")}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => run("thisMonth")}>
              {t("timingTHIS_MONTH")}
            </Button>
          </div>

          <div className={styles.week}>
            <SvcLabel tone="muted">{t("thisWeekLabel")}</SvcLabel>
            <div className={styles.days}>
              {days.map((d) => {
                const isPicked = d.iso === day;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    aria-pressed={isPicked}
                    className={[styles.day, isPicked && styles.dayPicked].filter(Boolean).join(" ")}
                    onClick={() => setDay(isPicked ? null : d.iso)}
                  >
                    {/* Компостер: у выбранного дня пробивается круг. */}
                    <span className={styles.punch} aria-hidden="true" />
                    <span className={styles.dayName}>{t(`weekday.${d.weekday}`)}</span>
                    <span className={styles.dayNum}>{d.dayOfMonth}</span>
                  </button>
                );
              })}
            </div>

            <Button variant="primary" disabled={pending || !day} onClick={() => run("thisWeek")}>
              {day ? t("makeWeekStory") : t("pickDayFirst")}
            </Button>
          </div>
        </>
      )}

      {failed ? <p className={styles.failed}>{t("actionFailed")}</p> : null}

      <Button variant="ghost" onClick={onClose}>
        {t("cancel")}
      </Button>
    </div>
  );
}
