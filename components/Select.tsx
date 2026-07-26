import type { SelectHTMLAttributes } from "react";
import styles from "./Input.module.css";

/** Выпадающий список на тех же токенах, что и Input (дизайн-система §8). */
type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select className={[styles.select, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </select>
  );
}
