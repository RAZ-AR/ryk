import type { ReactNode } from "react";
import styles from "./HandNote.module.css";

/**
 * Человеческая реплика курсивной антиквой (v3; раньше — Caveat). Только для реплики —
 * никогда для функционального текста (§11.8).
 * Кегль и цвет заданы в стилях: на call-site не переопределяются.
 */
type HandNoteProps = {
  children: ReactNode;
  size?: "default" | "large";
  /** Историческое: на негативе цвет и так приходит из материала. */
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
