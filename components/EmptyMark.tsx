import { PrintArt } from "./PrintArt";
import styles from "./EmptyMark.module.css";

/*
 * Знак пустого состояния — бледный оттиск-свечение (v3, ADR-017).
 *
 * Один знак на все пустые экраны: пусто в ленте, в желаниях и в памяти —
 * это всегда одно и то же «истории пока нет», и разные рисунки сообщали бы
 * разницу, которой нет. Бледный растр читается как место, где картинка
 * появится, а не как ошибка; знак сопровождает фразу, а не спорит с ней.
 */
export function EmptyMark() {
  return (
    <div className={styles.mark}>
      <PrintArt seed="empty" shape="glow" ratio={1} cols={32} faint />
    </div>
  );
}
