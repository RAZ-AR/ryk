import type { ReactNode } from "react";
import { PrintArt } from "./PrintArt";
import styles from "./Ticket.module.css";

/**
 * Карточка впечатления — сигнатурный компонент (дизайн-система §6, ADR-017).
 * Применяется ТОЛЬКО к впечатлению: идея, кандидат, приглашение (§11.4).
 *
 * v3 «Одна краска»: от билета остались имя и порядок чтения, но не декор.
 * Сверху растровый оттиск без рамки, ниже — подпись моно «категория / тип»,
 * заголовок гротеском, реплика курсивом, строка «время · цена» и две пилюли.
 *
 * Тон — материал карточки:
 *   pink    — история недели и её кандидаты: негатив (заливка краской),
 *             самое важное на экране;
 *   neutral — идея: поднятая бумага;
 *   grey    — приглашение: бумага с контуром, тише идеи.
 */
export type StubTone = "pink" | "neutral" | "grey";

/**
 * `default` — карточка на весь экран (история недели, свайпы, онбординг).
 * `compact` — для ленты: картинка ниже, заголовок мельче.
 */
export type TicketSize = "default" | "compact";

type TicketProps = {
  /**
   * Своя картинка вместо оттиска (афиша). Без неё — оттиск по заголовку.
   * Афишу печатаем дуотоном той же краской, чтобы она не выпадала из листа.
   */
  photo?: ReactNode;
  /** Длительность. */
  metaLeft: string;
  /** Цена. */
  metaRight: string;
  /** Тип впечатления или категория — идёт в подпись рядом с stubLabel. */
  metaRightSub?: string;
  title: string;
  /** Реплика под заголовком (используется в приглашении). */
  note?: string;
  stubTone?: StubTone;
  /** Подпись над заголовком: категория, «История недели · кандидат», «Приглашение». */
  stubLabel: string;
  size?: TicketSize;
  /**
   * Действия под карточкой — реакция на впечатление. Сюда кладут
   * `TicketAction`; сетку из двух пилюль задаёт карточка.
   */
  actions?: ReactNode;
  /**
   * Нажатие на саму карточку — открыть впечатление. Без обработчика
   * карточка остаётся некликабельной (история недели, приглашение).
   */
  onOpen?: () => void;
  /** Подпись зоны нажатия для скринридера. Обязательна вместе с `onOpen`. */
  openLabel?: string;
  /**
   * Живая метка «когда»: «Сегодня · 19:00 · ясно, +14°». Пилюля-негатив над
   * подписью — единственное на карточке, что зависит от календаря.
   */
  badge?: string;
  /** Почему это тебе — одна строка под репликой. Нет причины — нет строки. */
  reason?: string;
  /** Подпись строки причины для скринридера («Почему тебе»). */
  reasonLabel?: string;
  /** «Интересно» нажато: краска растекается по оттиску (PrintArt). */
  stamped?: boolean;
  children?: ReactNode;
};

export function Ticket({
  photo,
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
  badge,
  reason,
  reasonLabel,
  stamped = false,
  children,
}: TicketProps) {
  const spec = [metaLeft, metaRight].filter(Boolean).join(" · ");
  return (
    <article
      className={[styles.ticket, styles[stubTone], size === "compact" && styles.compact]
        .filter(Boolean)
        .join(" ")}
      data-stamped={stamped ? "" : undefined}
    >
      <div className={styles.face}>
        <div className={styles.art}>
          {photo ? (
            <div className={styles.photo}>{photo}</div>
          ) : (
            <PrintArt seed={title} ratio={size === "compact" ? 0.62 : 0.72} />
          )}
        </div>

        {badge ? <p className={styles.badge}>{badge}</p> : null}

        <p className={styles.kicker}>
          {stubLabel}
          {metaRightSub ? (
            <>
              <span className={styles.slash} aria-hidden="true">
                /
              </span>
              <span className={styles.srOnly}>, </span>
              {metaRightSub}
            </>
          ) : null}
        </p>

        <h2 className={styles.title}>{title}</h2>
        {note ? <p className={styles.voice}>«{note}»</p> : null}
        {children ? <div className={styles.voice}>{children}</div> : null}
        {reason ? (
          <p className={styles.reason}>
            <span className={styles.reasonMark} aria-hidden="true" />
            {reasonLabel ? <span className={styles.srOnly}>{reasonLabel}: </span> : null}
            {reason}
          </p>
        ) : null}
        {spec ? <p className={styles.spec}>{spec}</p> : null}

        {/*
         * Зона нажатия — накладкой поверх лица карточки, а не обёрткой:
         * обёртка означала бы <button> с <h2> внутри и кнопки внутри кнопки.
         */}
        {onOpen ? (
          <button type="button" className={styles.openOverlay} onClick={onOpen}>
            <span className={styles.srOnly}>{openLabel}</span>
          </button>
        ) : null}
      </div>

      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </article>
  );
}
