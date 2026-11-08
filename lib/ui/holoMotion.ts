/*
 * Движение аур (AuraArt) и фона онбординга: общее на все карточки экрана.
 *
 * 1. Пауза вне экрана. Один IntersectionObserver на все карточки ставит
 *    `data-live="false"` тем, что не видны, — CSS ставит их анимацию на
 *    паузу. В ленте десятки карточек, а двигаться должны две-три.
 * 2. Наклон телефона. Пятна под стеклом смещаются против наклона, стекло
 *    стоит — получается сдвиг, как у настоящей голограммы. Значение пишем
 *    только в видимые карточки (`--tilt-x/y`, от -1 до 1), со сглаживанием.
 *
 * Источник наклона — датчик Telegram (Bot API 8.0); вне Telegram —
 * `deviceorientation`, но только там, где он не требует системного
 * запроса разрешения (иначе iOS Safari показал бы диалог ни с того ни с сего).
 * При `prefers-reduced-motion` наклон не включается вовсе.
 */
import { getTelegramWebApp } from "@/lib/telegram/webApp";

const live = new Set<HTMLElement>();
const all = new Set<HTMLElement>();
let observer: IntersectionObserver | null = null;

/** Насколько градусов наклона даёт полный сдвиг. */
const RANGE_DEG = 22;

let target = { x: 0, y: 0 };
let current = { x: 0, y: 0 };
let baseline: { beta: number; gamma: number } | null = null;
let frame = 0;
let stopTilt: (() => void) | null = null;

function clamp(v: number) {
  return Math.max(-1, Math.min(1, v));
}

function write(el: HTMLElement) {
  el.style.setProperty("--tilt-x", current.x.toFixed(3));
  el.style.setProperty("--tilt-y", current.y.toFixed(3));
}

function step() {
  current = {
    x: current.x + (target.x - current.x) * 0.12,
    y: current.y + (target.y - current.y) * 0.12,
  };
  live.forEach(write);
  const settled = Math.abs(target.x - current.x) < 0.002 && Math.abs(target.y - current.y) < 0.002;
  frame = settled ? 0 : requestAnimationFrame(step);
}

function onAngles(betaDeg: number | null, gammaDeg: number | null) {
  if (betaDeg == null || gammaDeg == null) return;
  // Нейтраль — как человек держит телефон в момент первого замера.
  baseline ??= { beta: betaDeg, gamma: gammaDeg };
  target = {
    x: clamp((gammaDeg - baseline.gamma) / RANGE_DEG),
    y: clamp((betaDeg - baseline.beta) / RANGE_DEG),
  };
  if (!frame) frame = requestAnimationFrame(step);
}

function startTilt(): (() => void) | null {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  const tg = getTelegramWebApp();
  const sensor = tg?.DeviceOrientation;
  if (sensor && tg?.isVersionAtLeast?.("8.0") && tg.onEvent && tg.offEvent) {
    const toDeg = 180 / Math.PI;
    const handler = () =>
      onAngles(
        sensor.beta == null ? null : sensor.beta * toDeg,
        sensor.gamma == null ? null : sensor.gamma * toDeg,
      );
    tg.onEvent("deviceOrientationChanged", handler);
    sensor.start({ refresh_rate: 60 });
    return () => {
      tg.offEvent?.("deviceOrientationChanged", handler);
      sensor.stop();
    };
  }

  const needsPermission =
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
      .requestPermission === "function";
  if (typeof DeviceOrientationEvent === "undefined" || needsPermission) return null;

  const handler = (e: DeviceOrientationEvent) => onAngles(e.beta, e.gamma);
  window.addEventListener("deviceorientation", handler);
  return () => window.removeEventListener("deviceorientation", handler);
}

/** Подключает карточку. Возвращает функцию отключения. */
export function registerHoloArt(el: HTMLElement): () => void {
  all.add(el);

  if (typeof IntersectionObserver !== "undefined") {
    observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const node = entry.target as HTMLElement;
          node.dataset.live = entry.isIntersecting ? "true" : "false";
          if (entry.isIntersecting) {
            live.add(node);
            write(node);
          } else {
            live.delete(node);
          }
        }
      },
      // Запас в полэкрана: карточка оживает чуть раньше, чем въедет.
      { rootMargin: "50% 0px" },
    );
    observer.observe(el);
  } else {
    live.add(el);
  }

  if (all.size === 1) {
    // Наклон — украшение: если SDK или датчик бросит исключение, экран
    // должен остаться целым, просто без эффекта.
    try {
      stopTilt = startTilt();
    } catch {
      stopTilt = null;
    }
  }

  return () => {
    all.delete(el);
    live.delete(el);
    observer?.unobserve(el);
    if (all.size === 0) {
      stopTilt?.();
      stopTilt = null;
      baseline = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}
