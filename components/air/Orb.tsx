import type { FogMood } from "./Fog";
import moods from "./moods.module.css";
import styles from "./Orb.module.css";

/*
 * Светящийся орб — «предмет из света» (референс: мягкие иридесцентные
 * объекты). Без filter: мягкость даёт маска на неподвижном родителе.
 * Вращается только веер внутри, пульсирует обёртка, ореол меняет opacity.
 * Один анимированный орб на экран; остальные — still.
 */
export function Orb({
  mood = "rose",
  size = 160,
  still,
  className,
}: {
  mood?: FogMood;
  size?: number;
  still?: boolean;
  className?: string;
}) {
  return (
    <span
      className={[styles.orb, moods[mood], still && styles.still, className]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className={styles.halo} />
      <span className={styles.pulse}>
        <span className={styles.mask}>
          <span className={styles.iris} />
          <span className={styles.core} />
        </span>
      </span>
    </span>
  );
}
