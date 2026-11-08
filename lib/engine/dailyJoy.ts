import type { WeatherKind } from "@/lib/weather/openMeteo";

/*
 * Маленькая радость дня (ryk_docs/22-daily-joy-plan.md, фаза 4).
 *
 * Радость — только для чтения: её не надо выполнять, отмечать или
 * засчитывать. Поэтому в каталоге нет ничего похожего на задачу или цель —
 * только крошечные конкретные вещи, которые можно сделать, а можно просто
 * прочитать и улыбнуться.
 *
 * Тексты — в messages/{ru,en,es}.json под `joy.*`; здесь только ключи и
 * условия, когда радость уместна.
 */

export type Season = "winter" | "spring" | "summer" | "autumn";

/**
 * Черты, которые человек выбирает в онбординге (фаза 3, `joyTraits`).
 * Список общий: онбординг показывает эти же, и черта, которой нет здесь,
 * просто ни на что бы не влияла.
 */
export const JOY_TRAITS = [
  "coffee",
  "walks",
  "friends",
  "food",
  "home",
  "city",
  "nature",
  "music",
  "books",
  "art",
] as const;
export type JoyTrait = (typeof JOY_TRAITS)[number];

export type JoyConditions = {
  seasons?: Season[];
  /** Радость только про эту погоду (дождь за окном, снег). */
  weather?: WeatherKind[];
  /** ISO-дни недели: 1 — понедельник, 7 — воскресенье. */
  weekdays?: number[];
  /** В тексте время заката — без него фраза не имеет смысла. */
  needsSunset?: boolean;
  /**
   * Нужно выйти на улицу и там задержаться. Под дождём и грозой такую
   * радость не предлагаем — «посиди на скамейке» в ливень звучит как
   * издёвка. Если погода неизвестна — тоже нет: не знаем, что не льёт.
   */
  outdoor?: boolean;
  traits?: JoyTrait[];
};

export type Joy = { key: string } & JoyConditions;

const DRY: WeatherKind[] = ["CLEAR", "CLOUDY", "SNOW"];

export const JOYS: readonly Joy[] = [
  { key: "sunsetToEnd", needsSunset: true, outdoor: true, weather: ["CLEAR", "CLOUDY"] },
  { key: "seasonalMarket", traits: ["food"] },
  {
    key: "coffeeOutside",
    outdoor: true,
    seasons: ["spring", "summer", "autumn"],
    traits: ["coffee"],
  },
  { key: "newWayHome", outdoor: true, traits: ["walks", "city"] },
  { key: "fewLinesToFriend", traits: ["friends"] },
  { key: "listenToRain", weather: ["RAIN"] },
  { key: "untouchedSnow", outdoor: true, weather: ["SNOW"], traits: ["nature", "walks"] },
  { key: "childhoodDish", traits: ["food", "home"] },
  { key: "newBakery", traits: ["food", "city"] },
  { key: "lookUp", outdoor: true, traits: ["city", "art"] },
  { key: "songFromSixteen", traits: ["music"] },
  { key: "waitingBook", traits: ["books"] },
  { key: "flowersForNoReason", traits: ["home"] },
  { key: "parkBench", outdoor: true, traits: ["nature", "walks"] },
  { key: "slowTea", traits: ["coffee", "home"] },
  { key: "photoOfLight", traits: ["art", "home"] },
  { key: "callSomeone", traits: ["friends"] },
  { key: "slowBreakfast", weekdays: [6, 7], traits: ["home", "food"] },
  { key: "walkOneStop", weekdays: [5], outdoor: true, traits: ["walks", "city"] },
  { key: "favouriteMug", weekdays: [1], traits: ["coffee"] },
  { key: "fruitAtStall", seasons: ["summer"], traits: ["food"] },
  { key: "prettiestLeaf", seasons: ["autumn"], outdoor: true, traits: ["nature"] },
  { key: "warmMug", seasons: ["winter"], traits: ["home", "coffee"] },
  { key: "bloomingTree", seasons: ["spring"], outdoor: true, traits: ["nature", "walks"] },
  { key: "oneStar", weather: ["CLEAR"], outdoor: true, traits: ["nature"] },
  { key: "moveOneThing", traits: ["home"] },
  { key: "localWord", traits: ["city"] },
  { key: "handwrittenNote", traits: ["friends"] },
  { key: "cloudAnimal", weather: ["CLOUDY"], outdoor: true, traits: ["nature"] },
  { key: "rainyEvening", weather: ["RAIN", "STORM"], traits: ["home"] },
  { key: "morningAir", traits: ["home", "nature"] },
  { key: "kitchenDance", traits: ["music", "home"] },
  { key: "kindWord", traits: ["city", "friends"] },
  { key: "smallGallery", traits: ["art", "books", "city"] },
  {
    key: "feetInWater",
    seasons: ["summer"],
    weather: ["CLEAR"],
    outdoor: true,
    traits: ["nature"],
  },
];

