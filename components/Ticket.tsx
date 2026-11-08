import type { ReactNode } from "react";
import { AuraArt } from "./AuraArt";
import type { AuraMood } from "@/lib/ui/aura";
import { SvcLabel } from "./SvcLabel";
import styles from "./Ticket.module.css";

/**
 * Отрывной билет — сигнатурный компонент (дизайн-система §6).
 * Применяется ТОЛЬКО к впечатлению: идея, кандидат, приглашение (§11.4).
 *
 * Тон билета — цвет фольги на верхней части: pink — кандидат/история недели
 * (розовая), neutral — идея (солнечная), grey — приглашение (серебряная).
 * Корешок всегда бумажный.
 */
export type StubTone = "pink" | "neutral" | "grey";

const ART_TONE: Record<StubTone, AuraMood> = { pink: "rose", neutral: "sun", grey: "silver" };

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
  /**
   * Знак перед подписью корешка — обычно `CategoryIcon`. Без него остаётся
   * точка: подпись бывает и не категорией («История недели · кандидат»,
   * «Приглашение · кому»), и рисовать там знак категории было бы враньём.
   *
   * Тип — узел, а не `LifeCategory`: примитив не должен знать доменного
   * перечисления, ровно как не знает его слот фото.
   */
  stubIcon?: ReactNode;
  /**
   * Эмблема над заголовком — знак категории, как глобус над строкой серии
   * на референсе. Если задана, она заменяет окно с узором/фото, а знак
   * у строки серии убирается: два одинаковых знака подряд были бы шумом.
   */
  emblem?: ReactNode;
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
  stubIcon,
  emblem,
  size = "default",
  actions,
  onOpen,
  openLabel,
  children,
}: TicketProps) {
  return (
    <article
      className={[styles.ticket, styles[stubTone], size === "compact" && styles.compact]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.face}>
        {/*
         * Анатомия как у референса (билет Tokyo 2020):
         *   фольга — эмблема, строка серии, крупный заголовок с орбитой,
         *            «+ подпись +» и черта;
         *   корешок — текст слева, крупные цифры справа с пунктирными
         *            разделителями, внизу шахматная лента и штрихкод.
         */}
        <div className={[styles.top, styles.cutBottom].join(" ")}>
          <AuraArt mood={ART_TONE[stubTone]} seed={title} />
          {emblem ? (
            <div className={[styles.emblem, styles.emblemSign].join(" ")}>{emblem}</div>
          ) : (
            <div className={styles.emblem}>{photo ?? photoPlaceholder}</div>
          )}

          <SvcLabel tone="ink" className={styles.kicker}>
            {emblem ? null : (stubIcon ?? <span aria-hidden="true">●</span>)} {stubLabel}
          </SvcLabel>

          <div className={styles.titleWrap}>
            <h2 className={styles.title}>{title}</h2>
          </div>

          {metaRightSub ? (
            <p className={styles.sub}>
              <span aria-hidden="true">+</span> {metaRightSub} <span aria-hidden="true">+</span>
            </p>
          ) : null}
          {note ? <p className={styles.note}>«{note}»</p> : null}
          <span className={styles.bar} aria-hidden="true" />
        </div>

        <div
          className={[
            styles.stub,
            /* Корешок вырезан сверху всегда, снизу — только если под ним
               пришита полоса действий со своей перфорацией. */
            actions ? styles.cutBoth : styles.cutTop,
          ].join(" ")}
        >
          <div className={styles.stubBody}>
            <div className={styles.stubContent}>{children}</div>
            <div className={styles.nums}>
              <span className={styles.num}>{metaLeft}</span>
              <span className={styles.num}>{metaRight}</span>
            </div>
          </div>
          <div className={styles.stubFoot} aria-hidden="true">
            <span className={styles.checker} />
            <span className={styles.barcode} />
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

      {actions ? <div className={[styles.tear, styles.cutTop].join(" ")}>{actions}</div> : null}
    </article>
  );
}
