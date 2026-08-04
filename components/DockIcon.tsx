import type { DockSection } from "./Dock";
import styles from "./DockIcon.module.css";

/*
 * Знаки трёх пунктов дока.
 *
 * Язык тот же, что у знаков категорий: сетка 16×16, штрих 1.5, только
 * окружности и прямые. Разница в роли — здесь знак несёт пункт навигации
 * в одиночку, пока пункт неактивен, поэтому силуэты разведены сильнее:
 * круг, звезда и прямоугольники не спутать боковым зрением.
 *
 * Смысл знаков берётся из продукта, а не из общей иконографики:
 *  - «Сейчас» — билет, пробитый компостером: ты здесь, эта неделя идёт;
 *  - «Хочу» — звезда, которой в продукте помечают сохранённое желание;
 *  - «Было» — кадры плёнки: архив в Ryk проявленная плёнка, не папка.
 */

/** Вариант знака «Было» — выбирается один, остальные удаляются. */
export type PastVariant = "stack" | "frame" | "ticket";

const NOW = (
  <>
    <circle cx="8" cy="8" r="6" />
    <circle className={styles.solid} cx="8" cy="8" r="2" />
  </>
);

const WISH = <path d="M8 1 L9.7 6.3 L15 8 L9.7 9.7 L8 15 L6.3 9.7 L1 8 L6.3 6.3 Z" />;

const PAST: Record<PastVariant, React.ReactNode> = {
  // Стопка кадров: задний сдвинут вверх-вправо.
  stack: (
    <>
      <rect x="5.5" y="1.5" width="9" height="9" />
      <rect x="1.5" y="5.5" width="9" height="9" className={styles.cutout} />
    </>
  ),

  // Один кадр плёнки с перфорацией по бокам.
  frame: (
    <>
      <rect x="4" y="2" width="8" height="12" />
      <rect className={styles.solid} x="1" y="4" width="1.5" height="1.5" />
      <rect className={styles.solid} x="1" y="10.5" width="1.5" height="1.5" />
      <rect className={styles.solid} x="13.5" y="4" width="1.5" height="1.5" />
      <rect className={styles.solid} x="13.5" y="10.5" width="1.5" height="1.5" />
    </>
  ),

  /*
   * Силуэт самого билета — с вырезами перфорации по бокам. «Было» — это
   * твои корешки: сигнатурная форма продукта прямо в навигации, и та же
   * вырубка, что у настоящей карточки.
   */
  ticket: <path d="M3 1.5 H13 V5.5 A1.5 1.5 0 0 0 13 8.5 V14.5 H3 V8.5 A1.5 1.5 0 0 0 3 5.5 Z" />,
};

type Props = {
  section: DockSection;
  /** Только для витрины: сравнить варианты знака «Было». */
  pastVariant?: PastVariant;
};

export function DockIcon({ section, pastVariant = "stack" }: Props) {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {section === "now" ? NOW : section === "wish" ? WISH : PAST[pastVariant]}
    </svg>
  );
}