/** Метеорологические сезоны северного полушария — там все пилотные города. */
export function seasonOf(dateIso: string): Season {
  const month = Number(dateIso.slice(5, 7));
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

export type JoyInput = {
  dateIso: string;
  userId: string;
  season: Season;
  weather: WeatherKind | null;
  weekday: number;
  traits?: readonly string[];
  /** Местное «HH:MM» заката, если известно. */
  sunset?: string | null;
};

export type PickedJoy = {
  key: string;
  /** Подстановки в текст: `{time}` у заката. */
  params?: Record<string, string>;
};

function fits(joy: Joy, input: JoyInput): boolean {
  if (joy.seasons && !joy.seasons.includes(input.season)) return false;
  if (joy.weekdays && !joy.weekdays.includes(input.weekday)) return false;
  if (joy.needsSunset && !input.sunset) return false;
  if (joy.weather && (input.weather == null || !joy.weather.includes(input.weather))) return false;
  if (joy.outdoor && (input.weather == null || !DRY.includes(input.weather))) return false;
  return true;
}

function isUnconditional(joy: Joy): boolean {
  return !joy.seasons && !joy.weather && !joy.weekdays && !joy.needsSunset && !joy.outdoor;
}

/**
 * Вес радости. Каждая совпавшая черта добавляет +2 к базовой единице: человек сам сказал, что ему
 * это дорого. Условная радость (дождь, суббота, осень) чуть вероятнее
 * безусловной: она про сегодняшний день, а не про любой.
 */
function weightOf(joy: Joy, traits: readonly string[]): number {
  const matches = joy.traits?.filter((t) => traits.includes(t)).length ?? 0;
  return 1 + 2 * matches + (isUnconditional(joy) ? 0 : 1);
}

/** FNV-1a, 32 бита: быстрый, стабильный между запусками и платформами. */
function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Перемешивание из MurmurHash3: соседние даты отличаются одной цифрой в
  // конце, и без него старшие биты у них слишком похожи — радость
  // «залипала» бы на несколько дней подряд.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Радость дня. Детерминированно по пользователю и дате, без Math.random:
 * перезагрузка не должна менять «сегодняшнюю» радость, а у двух людей в
 * один день она разная.
 */
export function pickJoy(input: JoyInput): PickedJoy {
  const traits = input.traits ?? [];
  let pool = JOYS.filter((j) => fits(j, input));
  // Безусловные проходят любой фильтр, так что пустым пул быть не должен;
  // запасной путь — на случай, если каталог когда-нибудь станет условным целиком.
  if (pool.length === 0) pool = JOYS.filter(isUnconditional);
  if (pool.length === 0) pool = [...JOYS];

  const weights = pool.map((j) => weightOf(j, traits));
  const total = weights.reduce((s, w) => s + w, 0);
  let point = (hash32(`${input.userId}:${input.dateIso}`) / 2 ** 32) * total;

  let joy = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) {
    point -= weights[i];
    if (point < 0) {
      joy = pool[i];
      break;
    }
  }

  if (joy.needsSunset && input.sunset) return { key: joy.key, params: { time: input.sunset } };
  return { key: joy.key };
}
