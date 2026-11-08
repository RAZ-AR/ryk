"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { pickAura, type AuraMood, type AuraPalette, type AuraShape } from "@/lib/ui/aura";
import { registerHoloArt } from "@/lib/ui/holoMotion";
import styles from "./AuraArt.module.css";

/**
 * Аура — картинка карточки (ADR-016, референс «aura posters»): мягкая
 * размытая фигура на пастельном поле. Цветок, сердце, ореол, кольца, лучи,
 * волна или просто свечение — по seed, так что у каждой карточки своя
 * картинка, и она не меняется между рендерами.
 *
 * Как и прежняя фольга, кладётся первым ребёнком в блок с
 * `position: relative`; контент лежит поверх.
 *
 * Производительность: размытие — SVG-фильтр, он считается один раз. Плывёт
 * и откликается на наклон весь слой целиком (transform на HTML-элементе),
 * поэтому фильтр не пересчитывается по кадрам. Вне экрана — пауза
 * (lib/ui/holoMotion.ts).
 */

/** Координаты округляем: Math.cos в Node и в браузере может разойтись в последнем знаке. */
const r = (v: number) => Math.round(v * 100) / 100;

const C = 100;

function petals(count: number, dist: number, rad: number, fill: string): ReactNode[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * 2 * Math.PI - Math.PI / 2;
    return (
      <circle
        key={`${fill}-${i}`}
        cx={r(C + Math.cos(a) * dist)}
        cy={r(C + Math.sin(a) * dist)}
        r={rad}
        style={{ fill }}
      />
    );
  });
}

const HEART =
  "M100 168 C52 132 24 104 24 72 C24 46 44 30 66 30 C82 30 94 40 100 54 C106 40 118 30 134 30 C156 30 176 46 176 72 C176 104 148 132 100 168 Z";

/** Каждая фигура — несколько залитых форм; размытие делает из них свет. */
function shapeOf(shape: AuraShape, a: string, b: string, c: string): ReactNode {
  switch (shape) {
    case "flower":
      return (
        <>
          {petals(5, 40, 38, a)}
          {petals(5, 28, 22, b)}
          <circle cx={C} cy={C} r={24} style={{ fill: c }} />
        </>
      );
    case "heart":
      return (
        <>
          <path d={HEART} style={{ fill: a }} />
          <path
            d={HEART}
            transform="translate(100 100) scale(0.62) translate(-100 -96)"
            style={{ fill: c }}
          />
        </>
      );
    case "halo":
      return (
        <>
          <circle cx={C} cy={C} r={84} style={{ fill: b }} />
          <circle cx={C} cy={C} r={62} style={{ fill: a }} />
          <circle cx={C} cy={C} r={34} style={{ fill: c }} />
        </>
      );
    case "rings":
      return (
        <>
          <circle cx={C} cy={70} r={42} fill="none" strokeWidth={22} style={{ stroke: a }} />
          <circle cx={C} cy={130} r={42} fill="none" strokeWidth={22} style={{ stroke: b }} />
          <circle cx={C} cy={C} r={8} style={{ fill: c }} />
        </>
      );
    case "rays":
      return (
        <>
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse
              key={i}
              cx={C}
              cy={52}
              rx={15}
              ry={52}
              transform={`rotate(${i * 45} ${C} ${C})`}
              style={{ fill: i % 2 ? b : a }}
            />
          ))}
          <circle cx={C} cy={C} r={26} style={{ fill: c }} />
        </>
      );
    case "wave":
      return (
        <>
          <path
            d="M-20 150 C40 150 60 40 120 40 C170 40 190 90 230 80"
            fill="none"
            strokeWidth={54}
            style={{ stroke: a }}
          />
          <path
            d="M-20 186 C40 186 70 96 130 96 C176 96 196 130 230 124"
            fill="none"
            strokeWidth={30}
            style={{ stroke: b }}
          />
        </>
      );
    case "glow":
      return (
        <>
          <circle cx={C} cy={C} r={74} style={{ fill: a }} />
          <circle cx={C} cy={C} r={46} style={{ fill: b }} />
          <circle cx={C} cy={C} r={22} style={{ fill: c }} />
        </>
      );
  }
}

export type AuraArtProps = {
  /** Стабильный ключ: заголовок, id, дата. Один seed — одна картинка. */
  seed: string;
  /** Настроение — из какого пула брать палитру. */
  mood?: AuraMood;
  /** Явная палитра (лист дня берёт её по погоде). */
  palette?: AuraPalette;
  /** Явная фигура. */
  shape?: AuraShape;
  /** Насколько сильно размыть: карточкам мягче, листу дня — чётче. */
  blur?: number;
};

export function AuraArt({ seed, mood = "rose", palette, shape, blur = 11 }: AuraArtProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const filterId = `aura${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    if (!ref.current) return;
    return registerHoloArt(ref.current);
  }, []);

  const pick = pickAura(seed, mood);
  const pal = palette ?? pick.palette;
  const fig = shape ?? pick.shape;
  const v = (role: string) => `var(--aura-${pal}-${role})`;

  // Фаза дыхания — от seed: карточки в ленте не пульсируют хором.
  const style = { "--aura-delay": `-${pick.turn / 10}s`, background: v("bg") } as CSSProperties;

  return (
    <span ref={ref} className={styles.aura} style={style} aria-hidden="true">
      <span className={styles.field}>
        <svg
          className={styles.svg}
          viewBox="0 0 200 200" // Фигура целиком в высоту блока, по центру — как на постере. Поле вокруг
          // того же цвета, что фон палитры, поэтому краёв не видно.
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={blur} />
            </filter>
          </defs>
          <g filter={`url(#${filterId})`}>
            {/* Поворот фигуры — внутри картинки, а не всей картинки: повёрнутый
                прямоугольник на широкой карточке открывал края. Сердце не
                вертим — вверх ногами оно перестаёт быть сердцем. */}
            <g transform={fig === "heart" ? undefined : `rotate(${pick.turn} 100 100)`}>
              {shapeOf(fig, v("a"), v("b"), v("c"))}
            </g>
          </g>
        </svg>
      </span>
    </span>
  );
}
