import type { ReactNode } from "react";
import styles from "./SvcLabel.module.css";

/**
 * Служебная метка: IBM Plex Mono, 10px, uppercase, tracking .16em.
 * Дизайн-система §4 (регистр `svc`).
 *
 * Розовый тон намеренно берёт `--ryk-pink-text`, а не `--ryk-pink`:
 * мелкий текст акцентным розовым на бумаге не проходит контраст (§9).
 */
export type SvcTone = "pink" | "deep" | "ink" | "muted" | "faint";

type SvcLabelProps = {
  children: ReactNode;
  tone?: SvcTone;
  className?: string;
};

export function SvcLabel({ children, tone = "muted", className }: SvcLabelProps) {
  return (
    <span className={[styles.svc, styles[tone], className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
