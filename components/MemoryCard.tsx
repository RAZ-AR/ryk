import { HandNote } from "./HandNote";
import { SvcLabel } from "./SvcLabel";
import styles from "./MemoryCard.module.css";

/**
 * Карточка воспоминания в архиве (§8).
 * Вариант `deferred` — «перенесено, без вины»: приглушён, но не наказывает.
 */
export type MemoryDot = "pink" | "rose" | "gold" | "empty";

type MemoryCardProps = {
  week: string;
  title: string;
  quote?: string;
  companion: string;
  dot?: MemoryDot;
  deferred?: boolean;
};

export function MemoryCard({
  week,
  title,
  quote,
  companion,
  dot = "pink",
  deferred = false,
}: MemoryCardProps) {
  return (
    <article className={[styles.card, deferred && styles.deferred].filter(Boolean).join(" ")}>
      <SvcLabel tone="faint">{week}</SvcLabel>
      <h3 className={styles.title}>{title}</h3>
      {quote ? (
        <div className={styles.quote}>
          <HandNote>«{quote}»</HandNote>
        </div>
      ) : null}
      <div className={styles.footer}>
        <span>{companion}</span>
        <span className={[styles.dot, styles[dot]].join(" ")} aria-hidden="true" />
      </div>
    </article>
  );
}
