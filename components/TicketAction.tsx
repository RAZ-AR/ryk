import styles from "./TicketAction.module.css";

/*
 * Половина отрывной полосы билета — реакция на впечатление (§6, §11.4).
 *
 * Живёт только внутри слота `actions` компонента Ticket: ширину и линию
 * отрыва между половинами задаёт полоса, здесь — только внутренний вид.
 *
 * Почему иконка с подписью, а не одна иконка. У иконок нет устоявшегося
 * значения, и без постоянно видимой подписи человек угадывает; всплывающей
 * подсказки на тач-устройстве нет вовсе. Поэтому подпись остаётся —
 * просто уходит на служебный кегль, а решение читается иконкой.
 */

export type TicketActionTone = "yes" | "no";

type TicketActionProps = {
  tone: TicketActionTone;
  /** Видимая подпись под знаком. Не прячем: знак без неё двусмыслен. */
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

/**
 * Знаки нарисованы, а не набраны текстом: «✓» и «✕» в шрифте живут на разных
 * базовых линиях и разного кегля — рядом они выглядят как опечатка.
 */
function Mark({ tone }: { tone: TicketActionTone }) {
  return (
    <svg
      className={styles.mark}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {tone === "yes" ? (
        <path d="M4 10.5 L8.5 15 L16 5.5" />
      ) : (
        <>
          <path d="M5.5 5.5 L14.5 14.5" />
          <path d="M14.5 5.5 L5.5 14.5" />
        </>
      )}
    </svg>
  );
}

export function TicketAction({ tone, label, onClick, disabled }: TicketActionProps) {
  return (
    <button
      type="button"
      className={[styles.action, styles[tone]].join(" ")}
      onClick={onClick}
      disabled={disabled}
    >
      <Mark tone={tone} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}
