"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { registerHoloArt } from "@/lib/ui/holoMotion";
import styles from "./OnboardingBackdrop.module.css";

/**
 * Живой фон онбординга: те же пятна фольги, что под стеклом обложки, только
 * во весь экран и без рифлёного стекла — его кромка легла бы полосой поперёк
 * текста.
 *
 * Фон отвечает на две вещи. Наклон телефона сдвигает пятна против наклона,
 * как свет в голограмме (lib/ui/holoMotion.ts). А каждый шаг переставляет
 * их на новое место: бланк заполняется — и лист под ним перетекает.
 * Движение — только transform, поэтому WebView не перерисовывает слой.
 */
export function OnboardingBackdrop({ step }: { step: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return registerHoloArt(ref.current);
  }, []);

  // Позиции по кругу: шаг сдвигает пятна на седьмую часть оборота.
  const angle = (step * 2 * Math.PI) / 7;
  const style = {
    "--step-x": `${Math.round(Math.cos(angle) * 14)}vw`,
    "--step-y": `${Math.round(Math.sin(angle) * 10)}vh`,
  } as CSSProperties;

  return (
    <div ref={ref} className={styles.backdrop} style={style} aria-hidden="true">
      <div className={styles.field}>
        <span className={[styles.blob, styles.rose].join(" ")} />
        <span className={[styles.blob, styles.blue].join(" ")} />
        <span className={[styles.blob, styles.sun].join(" ")} />
      </div>
    </div>
  );
}
