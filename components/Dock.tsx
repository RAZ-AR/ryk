import styles from "./Dock.module.css";

/**
 * Глобальная навигация (§7): Неделя · Память · Желания · Баланс.
 * Скрыта на онбординге — за это отвечает вызывающий экран.
 */
export type DockSection = "week" | "memory" | "wishes" | "balance";

const SECTIONS: ReadonlyArray<{ id: DockSection; label: string }> = [
  { id: "week", label: "Неделя" },
  { id: "memory", label: "Память" },
  { id: "wishes", label: "Желания" },
  { id: "balance", label: "Баланс" },
];

type DockProps = {
  active: DockSection;
  onNavigate?: (section: DockSection) => void;
};

export function Dock({ active, onNavigate }: DockProps) {
  return (
    <nav className={styles.dock} aria-label="Основная навигация">
      {SECTIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <button
            key={section.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            className={[styles.item, isActive && styles.active].filter(Boolean).join(" ")}
            onClick={() => onNavigate?.(section.id)}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
