import type { ButtonHTMLAttributes } from "react";
import styles from "./AirButton.module.css";

/*
 * Кнопка-пилюля. Три голоса:
 *  - ink   — главное действие экрана, одно на экран;
 *  - pink  — действие бренда (выбрать историю, «сделано»);
 *  - glass — второстепенное, лежит на тумане.
 */
export type AirButtonVariant = "ink" | "pink" | "glass";

export function AirButton({
  variant = "ink",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: AirButtonVariant }) {
  return (
    <button
      type="button"
      className={[styles.btn, styles[variant], className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
