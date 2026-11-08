/*
 * Выбор ауры для карточки (ADR-016): палитра и фигура по seed.
 *
 * Детерминированно: у одной карточки одна и та же картинка навсегда —
 * на сервере и в браузере, сегодня и через месяц. «Случайность» только
 * между карточками, а не между рендерами.
 */

export const AURA_PALETTES = [
  "peach",
  "rose",
  "butter",
  "lilac",
  "mint",
  "sky",
  "dusk",
  "sunrise",
  "citrus",
] as const;
export type AuraPalette = (typeof AURA_PALETTES)[number];

export const AURA_SHAPES = ["flower", "heart", "halo", "rings", "rays", "wave", "glow"] as const;
export type AuraShape = (typeof AURA_SHAPES)[number];

/** Настроение карточки: тёплое (бренд), солнечное, тихое (приглашение, пауза). */
export type AuraMood = "rose" | "sun" | "silver";

const POOLS: Record<AuraMood, readonly AuraPalette[]> = {
  rose: ["rose", "peach", "lilac", "sunrise", "citrus", "butter"],
  sun: ["butter", "citrus", "peach", "sky", "mint", "sunrise"],
  silver: ["dusk", "sky", "mint", "butter", "lilac"],
};

/** FNV-1a: короткий стабильный хеш строки. */
export function auraHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type AuraPick = { palette: AuraPalette; shape: AuraShape; turn: number };

/**
 * Палитра — из пула настроения, фигура — из всех, поворот — ещё одна
 * степень свободы, чтобы две карточки с одной фигурой не совпали.
 * Разные биты хеша на разные решения: иначе палитра и фигура ходили бы парой.
 */
export function pickAura(seed: string, mood: AuraMood = "rose"): AuraPick {
  const h = auraHash(seed);
  const pool = POOLS[mood];
  return {
    palette: pool[h % pool.length],
    shape: AURA_SHAPES[(h >>> 8) % AURA_SHAPES.length],
    turn: ((h >>> 16) % 12) * 30,
  };
}
