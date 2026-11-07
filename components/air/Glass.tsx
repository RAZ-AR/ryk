import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Glass.module.css";

/*
 * Матовое стекло — второй материал «Воздуха». Лежит поверх тумана:
 * капсулы места, круглые кнопки, док. На голом фоне стекло не видно,
 * поэтому вне тумана берём strong-вариант.
 */

export function Glass({
  children,
  className,
  strong,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={[styles.glass, styles.capsule, strong && styles.strong, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

/** Круглая кнопка-стекло 52×52: назад, настройки, действия в доке. */
export function GlassButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[styles.glass, styles.round, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
