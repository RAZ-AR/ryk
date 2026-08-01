import type { ReactNode } from "react";
import { SvcLabel } from "./SvcLabel";
import styles from "./Ticket.module.css";

/**
 * Отрывной билет — сигнатурный компонент (дизайн-система §6).
 * Применяется ТОЛЬКО к впечатлению: идея, кандидат, приглашение (§11.4).
 *
 * Тон корешка: pink — кандидат/история недели, neutral — идея, grey — приглашение.
 */
export type StubTone = "pink" | "neutral" | "grey";

/**
 * `default` — билет на весь экран (онбординг, история недели, свайпы).
 * `compact` — для ленты на главном: тот же билет, но ниже, чтобы в поток
 * помещалось несколько карточек подряд.
 */
export type TicketSize = "default" | "compact";

type TicketProps = {
  /** Слот под фото. Пока не заменено реальным — рендерится плейсхолдер. */
  photo?: ReactNode;
  /**
   * Подпись пустого слота. Без значения слот остаётся пустым — своего
   * текста у примитива нет: он не знает языка интерфейса, а зашитая
   * по-русски строка вылезала бы у английского и испанского пользователя.
   */
  photoPlaceholder?: string;
  /** Левая метка строки-меты: день недели или номер. */
  metaLeft: string;
  /** Правая метка: время или общее количество. */
  metaRight: string;
  /** Подпись под правой меткой (например, категория). */
  metaRightSub?: string;
  title: string;
  /** Курсивная реплика под заголовком (используется в приглашении). */
  note?: string;
  stubTone?: StubTone;
  stubLabel: string;
  size?: TicketSize;
  /**
   * Отрывная полоса действий под корешком — реакция на впечатление.
   * Сюда кладут `TicketAction`; ширину половин и линию отрыва между ними
   * задаёт полоса, не сами кнопки.
   *
   * Полоса — часть билета, а не строка под ним: пара кнопок в отдельном
   * блоке ниже читалась как начало следующей карточки, а не как действие
   * над этой (перфорация и общая тень делают принадлежность очевидной).
   */
  actions?: ReactNode;
  /**
   * Нажатие на сам билет — открыть впечатление. Без обработчика билет
   * остаётся некликабельным (история недели, воспоминание, приглашение).
   */
  onOpen?: () => void;
  /** Подпись зоны нажатия для скринридера. Обязательна вместе с `onOpen`. */
  openLabel?: string;
  children: ReactNode;
};

export function Ticket({
  photo,
  photoPlaceholder,
  metaLeft,
  metaRight,
  metaRightSub,
  title,
  note,
  stubTone = "pink",
  stubLabel,
  size = "default",
  actions,
  onOpen,
  openLabel,
  children,
}: TicketProps) {
  return (
    <article
      className={[styles.ticket, size === "compact" && styles.compact].filter(Boolean).join(" ")}
    >
      <div className={styles.face}>
        <div className={styles.top}>
          <div className={styles.photo}>
            <div className={styles.photoInner}>{photo ?? photoPlaceholder}</div>
          </div>

          <div className={styles.meta}>
            <span>{metaLeft}</span>
            <span className={styles.rule} aria-hidden="true" />
            <span className={styles.metaRight}>
              {metaRight}
              {metaRightSub ? <span className={styles.metaSub}>{metaRightSub}</span> : null}
            </span>
          </div>

          <h2 className={styles.title}>{title}</h2>
          {note ? <p className={styles.note}>«{note}»</p> : null}
        </div>

        <div className={[styles.stub, styles[stubTone]].join(" ")}>
          <span className={[styles.notch, styles.notchLeft].join(" ")} aria-hidden="true" />
          <span className={[styles.notch, styles.notchRight].join(" ")} aria-hidden="true" />

          <SvcLabel tone="ink">● {stubLabel}</SvcLabel>
          <div className={styles.stubBody}>
            <div className={styles.stubContent}>{children}</div>
            <div className={styles.barcode} aria-hidden="true" />
          </div>
        </div>

        {/*
         * Зона нажатия — накладкой поверх лица билета, а не обёрткой вокруг
         * него. Обёртка означала бы <button> с <h2> и <div> внутри (браузер
         * такое терпит, но это недопустимая вложенность), а с появлением
         * полосы действий давала бы ещё и кнопки внутри кнопки.
         */}
        {onOpen ? (
          <button type="button" className={styles.openOverlay} onClick={onOpen}>
            <span className={styles.srOnly}>{openLabel}</span>
          </button>
        ) : null}
      </div>

      {actions ? (
        <div className={styles.tear}>
          <span className={[styles.notch, styles.notchLeft].join(" ")} aria-hidden="true" />
          <span className={[styles.notch, styles.notchRight].join(" ")} aria-hidden="true" />
          {actions}
        </div>
      ) : null}
    </article>
  );
}
