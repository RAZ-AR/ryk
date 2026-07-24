import type { ReactNode } from "react";
import { SvcLabel } from "./SvcLabel";
import styles from "./RykNote.module.css";

/**
 * Реплика компаньона / превью обещания.
 * Одно действие на сообщение — правило из ryk_docs/07-ai-companion.md.
 */
type RykNoteProps = {
  label?: string;
  children: ReactNode;
  /** Курсивная подача (PT Serif) — для цитат и превью обещания. */
  quote?: boolean;
};

export function RykNote({ label = "Ryk", children, quote = false }: RykNoteProps) {
  return (
    <div className={styles.note}>
      <SvcLabel tone="muted">{label}</SvcLabel>
      <div className={quote ? styles.quote : styles.body}>{children}</div>
    </div>
  );
}
