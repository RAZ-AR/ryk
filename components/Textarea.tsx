import type { TextareaHTMLAttributes } from "react";
import styles from "./Input.module.css";

/** Многострочное поле на тех же токенах, что и Input (дизайн-система §8). */
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea className={[styles.textarea, className].filter(Boolean).join(" ")} {...rest} />;
}
