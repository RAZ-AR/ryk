import { JOY_TRAITS, type JoyTrait } from "@/lib/engine/dailyJoy";

/*
 * Черты «маленьких радостей» человека (ryk_docs/22-daily-joy-plan.md,
 * фаза 3): что он выбрал на экране-вдохновении и что честно читается из
 * его хорошего момента.
 *
 * Черты влияют только на радость дня (lib/engine/dailyJoy.ts), а не на
 * подбор недели: «кофе» или «музыка» — это повседневные мелочи, и чистого
 * соответствия категориям впечатлений (NATURE, CULTURE…) у них нет. Тянуть
 * «прогулки» в MOVEMENT значило бы выдумать вкус, которого человек не
 * называл, — а вкус к категориям онбординг и так спрашивает напрямую.
 */

/**
 * Мини-билеты экрана-вдохновения: черта и радость из каталога `joy.*`,
 * которой она показана. Текст общий с листом дня — человек выбирает ровно
 * то, что потом может встретить на главной, а не абстрактное «люблю кофе».
 * Восемь из десяти черт: больше на экран не помещается без прокрутки,
 * а «книги» и «город» доберёт разбор хорошего момента.
 */
export const INSPIRE_JOYS: readonly { trait: JoyTrait; joyKey: string }[] = [
  { trait: "coffee", joyKey: "coffeeOutside" },
  { trait: "walks", joyKey: "newWayHome" },
  { trait: "friends", joyKey: "fewLinesToFriend" },
  { trait: "food", joyKey: "newBakery" },
  { trait: "home", joyKey: "flowersForNoReason" },
  { trait: "nature", joyKey: "parkBench" },
  { trait: "music", joyKey: "songFromSixteen" },
  { trait: "art", joyKey: "photoOfLight" },
];

function isJoyTrait(value: unknown): value is JoyTrait {
  return typeof value === "string" && (JOY_TRAITS as readonly string[]).includes(value);
}

/**
 * Черты с клиента — только известные, без дублей, в порядке каталога.
 * Server action — открытая точка входа: мусор в БД не пускаем.
 */
export function sanitizeJoyTraits(input: unknown): JoyTrait[] {
  if (!Array.isArray(input)) return [];
  const picked = new Set(input.filter(isJoyTrait));
  return JOY_TRAITS.filter((t) => picked.has(t));
}

/** Json-поле `users.joyTraits` → список черт; битое значение — пустой список. */
export function parseJoyTraits(value: unknown): JoyTrait[] {
  return sanitizeJoyTraits(value);
}

/*
 * Ключевые основы слов на ru/en/es. Только однозначные: «гор» поймал бы
 * «город», «чай» — «случайно», поэтому основы длиннее и каждая начинается
 * с начала слова (lookbehind на букву). Нет уверенности — нет черты: лишняя
 * выдуманная черта хуже недостающей.
 */
const TEXT_PATTERNS: Record<JoyTrait, readonly string[]> = {
  coffee: ["кофе", "кофейн", "coffee", "café", "cafecito", "espresso", "эспрессо"],
  walks: ["гуля", "прогул", "пешком", "walk", "stroll", "paseo", "pasear", "caminar", "caminat"],
  // Не «друг»: он же начало «другой» — «в другой раз» не про друзей.
  friends: ["друз", "подруг", "friend", "amig"],
  food: [
    "готовил",
    "ужин",
    "завтрак",
    "пекарн",
    "dinner",
    "breakfast",
    "bakery",
    "cena",
    "desayun",
    "panader",
  ],
  home: ["дома ", "дома,", "дома.", "уют", "at home", "cozy", "cosy", "en casa"],
  city: ["по городу", "по улиц", "downtown", "streets", "por la ciudad"],
  // Не голые «лес» и «мор»: это ещё и «лестница», «мороз», «мороженое».
  nature: [
    "в лес",
    "лесу",
    "лесом",
    "горах",
    "горы",
    "море",
    "морю",
    "моря",
    "морем",
    "озер",
    "озёр",
    "природ",
    "forest",
    "mountain",
    "beach",
    "lake",
    "bosque",
    "montañ",
    "playa",
    "lago",
  ],
  music: ["музык", "концерт", "песн", "music", "concert", "song", "música", "concierto", "canci"],
  books: ["книг", "читал", "book", "reading", "libro", "leyendo"],
  art: [
    "музе",
    "выставк",
    "галере",
    "museum",
    "exhibition",
    "gallery",
    "museo",
    "exposici",
    "galer",
  ],
};

const LETTER_BEFORE = /\p{L}$/u;

function mentions(text: string, stem: string): boolean {
  let from = 0;
  for (;;) {
    const at = text.indexOf(stem, from);
    if (at < 0) return false;
    // Основа должна начинать слово: «мор» в «море», но не в «юморе».
    if (at === 0 || !LETTER_BEFORE.test(text.slice(0, at))) return true;
    from = at + 1;
  }
}

/**
 * Черты из рассказа о хорошем моменте — простой проход по ключевым словам,
 * без модели: детерминированно, проверяемо тестом и бесплатно. «Дома» —
 * с разделителем, иначе это совпало бы с «домашний» в неочевидных фразах.
 */
export function traitsFromText(text: string | null | undefined): JoyTrait[] {
  if (!text) return [];
  const lower = ` ${text.toLowerCase()} `;
  return JOY_TRAITS.filter((trait) => TEXT_PATTERNS[trait].some((stem) => mentions(lower, stem)));
}
