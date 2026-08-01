"use client";

import { useRef, useState, type ReactNode } from "react";
import styles from "./SwipeCard.module.css";

/*
 * Жест «интересно / не интересно» на одной карточке.
 *
 * Pointer events, без библиотеки: карточка одна, а любой пакет для свайпов
 * тянет за собой и анимационный рантайм. Порог — 90px, ниже карточка
 * возвращается на место.
 */

const THRESHOLD = 90;
/** Насколько далеко улетает карточка, чтобы точно уйти за край экрана. */
const FLY_DISTANCE = 600;

export type SwipeDirection = "left" | "right";

export function SwipeCard({
  children,
  onDecide,
  labelYes,
  labelNo,
  disabled = false,
}: {
  children: ReactNode;
  onDecide: (direction: SwipeDirection) => void;
  labelYes: string;
  labelNo: string;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null);
  // Состояние, а не ref: от него зависит рендер (метка «интересно/мимо»),
  // а ref во время рендера читать нельзя — React не отследит изменение.
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const finish = (direction: SwipeDirection) => {
    if (reducedMotion) {
      // Без анимации отлёта: сразу отдаём решение, экран просто меняет карточку.
      setDx(0);
      onDecide(direction);
      return;
    }
    setLeaving(direction);
    setDx(direction === "right" ? FLY_DISTANCE : -FLY_DISTANCE);
    window.setTimeout(() => {
      setLeaving(null);
      setDx(0);
      onDecide(direction);
    }, 200);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || leaving) return;
    /*
     * С полосы действий жест не начинаем. Полоса — часть билета и лежит
     * внутри карточки, поэтому нажатие на «интересно» иначе утаскивало бы
     * всю карту: палец на кнопке неизбежно чуть смещается, и вместо
     * нажатия человек получал бы дрожащую карточку.
     */
    if ((e.target as HTMLElement).closest("button")) return;
    startX.current = e.clientX;
    setDragging(true);
    setSettling(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    setDx(e.clientX - startX.current);
  };

  const onPointerUp = () => {
    if (startX.current === null) return;
    const moved = dx;
    startX.current = null;
    setDragging(false);

    if (Math.abs(moved) >= THRESHOLD) {
      finish(moved > 0 ? "right" : "left");
      return;
    }
    // Не дотянул — пружинит назад.
    setSettling(true);
    setDx(0);
  };

  // Наклон пропорционален протаскиванию — карточка «живая», но спокойная.
  const rotate = reducedMotion ? 0 : dx / 22;

  return (
    <div
      className={[styles.wrap, settling && styles.settling, leaving && styles.leaving]
        .filter(Boolean)
        .join(" ")}
      style={{ transform: `translateX(${dx}px) rotate(${rotate}deg)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTransitionEnd={() => setSettling(false)}
    >
      {dragging && dx > 24 && (
        <span className={[styles.verdict, styles.yes].join(" ")}>{labelYes}</span>
      )}
      {dragging && dx < -24 && (
        <span className={[styles.verdict, styles.no].join(" ")}>{labelNo}</span>
      )}
      {children}
    </div>
  );
}
