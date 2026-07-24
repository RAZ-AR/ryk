import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

/**
 * Кнопка. Прямые углы (радиус 0) — характер принта, дизайн-система §5.
 * На экране только один `primary` (§11.1).
 */
export type ButtonVariant = "primary" | "secondary" | "grey" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, variant = "primary", className, ...rest }: ButtonProps) {
  return (
    <button
      className={[styles.btn, styles[variant], className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
