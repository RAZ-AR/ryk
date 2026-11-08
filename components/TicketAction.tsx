"use client";

import { haptic } from "@/lib/telegram/webApp";
import styles from "./TicketAction.module.css";

/*
 * Реакция на впечатление под карточкой (§6, §11.4): пилюля с подписью.
 * Живёт только в слоте `actions` компонента Ticket — сетку задаёт карточка.
 */

export type TicketActionTone = "yes" | "no";

type TicketActionProps = {
  tone: TicketActionTone;
  /** Видимая подпись: «Не интересно» / «Интересно». */
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export function TicketAction({ tone, label, onClick, disabled }: TicketActionProps) {
  return (
    <button
      type="button"
      className={[styles.action, styles[tone]].join(" ")}
      onClick={() => {
        // Короткий отклик пальцу: «интересно» чуть плотнее, чем «мимо».
        haptic(tone === "yes" ? "medium" : "light");
        onClick();
      }}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
