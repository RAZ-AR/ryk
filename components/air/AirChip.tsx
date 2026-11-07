import type { ButtonHTMLAttributes } from "react";
import styles from "./AirChip.module.css";

/** Чип-пилюля: стекло, выбранный — тёмный. Выбор виден и без цвета (галочка). */
export function AirChip({
  selected,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[styles.chip, selected && styles.on, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {selected && (
        <svg viewBox="0 0 16 16" className={styles.tick} aria-hidden="true">
          <path d="M3 8.5 L6.5 12 L13 4.5" />
        </svg>
      )}
      {children}
    </button>
  );
}
