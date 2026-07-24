import styles from "./Dock.module.css";

/**
 * Глобальная навигация (§7): Неделя · Память · Желания · Баланс.
 * Скрыта на онбординге — за это отвечает вызывающий экран.
 *
 * Метки можно передать через `labels` (i18n). Без пропа — русский дефолт,
 * чтобы витрина /design и превью работали без провайдера переводов.
 */
export type DockSection = "week" | "memory" | "wishes" | "balance";

export type DockLabels = Record<DockSection, string>;

const DEFAULT_LABELS: DockLabels = {
  week: "Неделя",
  memory: "Память",
  wishes: "Желания",
  balance: "Баланс",
};

const ORDER: readonly DockSection[] = ["week", "memory", "wishes", "balance"];

type DockProps = {
  active: DockSection;
  onNavigate?: (section: DockSection) => void;
  labels?: DockLabels;
  ariaLabel?: string;
};

export function Dock({ active, onNavigate, labels = DEFAULT_LABELS, ariaLabel }: DockProps) {
  return (
    <nav className={styles.dock} aria-label={ariaLabel ?? "Основная навигация"}>
      {ORDER.map((id) => {
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
      })}
    </nav>
  );
}
