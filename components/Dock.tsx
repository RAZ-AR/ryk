import styles from "./Dock.module.css";

/**
 * Глобальная навигация (§7): Сейчас · Хочу · Было.
 *
 * Док перечисляет не экраны, а времена. Пять целей были списком мест, из
 * которых две вели в уже виденное: центральная кнопка — в дубль ленты с
 * главной, «Год» — в агрегат тех же историй, что лежат в «Памяти». У
 * продукта ядро — одно решение в неделю, а не пять равноправных миров.
 *
 * Колода и недельный цикл открываются оверлеями с тех экранов, которым
 * принадлежат, — вершиной навигации им быть незачем.
 *
 * Все подписи приходят пропами и обязательны. Дефолтов нет намеренно:
 * примитив не знает языка интерфейса, а зашитые по-русски метки молча
 * пролезали бы в английскую и испанскую версию — и заметить это, правя
 * только AppShell, было бы нечем.
 */
export type DockSection = "now" | "wish" | "past";

export type DockLabels = Record<DockSection, string>;

/** Порядок — по времени: настоящее, будущее, прошлое. */
const SECTIONS: readonly DockSection[] = ["now", "wish", "past"];

type DockProps = {
  active: DockSection;
  onNavigate?: (section: DockSection) => void;
  labels: DockLabels;
  /** Имя навигации для скринридера. */
  ariaLabel: string;
};

export function Dock({ active, onNavigate, labels, ariaLabel }: DockProps) {
  return (
    <nav className={styles.dock} aria-label={ariaLabel}>
      {SECTIONS.map((id) => {
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
