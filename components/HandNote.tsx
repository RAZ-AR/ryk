import type { ReactNode } from "react";
import styles from "./HandNote.module.css";

/**
 * Рукописная ремарка (Caveat). Только для человеческой реплики —
 * никогда для функционального текста (§11.8).
 * Поворот -2deg и цвет заданы в стилях: на call-site не переопределяются.
 */
type HandNoteProps = {
  children: ReactNode;
  size?: "default" | "large";
  /** Для тёмных/серых поверхностей, где pink-deep теряется. */
  onDark?: boolean;
};

export function HandNote({ children, size = "default", onDark = false }: HandNoteProps) {
  return (
    <span
      className={[styles.hand, size === "large" && styles.large, onDark && styles.onInk]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
