import type { ReactNode } from "react";
import { Bubble } from "./Bubble";
import { Fog, type FogMood } from "./Fog";
import { Glass } from "./Glass";
import { Orb } from "./Orb";
import styles from "./DayLeaf.module.css";

/*
 * «Лист дня» — верх главной в «Воздухе». Не дашборд: одна большая дата,
 * место, одна маленькая радость и два пузыря «небо» и «скоро».
 * Не больше шести строк; ни метрик, ни прогресса, ни отсчёта-давления.
 *
 * Компонент чисто показывает: данные соберёт движок дня (lib/engine/today,
 * фаза 4 плана), сейчас их подставляет витрина.
 */

type Props = {
  mood: FogMood;
  place: string;
  weekday: string;
  day: string;
  /** «августа · 226-й день года». */
  dateLine: string;
  joyKicker: string;
  joy: string;
  sky: { label: string; value: string; unit: string; caption: string };
  soon: { label: string; value: string; caption: string };
  /** Действия в углу — круглые стеклянные кнопки. */
  actions?: ReactNode;
};

export function DayLeaf({
  mood,
  place,
  weekday,
  day,
  dateLine,
  joyKicker,
  joy,
  sky,
  soon,
  actions,
}: Props) {
  return (
    <section className={styles.leaf}>
      <Fog mood={mood} className={styles.sheet}>
        <Orb mood={mood} size={220} className={styles.orb} />
        <div className={styles.top}>
          <Glass>
            <svg viewBox="0 0 16 16" className={styles.pin} aria-hidden="true">
              <path d="M8 15 C8 15 3 9.8 3 6.5 A5 5 0 0 1 13 6.5 C13 9.8 8 15 8 15 Z" />
              <circle cx="8" cy="6.5" r="1.8" />
            </svg>
            {place}
          </Glass>
          {actions}
        </div>

        <div className={styles.weekday}>{weekday}</div>
        <div className={styles.day}>{day}</div>
        <div className={styles.dateLine}>{dateLine}</div>

        <div className={styles.joy}>
          <div className={styles.joyKicker}>{joyKicker}</div>
          <p className={styles.joyText}>{joy}</p>
        </div>
      </Fog>

      <div className={styles.bubbles}>
        <Bubble
          mood="sky"
          label={sky.label}
          value={sky.value}
          unit={sky.unit}
          caption={sky.caption}
        />
        <Bubble mood="rose" label={soon.label} value={soon.value} caption={soon.caption} />
      </div>
    </section>
  );
}
