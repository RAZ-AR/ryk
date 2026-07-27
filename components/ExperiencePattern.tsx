import type { LifeCategory } from "@/generated/prisma/enums";
import styles from "./ExperiencePattern.module.css";

/*
 * Узор вместо фотографии.
 *
 * У вызова («позвонить тому, с кем не говорил год») фотографии не существует
 * и существовать не может. Стоковая картинка здесь врёт: она показывает
 * чужого человека и ломает бумажную графику. Поэтому рисуем отпечаток —
 * детерминированный по id, ink на бумаге, один розовый акцент.
 *
 * Свойства, ради которых это сделано так:
 *  - у каждого впечатления свой постоянный узор (не прыгает между рендерами);
 *  - ноль сетевых запросов, ноль лицензий, работает офлайн;
 *  - живёт в палитре дизайн-системы, новых оттенков не вводит (17-design-system).
 *
 * Мотив задаёт категория, вариацию внутри мотива — хеш id.
 */

type Props = {
  /** Стабильный ключ: id впечатления. Один id — один и тот же узор навсегда. */
  seed: string;
  category: LifeCategory;
};

/**
 * FNV-1a. Намеренно свой, а не импорт из lib/engine: картинке нечего знать
 * про движок рекомендаций, и наоборот.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Поток псевдослучайных чисел из одного хеша — чтобы параметры не совпадали. */
