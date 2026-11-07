import type { CSSProperties, ReactNode } from "react";
import type { LifeCategory } from "@/generated/prisma/enums";
import styles from "./Fog.module.css";
import moods from "./moods.module.css";

/*
 * Плита-облако — главный материал «Воздуха» (ADR-013).
 *
 * Цвет светится изнутри и уходит в белое молоко к краям. Слои снизу
 * вверх: иридесцентный веер → три световых пятна (радиальные градиенты
 * с гауссовым спадом, без filter) → молочная вуаль с каймой и внутренними
 * тенями (::after). Снаружи — цветное свечение на поверхность и видимый
 * нижний край стекла. Двигается только transform пятен.
 */

export type FogMood = "dawn" | "sky" | "rose" | "mint" | "dusk" | "holo" | "ocean";

/** На каких туманах текст светлый. Остальные — тёмный текст. */
export const DEEP_MOODS: ReadonlyArray<FogMood> = ["ocean"];

/** Настроение категории — один язык для билета, пузыря и экрана. */
export const MOOD_BY_CATEGORY: Record<LifeCategory, FogMood> = {
  NATURE: "mint",
  CULTURE: "dusk",
  DISCOVERY: "sky",
  MOVEMENT: "dawn",
  CONNECTION: "rose",
  JOY: "holo",
  CHALLENGE: "ocean",
  REST: "dawn",
  CONTRIBUTION: "mint",
};

/** Настроение по времени суток — для «Листа дня». */
export function moodForHour(hour: number): FogMood {
  if (hour < 6) return "dusk";
  if (hour < 11) return "dawn";
  if (hour < 17) return "sky";
  if (hour < 21) return "rose";
  return "dusk";
}

type Props = {
  mood: FogMood;
  children?: ReactNode;
  className?: string;
  /** Зерно поверх — для билета, как у печати на голографической плёнке. */
  grain?: boolean;
  /** Без дрейфа: для мелких предметов, где движение отвлекает. */
  still?: boolean;
  style?: CSSProperties;
};

export function Fog({ mood, children, className, grain, still, style }: Props) {
  const deep = DEEP_MOODS.includes(mood);
  return (
    <div
      className={[styles.fog, moods[mood], deep && styles.deep, still && styles.still, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <div className={styles.iris} aria-hidden="true" />
      <div className={styles.blobs} aria-hidden="true">
        <span className={styles.b1} />
        <span className={styles.b2} />
        <span className={styles.b3} />
      </div>
      {grain && <div className={styles.grain} aria-hidden="true" />}
      {children}
    </div>
  );
}
