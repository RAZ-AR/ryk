import Image from "next/image";
import styles from "./Dock.module.css";

/**
 * Глобальная навигация (§7): Неделя · Память · ◉ · Желания · Год.
 * В центре — круглая кнопка с логотипом, ведёт в ленту впечатлений.
 * Скрыта на онбординге — за это отвечает вызывающий экран.
 *
 * Все подписи приходят пропами и обязательны. Дефолтов нет намеренно:
 * примитив не знает языка интерфейса, а зашитые по-русски метки молча
 * пролезали бы в английскую и испанскую версию — и заметить это, правя
 * только AppShell, было бы нечем.
 */
export type DockSection = "week" | "memory" | "wishes" | "year";

/** Лента — отдельная цель: у неё круглая кнопка, а не пилюля. */
export type DockTarget = DockSection | "discover";

export type DockLabels = Record<DockSection, string>;

/** По две пилюли слева и справа от центральной кнопки. */
const LEFT: readonly DockSection[] = ["week", "memory"];
const RIGHT: readonly DockSection[] = ["wishes", "year"];

type DockProps = {
  active: DockTarget;
  onNavigate?: (section: DockTarget) => void;
  labels: DockLabels;
  /** Имя навигации для скринридера. */
  ariaLabel: string;
  /** Подпись центральной кнопки: на ней только знак, без текста. */
  discoverLabel: string;
};

export function Dock({ active, onNavigate, labels, ariaLabel, discoverLabel }: DockProps) {
  const pill = (id: DockSection) => {
    const isActive = id === active;
    return (
      <button
        key={id}
        type="button"
        aria-current={isActive ? "page" : undefined}
        className={[styles.item, isActive && styles.active].filter(Boolean).join(" ")}
        onClick={() => onNavigate?.(id)}
      >
        {labels[id]}
      </button>
    );
  };

  return (
    <nav className={styles.dock} aria-label={ariaLabel}>
      {LEFT.map(pill)}

      {/* Розовым в доке светится всегда ровно одно (§11.1): либо активная
          пилюля, либо эта кнопка — когда открыта лента. */}
      <button
        type="button"
        aria-current={active === "discover" ? "page" : undefined}
        aria-label={discoverLabel}
        className={[styles.center, active === "discover" && styles.centerActive]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onNavigate?.("discover")}
      >
        {/* Знак меняет цвет вместе с заливкой: розовый на розовом был бы
            неразличим — то же правило контраста §9, что и на онбординге. */}
        <Image
          src={active === "discover" ? "/ryk-logo-paper.svg" : "/ryk-logo-pink.svg"}
          alt=""
          width={406}
          height={271}
          unoptimized
          className={styles.centerMark}
        />
      </button>

      {RIGHT.map(pill)}
    </nav>
  );
}
