"use client";

import { useState, useTransition } from "react";
import { reactToExperience } from "@/app/actions/discover";

/*
 * Ответы на карточки ленты и колоды — без ожидания сервера.
 *
 * Карточка уходит с экрана сразу, запись идёт в фоне. Свежую колоду
 * приносит сам ответ действия (revalidatePath), отдельный router.refresh()
 * собирал бы главную второй раз. Не записалось — карточка возвращается.
 *
 * «Интересно» сначала ставит оттиск: краска растекается по картинке
 * (PrintArt, ~0.3 с), и только потом карточка уходит. Запись на сервер
 * стартует сразу, ожидание — только у глаз, не у сети.
 *
 * Порядок держим тем, в каком человек впервые увидел карточки: сервер
 * перемешивает колоду заново от набора (mixByKind), и без всего этого лента
 * прыгала бы после каждого ответа, а в колоде подменялась бы карточка
 * под пальцем.
 */

/** Новый порядок: прежний для уже виденных, новые — в конец. */
export function keepOrder<T extends { id: string }>(seen: readonly string[], deck: readonly T[]) {
  const byId = new Map(deck.map((c) => [c.id, c]));
  const known = new Set(seen);
  const ordered = seen.flatMap((id) => {
    const card = byId.get(id);
    return card ? [card] : [];
  });
  return [...ordered, ...deck.filter((c) => !known.has(c.id))];
}

/** Сколько длится оттиск «Интересно» до ухода карточки: --ryk-duration-slow + запас. */
const STAMP_MS = 380;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useAnsweredDeck<T extends { id: string }>(deck: readonly T[]) {
  const [seen, setSeen] = useState<readonly string[]>(() => deck.map((c) => c.id));
  const [answered, setAnswered] = useState<ReadonlySet<string>>(() => new Set());
  const [stamped, setStamped] = useState<ReadonlySet<string>>(() => new Set());
  const [, start] = useTransition();

  // Новые карточки (колода добирается до лимита) запоминаем в конце очереди.
  // Обновление состояния во время рендера — штатный приём React для
  // «состояния от пропсов»: повторного рендера-эффекта не будет.
  if (deck.some((c) => !seen.includes(c.id))) {
    setSeen((prev) => [...prev, ...deck.map((c) => c.id).filter((id) => !prev.includes(id))]);
  }

  const visible = keepOrder(seen, deck).filter((c) => !answered.has(c.id));

  /** `stamp` — только для ленты: в колоде карточка и так улетает свайпом. */
  const react = (card: T, liked: boolean, stamp = false) => {
    const hide = () => setAnswered((prev) => new Set(prev).add(card.id));
    if (liked && stamp && !prefersReducedMotion()) {
      setStamped((prev) => new Set(prev).add(card.id));
      setTimeout(hide, STAMP_MS);
    } else {
      hide();
    }
    start(async () => {
      const res = await reactToExperience(card.id, liked);
      if (!res.ok) {
        const without = (prev: ReadonlySet<string>) => {
          const next = new Set(prev);
          next.delete(card.id);
          return next;
        };
        setAnswered(without);
        setStamped(without);
      }
    });
  };

  return { visible, answeredCount: answered.size, stamped, react };
}
