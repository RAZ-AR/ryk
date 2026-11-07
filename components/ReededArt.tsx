"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { registerHoloArt } from "@/lib/ui/holoMotion";
import styles from "./ReededArt.module.css";

/**
 * «Живая» фольга карточки (дизайн-система v2.0, ADR-014): три светлых
 * размытых пятна медленно плывут под рифлёным стеклом и смещаются при
 * наклоне телефона. Чистая декорация — кладётся первым ребёнком в карточку
 * с `position: relative`, контент карточки лежит поверх.
 *
 * Вне экрана анимация стоит на паузе (lib/ui/holoMotion.ts).
 *
 * `seed` разводит карточки по фазе анимации: без него все билеты в ленте
 * двигались бы синхронно, как один, и это читалось бы как механизм.
 */
export type ArtTone = "rose" | "sun" | "silver";

export function ReededArt({ tone, seed = "" }: { tone: ArtTone; seed?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return registerHoloArt(ref.current);
  }, []);

  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  // Отрицательная задержка — карточка стартует с середины цикла, а не с нуля.
  const style = { "--art-delay": `-${hash % 47}s` } as CSSProperties;

  return (
    <span
      ref={ref}
      className={[styles.art, styles[tone]].join(" ")}
      style={style}
      aria-hidden="true"
    >
      {/* Пятна сдвигаются наклоном целиком, стекло стоит — отсюда эффект голограммы. */}
      <span className={styles.field}>
        <span className={[styles.shape, styles.rect].join(" ")} />
        <span className={[styles.shape, styles.disc].join(" ")} />
        <span className={[styles.shape, styles.square].join(" ")} />
      </span>
      <span className={styles.glass} />
    </span>
  );
}
