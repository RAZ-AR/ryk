import type { CountryCode } from "@/lib/cities";

/*
 * Праздники и сезонные даты для строки «Скоро» на «Листе дня»
 * (ryk_docs/22-daily-joy-plan.md, фаза 4).
 *
 * Только пилотные страны — Сербия и Армения. Неполный календарь чужой
 * страны хуже, чем никакого: пропущенный главный праздник выглядит как
 * невнимательность. Для незнакомой страны остаются сезоны и луна — они
 * общие для всех.
 *
 * Здесь нет ни одного текста для человека: у момента только ключ, а слова
 * живут в messages/{ru,en,es}.json под `moments.*`. Так перевод не может
 * разойтись с датой, и добавить язык — значит добавить JSON, а не код.
 */

export type MomentKind = "holiday" | "season" | "moon";

export type Moment = {
  /** YYYY-MM-DD. */
  date: string;
  kind: MomentKind;
  /** Ключ сообщения внутри `moments`: «rs.easter», «season.summerSolstice», «moon.full». */
  key: string;
  /**
   * День памяти, а не праздник (24 апреля в Армении). Экран должен
   * говорить о нём тихо: без «скоро праздник» и без радостной интонации.
   */
  quiet?: true;
};

const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

/** Полночь UTC как метка дня: дни считаем без часовых поясов и летнего времени. */
function isoFromUtc(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function utcFromIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** ISO-дата плюс n дней. */
export function addDaysIso(iso: string, n: number): string {
  return isoFromUtc(utcFromIso(iso) + n * DAY_MS);
}

/**
 * Православная Пасха по юлианскому алгоритму Меёса, переведённая в
 * григорианский календарь. Сдвиг +13 дней верен для 1900–2099 — на весь
 * разумный срок жизни приложения; зашивать таблицу дат было бы проще, но
 * таблица однажды молча закончится.
 */
export function orthodoxEaster(year: number): string {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  // Юлианская дата → григорианская: в XX–XXI веках разница 13 дней.
  return isoFromUtc(Date.UTC(year, month - 1, day) + 13 * DAY_MS);
}

function serbianHolidays(year: number): Moment[] {
  const h = (date: string, key: string): Moment => ({ date, kind: "holiday", key });
  const easter = orthodoxEaster(year);
  return [
    h(ymd(year, 1, 1), "rs.newYear"),
    h(ymd(year, 1, 2), "rs.newYear"),
    h(ymd(year, 1, 7), "rs.christmas"),
    h(ymd(year, 2, 15), "rs.statehood"),
    h(ymd(year, 2, 16), "rs.statehood"),
    h(ymd(year, 5, 1), "rs.labour"),
    h(ymd(year, 5, 2), "rs.labour"),
    h(ymd(year, 11, 11), "rs.armistice"),
    // В Сербии нерабочие все четыре дня — от Великой пятницы до понедельника.
    h(addDaysIso(easter, -2), "rs.goodFriday"),
    h(addDaysIso(easter, -1), "rs.holySaturday"),
    h(easter, "rs.easter"),
    h(addDaysIso(easter, 1), "rs.easterMonday"),
  ];
}

function armenianHolidays(year: number): Moment[] {
  const h = (date: string, key: string): Moment => ({ date, kind: "holiday", key });
  return [
    h(ymd(year, 1, 1), "am.newYear"),
    h(ymd(year, 1, 2), "am.newYear"),
    h(ymd(year, 1, 6), "am.christmas"),
    h(ymd(year, 1, 28), "am.army"),
    h(ymd(year, 3, 8), "am.womensDay"),
    // День памяти жертв геноцида — не праздник. Помечаем, чтобы экран не
    // поздравлял с ним.
    { date: ymd(year, 4, 24), kind: "holiday", key: "am.remembrance", quiet: true },
    h(ymd(year, 5, 1), "am.labour"),
    h(ymd(year, 5, 9), "am.victory"),
    h(ymd(year, 5, 28), "am.republic"),
    h(ymd(year, 7, 5), "am.constitution"),
    h(ymd(year, 9, 21), "am.independence"),
    h(ymd(year, 12, 31), "am.newYearsEve"),
  ];
}

/**
 * Сезонные вехи. Все пилотные города в северном полушарии, поэтому
 * «весна с 1 марта» без оговорок. Равноденствия и солнцестояния — по
 * типичным датам: точный момент гуляет на день от года к году, а на
 * отрывном листе важен день, а не минута.
 */
function seasonalMoments(year: number): Moment[] {
  const s = (month: number, day: number, key: string): Moment => ({
    date: ymd(year, month, day),
    kind: "season",
    key,
  });
  return [
    s(3, 1, "season.springStart"),
    s(3, 20, "season.springEquinox"),
    s(6, 1, "season.summerStart"),
    s(6, 21, "season.summerSolstice"),
    s(9, 1, "season.autumnStart"),
    s(9, 22, "season.autumnEquinox"),
    s(12, 1, "season.winterStart"),
    s(12, 21, "season.winterSolstice"),
  ];
}

/** Известное полнолуние: 21 января 2000, 04:40 UTC. */
const FULL_MOON_EPOCH_MS = Date.UTC(2000, 0, 21, 4, 40);
/** Средний синодический месяц, сутки. */
const SYNODIC_DAYS = 29.530588853;

/**
 * Полнолуния в полуинтервале [fromMs, toMs) по среднему синодическому
 * месяцу. Настоящее полнолуние отклоняется от среднего на полсуток, так что
 * дата может уехать на день — для тихой строки «полнолуние» этого хватает,
 * а астрономическая библиотека ради одной строки была бы перебором.
 */
function fullMoons(fromMs: number, toMs: number): Moment[] {
  const out: Moment[] = [];
  const period = SYNODIC_DAYS * DAY_MS;
  let k = Math.floor((fromMs - FULL_MOON_EPOCH_MS) / period);
  for (;;) {
    const t = FULL_MOON_EPOCH_MS + k * period;
    if (t >= toMs + DAY_MS) break;
    const date = isoFromUtc(t);
    const day = utcFromIso(date);
    if (day >= fromMs && day < toMs) out.push({ date, kind: "moon", key: "moon.full" });
    k++;
  }
  return out;
}

/** При совпадении дат праздник страны важнее сезона, сезон — луны. */
const KIND_ORDER: Record<MomentKind, number> = { holiday: 0, season: 1, moon: 2 };

/**
 * Моменты с fromIso (включительно) на `days` дней вперёд, по порядку.
 *
 * countryCode null (город незнакомый) — только сезоны и луна: чужой
 * календарь не угадываем, см. комментарий в начале файла.
 */
export function upcomingMoments(
  countryCode: CountryCode | null,
  fromIso: string,
  days = 30,
): Moment[] {
  const fromMs = utcFromIso(fromIso);
  const toMs = fromMs + Math.max(0, days) * DAY_MS;
  if (!Number.isFinite(fromMs) || toMs <= fromMs) return [];

  // Окно может перейти через Новый год — берём оба года.
  const firstYear = new Date(fromMs).getUTCFullYear();
  const lastYear = new Date(toMs).getUTCFullYear();

  const all: Moment[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    all.push(...seasonalMoments(y));
    if (countryCode === "RS") all.push(...serbianHolidays(y));
    if (countryCode === "AM") all.push(...armenianHolidays(y));
  }
  all.push(...fullMoons(fromMs, toMs));

  return all
    .filter((m) => {
      const t = utcFromIso(m.date);
      return t >= fromMs && t < toMs;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.key.localeCompare(b.key),
    );
}

/** Все ключи моментов — для теста, что у каждого есть перевод. */
export function allMomentKeys(): string[] {
  const keys = new Set<string>(["moon.full"]);
  for (const m of [...seasonalMoments(2026), ...serbianHolidays(2026), ...armenianHolidays(2026)]) {
    keys.add(m.key);
  }
  return [...keys];
}
