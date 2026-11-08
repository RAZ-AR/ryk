"use client";

import { useEffect, useRef, useState } from "react";
import { printPath, type PrintShape } from "@/lib/ui/print";
import styles from "./PrintArt.module.css";

/**
 * Растровый оттиск (ADR-017) — картинка карточки, листа дня, недели и обложки.
 * Печатается текущей краской (`currentColor`): на бумаге — синим, на
 * негативе — цветом бумаги. Рамки нет: края растворяются в фоне.
 *
 * Производительность. Растр одной картинки — 30–45 КБ пути; на ленту из
 * тридцати карточек это мегабайт HTML, если считать на сервере. Поэтому
 * сервер отдаёт пустой SVG нужных пропорций (место зарезервировано, вёрстка
 * не прыгает), а точки считаются в браузере, когда картинка подъезжает
 * к экрану, — и один раз: дальше путь живёт в состоянии.
 */

type Props = {
  /** Стабильный ключ: заголовок, id, дата. Один seed — одна картинка. */
  seed: string;
  /** Явная фигура. Без неё — по seed. */
  shape?: PrintShape;
  /** Высота / ширина. */
  ratio?: number;
  /** Точек по ширине. */
  cols?: number;
  /** Бледный оттиск — для пустых состояний. */
  faint?: boolean;
  className?: string;
};

/* Один наблюдатель на все оттиски экрана, с запасом в экран сверху и снизу. */
const waiting = new Map<Element, () => void>();
let observer: IntersectionObserver | null = null;

function whenNear(el: Element, cb: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    cb();
    return () => {};
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        waiting.get(entry.target)?.();
        waiting.delete(entry.target);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "100% 0px" },
  );
  waiting.set(el, cb);
  observer.observe(el);
  return () => {
    waiting.delete(el);
    observer?.unobserve(el);
  };
}

export function PrintArt({
  seed,
  shape,
  ratio = 0.75,
  cols = 48,
  faint = false,
  className,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const key = `${seed}|${shape ?? ""}|${ratio}|${cols}|${faint}`;
  const [drawn, setDrawn] = useState<{ key: string; d: string } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    return whenNear(ref.current, () =>
      setDrawn({ key, d: printPath(seed, { shape, ratio, cols, gain: faint ? 0.38 : 1 }).d }),
    );
  }, [key, seed, shape, ratio, cols, faint]);

  const width = cols * 10;
  const height = Math.round(width * ratio);
  const d = drawn?.key === key ? drawn.d : "";

  return (
    <svg
      ref={ref}
      className={[styles.print, className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      {d ? <path d={d} /> : null}
    </svg>
  );
}
