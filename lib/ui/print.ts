/*
 * Растровый оттиск (ADR-017): картинка карточки, листа дня и обложки.
 *
 * Фигура — те же семь форм, что были у аур (цветок, сердце, ореол, кольца,
 * лучи, волна, свечение), но вместо размытого цвета — сетка точек одной
 * краской, повёрнутая на 45°, как растр в типографии. Точка тем крупнее,
 * чем светлее место: площадь точки пропорциональна свету.
 *
 * Детерминированно: у одной карточки одна и та же картинка навсегда —
 * на сервере и в браузере, сегодня и через месяц.
 *
 * Весь растр — один `<path>` (окружность = два дуговых сегмента), а не
 * тысячи `<circle>`: один узел DOM вместо полутора тысяч.
 */

export const PRINT_SHAPES = ["flower", "heart", "halo", "rings", "rays", "wave", "glow"] as const;
export type PrintShape = (typeof PRINT_SHAPES)[number];

/** FNV-1a: короткий стабильный хеш строки. */
export function printHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type PrintPick = {
  shape: PrintShape;
  /** Поворот фигуры, градусы. Сердце не вертим: вверх ногами это не сердце. */
  turn: number;
  /** Где по горизонтали центр фигуры (доля ширины): лёгкая асимметрия. */
  offset: number;
};

/** Разные биты хеша на разные решения: иначе фигура и поворот ходили бы парой. */
export function pickPrint(seed: string): PrintPick {
  const h = printHash(seed);
  const shape = PRINT_SHAPES[(h >>> 8) % PRINT_SHAPES.length];
  return {
    shape,
    turn: shape === "heart" ? 0 : ((h >>> 16) % 12) * 30,
    offset: [0.42, 0.5, 0.58][(h >>> 4) % 3],
  };
}

/* ─── Поля яркости: координаты нормированы, фигура занимает радиус ~1 ─── */

const G = (u: number, v: number, cu: number, cv: number, s: number) =>
  Math.exp(-((u - cu) ** 2 + (v - cv) ** 2) / (2 * s * s));

const FIELDS: Record<PrintShape, (u: number, v: number) => number> = {
  glow: (u, v) => G(u, v, 0, 0, 0.4),
  flower: (u, v) => {
    let s = 0;
    for (let k = 0; k < 5; k += 1) {
      const a = (k / 5) * 2 * Math.PI - Math.PI / 2;
      s += G(u, v, Math.cos(a) * 0.46, Math.sin(a) * 0.46, 0.24);
    }
    return Math.min(1, s * 0.95) - 0.6 * G(u, v, 0, 0, 0.13);
  },
  heart: (u, v) => {
    const x = u * 1.2;
    const y = -v * 1.2 + 0.22;
    const f = (x * x + y * y - 1) ** 3 - x * x * y ** 3;
    return (1 / (1 + Math.exp(f * 5))) * (0.5 + 0.5 * G(u, v, 0, -0.1, 0.55));
  },
  halo: (u, v) => {
    const r = Math.hypot(u, v);
    return Math.exp(-((r - 0.58) ** 2) / (2 * 0.13 ** 2)) + 0.22 * G(u, v, 0, 0, 0.25);
  },
  rings: (u, v) => {
    const r = Math.hypot(u, v);
    return [0.2, 0.5, 0.8].reduce(
      (s, R, k) => s + (1 - k * 0.22) * Math.exp(-((r - R) ** 2) / (2 * 0.075 ** 2)),
      0,
    );
  },
  rays: (u, v) => {
    const r = Math.hypot(u, v);
    const t = Math.atan2(v, u);
    return (
      ((Math.cos(t * 7) + 1) / 2) ** 1.4 *
        Math.exp(-(r * r) / (2 * 0.62 ** 2)) *
        Math.min(1, r * 3) +
      0.8 * G(u, v, 0, 0, 0.15)
    );
  },
  wave: (u, v) =>
    Math.exp(-((v - 0.3 * Math.sin(u * 3.1)) ** 2) / (2 * 0.19 ** 2)) *
      Math.exp(-(u * u) / (2 * 1.05 ** 2)) +
    0.45 *
      Math.exp(-((v + 0.55 - 0.22 * Math.sin(u * 3.1 + 1)) ** 2) / (2 * 0.11 ** 2)) *
      Math.exp(-(u * u) / (2 * 0.85 ** 2)),
};

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

export type PrintOptions = {
  /** Явная фигура (лист дня берёт её по погоде). Без неё — по seed. */
  shape?: PrintShape;
  /** Высота / ширина. */
  ratio?: number;
  /** Точек по ширине: меньше — крупнее растр. */
  cols?: number;
  /** Множитель яркости: бледный оттиск для пустых состояний. */
  gain?: number;
};

export type Print = { width: number; height: number; d: string; dots: number };

/** Ширина картинки в единицах viewBox: 10 единиц на шаг сетки. */
const CELL = 10;

export function printPath(seed: string, opts: PrintOptions = {}): Print {
  const { ratio = 0.75, cols = 48, gain = 1 } = opts;
  const pick = pickPrint(seed);
  const shape = opts.shape ?? pick.shape;
  const field = FIELDS[shape];

  const W = cols * CELL;
  const H = Math.round(W * ratio);
  const rmax = CELL * 0.62; // при полной яркости соседние точки сливаются
  const R = Math.min(W, H) * 0.42;
  const ox = W * pick.offset;
  const oy = H / 2;
  const turn = (pick.turn * Math.PI) / 180;
  const ct = Math.cos(turn);
  const st = Math.sin(turn);
  const step = CELL * Math.SQRT1_2; // решётка под 45°
  const n = Math.ceil(Math.hypot(W, H) / CELL / 2) + 1;
  const fadeX = W * 0.2;
  const fadeY = H * 0.2;

  let d = "";
  let dots = 0;
  for (let i = -n; i <= n; i += 1) {
    for (let j = -n; j <= n; j += 1) {
      const x = W / 2 + (i - j) * step;
      const y = H / 2 + (i + j) * step;
      if (x < 0 || x > W || y < 0 || y > H) continue;
      const u0 = (x - ox) / R;
      const v0 = (y - oy) / R;
      const u = u0 * ct - v0 * st;
      const v = u0 * st + v0 * ct;
      // Края растворяются в бумаге: у оттиска нет рамки.
      const edge = smooth(Math.min(x / fadeX, (W - x) / fadeX, y / fadeY, (H - y) / fadeY));
      const light = clamp01(field(u, v)) ** 0.85 * edge * gain;
      const r = rmax * Math.sqrt(light);
      if (r < 0.4) continue;
      const rr = r.toFixed(1);
      const dd = (2 * r).toFixed(1);
      d += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${rr} ${rr} 0 1 0 ${dd} 0a${rr} ${rr} 0 1 0-${dd} 0`;
      dots += 1;
    }
  }
  return { width: W, height: H, d, dots };
}
