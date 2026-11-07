import { Fog, type FogMood } from "./Fog";
import styles from "./Bubble.module.css";

/*
 * Пузырь — круглая карточка одного факта: небо, «скоро», неделя.
 * Одна цифра крупно, подпись мелко. Не метрика: здесь нет шкал, сравнений
 * и прогресса — только то, что полезно знать сегодня.
 */
export function Bubble({
  mood,
  label,
  value,
  unit,
  caption,
}: {
  mood: FogMood;
  label: string;
  value: string;
  unit?: string;
  caption?: string;
}) {
  return (
    <Fog mood={mood} still className={styles.bubble}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>
        {value}
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {caption && <div className={styles.caption}>{caption}</div>}
    </Fog>
  );
}
