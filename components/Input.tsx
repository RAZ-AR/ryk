import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

/** Текстовое поле поверх токенов (дизайн-система §8). Прямые углы, бумага. */
type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return <input className={[styles.input, className].filter(Boolean).join(" ")} {...rest} />;
}
