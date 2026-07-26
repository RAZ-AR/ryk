import Image from "next/image";
import styles from "./Dock.module.css";

/**
 * Глобальная навигация (§7): Неделя · Память · ◉ · Желания · Баланс.
 * В центре — круглая кнопка с логотипом, ведёт в ленту впечатлений.
 * Скрыта на онбординге — за это отвечает вызывающий экран.
 *
 * Метки можно передать через `labels` (i18n). Без пропа — русский дефолт,
 * чтобы витрина /design и превью работали без провайдера переводов.
 */
export type DockSection = "week" | "memory" | "wishes" | "balance";

/** Лента — отдельная цель: у неё круглая кнопка, а не пилюля. */
export type DockTarget = DockSection | "discover";

export type DockLabels = Record<DockSection, string>;

const DEFAULT_LABELS: DockLabels = {
  week: "Неделя",
  memory: "Память",
  wishes: "Желания",
  balance: "Баланс",
};

/** По две пилюли слева и справа от центральной кнопки. */
const LEFT: readonly DockSection[] = ["week", "memory"];
const RIGHT: readonly DockSection[] = ["wishes", "balance"];

type DockProps = {
  active: DockTarget;
  onNavigate?: (section: DockTarget) => void;
  labels?: DockLabels;
  ariaLabel?: string;
  discoverLabel?: string;
};

export function Dock({
  active,
  onNavigate,
  labels = DEFAULT_LABELS,
  ariaLabel,
  discoverLabel = "Лента",
}: DockProps) {
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
    <nav className={styles.dock} aria-label={ariaLabel ?? "Основная навигация"}>
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
