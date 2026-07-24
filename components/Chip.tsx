import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Chip.module.css";

/**
 * Чип выбора: рамка ink, радиус 0. Активный — заливка (§8).
 * `tone` управляет цветом активного состояния: серый (нейтральный выбор)
 * или розовый (смысловой выбор — эмоция, соц-формат).
 */
type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  selected?: boolean;
  tone?: "grey" | "pink";
};

export function Chip({ children, selected = false, tone = "grey", className, ...rest }: ChipProps) {
  const activeClass = tone === "pink" ? styles.pinkOn : styles.greyOn;
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[styles.chip, selected && styles.selected, selected && activeClass, className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