function makeVariants(seed: string) {
  let state = hash(seed);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const W = 120;
const H = 72;

/**
 * Округление координат до сотых.
 *
 * Не косметика: Math.cos/Math.sin не обязаны давать бит-в-бит одинаковый
 * результат в Node и в движке браузера, и React ловит расхождение в последнем
 * знаке как рассинхрон гидратации (мы это уже поймали). Округление убирает
 * расхождение и заодно укорачивает разметку.
 */
const r = (value: number) => Math.round(value * 100) / 100;

/** Каждая функция рисует свой мотив; next() даёт вариацию внутри мотива. */
const MOTIFS: Record<LifeCategory, (next: () => number) => React.ReactNode> = {
  // Холмы и вода — вложенные дуги разной высоты.
  NATURE: (next) => {
    const rows = 3 + Math.floor(next() * 2);
    return Array.from({ length: rows }, (_, i) => {
      const y = r(H - 8 - i * (H / (rows + 1.5)));
      const lift = r(10 + next() * 18);
      return (
        <path
          key={i}
          d={`M -4 ${y} Q ${W / 2} ${r(y - lift)} ${W + 4} ${y}`}
          fill="none"
          strokeWidth={i === 0 ? 2 : 1}
        />
      );
    });
  },

  // Колоннада — вертикали разной высоты, как корешки книг на полке.
  CULTURE: (next) => {
    const count = 7 + Math.floor(next() * 5);
    const gap = W / (count + 1);
    return Array.from({ length: count }, (_, i) => {
      const x = r(gap * (i + 1));
      const h = r(16 + next() * 38);
      return <line key={i} x1={x} y1={H - 10} x2={x} y2={r(H - 10 - h)} strokeWidth={2} />;
    });
  },

  // Движение — параллельные диагонали, сдвинутые по фазе.
  MOVEMENT: (next) => {
    const count = 6 + Math.floor(next() * 4);
    const step = W / count;
    const slant = r(14 + next() * 16);
    return Array.from({ length: count + 3 }, (_, i) => (
      <line
        key={i}
        x1={r(i * step - 20)}
        y1={H}
        x2={r(i * step - 20 + slant)}
        y2={0}
        strokeWidth={1.5}
      />
    ));
  },

  // Связь — пересекающиеся окружности.
  CONNECTION: (next) => {
    const count = 2 + Math.floor(next() * 2);
    const radius = r(16 + next() * 8);
    const span = W / (count + 1);
    return Array.from({ length: count }, (_, i) => (
      <circle
        key={i}
        cx={r(span * (i + 1) + (next() * 8 - 4))}
        cy={H / 2}
        r={radius}
        fill="none"
        strokeWidth={1.5}
      />
    ));
  },

  // Радость — рассыпанные лучи из одной точки.
  JOY: (next) => {
    const count = 9 + Math.floor(next() * 6);
    const cx = W / 2 + (next() * 20 - 10);
    const cy = H / 2;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const inner = 6;
      const outer = 16 + next() * 16;
      return (
        <line
          key={i}
          x1={r(cx + Math.cos(angle) * inner)}
          y1={r(cy + Math.sin(angle) * inner)}
          x2={r(cx + Math.cos(angle) * outer)}
          y2={r(cy + Math.sin(angle) * outer)}
          strokeWidth={1.5}
        />
      );
    });
  },

  // Открытие — сетка, в которой одна клетка отмечена.
  DISCOVERY: (next) => {
    const cols = 6;
    const rows = 4;
    const cw = W / cols;
    const ch = H / rows;
    const markCol = Math.floor(next() * cols);
    const markRow = Math.floor(next() * rows);
    return (
      <>
        {Array.from({ length: cols - 1 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={cw * (i + 1)}
            y1={0}
            x2={cw * (i + 1)}
            y2={H}
            strokeWidth={0.75}
          />
        ))}
        {Array.from({ length: rows - 1 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={ch * (i + 1)}
            x2={W}
            y2={ch * (i + 1)}
            strokeWidth={0.75}
          />
        ))}
        <rect
          className={styles.accentFill}
          x={cw * markCol}
          y={ch * markRow}
          width={cw}
          height={ch}
          stroke="none"
        />
      </>
    );
  },

  // Вызов — ступени вверх, последняя выделена розовым.
  CHALLENGE: (next) => {
    const steps = 4 + Math.floor(next() * 3);
    const sw = W / steps;
    const sh = (H - 14) / steps;
    return Array.from({ length: steps }, (_, i) => {
      const x = r(i * sw);
      const xEnd = r(x + sw);
      const y = r(H - 8 - (i + 1) * sh);
      return (
        <g key={i}>
          <line x1={x} y1={y} x2={xEnd} y2={y} strokeWidth={2} />
          <line x1={xEnd} y1={y} x2={xEnd} y2={r(y + sh)} strokeWidth={2} />
        </g>
      );
    });
  },

  // Покой — горизонтали, редеющие кверху.
  REST: (next) => {
    const count = 5 + Math.floor(next() * 3);
    let y = H - 8;
    let gap = 6;
    return Array.from({ length: count }, (_, i) => {
      const line = (
        <line
          key={i}
          x1={r(10 + next() * 8)}
          y1={r(y)}
          x2={r(W - 10 - next() * 8)}
          y2={r(y)}
          strokeWidth={1}
        />
      );
      y -= gap;
      gap *= 1.35;
      return line;
    });
  },

  // Вклад — круги, расходящиеся от точки, как от брошенного камня.
  CONTRIBUTION: (next) => {
    const count = 3 + Math.floor(next() * 2);
    const cx = r(W / 2 + (next() * 24 - 12));
    const cy = H / 2;
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r(7 + i * (8 + next() * 5))}
            fill="none"
            strokeWidth={1}
          />
        ))}
        <circle className={styles.accentFill} cx={cx} cy={cy} r={3} stroke="none" />
      </>
    );
  },
};

export function ExperiencePattern({ seed, category }: Props) {
  const next = makeVariants(seed);

  return (
    <svg
      className={styles.pattern}
      viewBox={`0 0 ${W} ${H}`}
      // Растягиваем, а не обрезаем: слот фото бывает и 104px, и 180px высотой,
      // и при slice у мотивов срезало низ, из-за чего узор «висел» в воздухе.
      // Это абстрактная текстура — неравномерный масштаб ей не вредит.
      preserveAspectRatio="none"
      // Декоративный: смысл несёт заголовок билета рядом, дублировать нечего.
      aria-hidden="true"
      focusable="false"
    >
      <g className={styles.strokes} strokeLinecap="square">
        {MOTIFS[category](next)}
      </g>
    </svg>
  );
}

/**
 * Что показать в слоте фото у билета: афишу, если куратор её завёл, иначе
 * узор. Одно место принятия решения, чтобы лента, свайпы и неделя выглядели
 * одинаково и не разошлись при следующей правке.
 */
export function ExperienceVisual({
  id,
  category,
  imageUrl,
}: {
  id: string;
  category: LifeCategory;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    // Декоративное: рядом заголовок билета, альтернативному тексту нечего добавить.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.photo} src={imageUrl} alt="" loading="lazy" />;
  }

  return <ExperiencePattern seed={id} category={category} />;
}
