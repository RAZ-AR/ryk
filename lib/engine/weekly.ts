import type {
  Emotion,
  ExperienceKind,
  FreeWindow,
  LifeBarrier,
  LifeCategory,
  SocialMode,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { buildNudge, type Nudge } from "@/lib/engine/nudges";
import { liveExperienceWhere } from "@/lib/engine/liveExperiences";
import { localizeExperience } from "@/lib/i18n/experience";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { signedPhotoUrl } from "@/lib/storage/memoryPhotos";
import { getWeekForecast, type DayWeather } from "@/lib/weather/openMeteo";

/*
 * Experience Engine v0 (ryk_docs/06-experience-engine.md).
 * Упрощённый scoring: Relevance × Feasibility × Timing, портфель — с
 * разнообразием категорий. Каждая рекомендация несёт код «почему» (§Explainability).
 */

/**
 * Сколько событий максимум может попасть в выбор недели. Остальные места —
 * за вызовами и ритуалами: они не зависят от билетов, погоды и денег.
 */
const MAX_EVENT_CANDIDATES = 1;

/** Короткое впечатление — то, что помещается в час. */
const SHORT_MINUTES = 60;

/**
 * Множитель по названному в онбординге препятствию: предлагаем обход,
 * а не уговоры (07-ai-companion). Спросили — значит ответ должен что-то
 * менять, иначе вопрос был лишним.
 *
 * NO_COMPANY и FEAR здесь не обходятся: честного признака «это делают
 * в одиночку» и «это маленький шаг» в каталоге пока нет, а выдумывать
 * его из категории значило бы врать в объяснении «почему это подходит».
 */
export function barrierBoost(barrier: LifeBarrier | null, e: ExperienceForScore): number {
  switch (barrier) {
    case "NO_TIME":
      return e.durationMin != null && e.durationMin <= SHORT_MINUTES ? 1.6 : 1;
    case "TOO_EXPENSIVE":
      return e.price === 0 ? 1.6 : 1;
    case "NO_ENERGY":
      return e.kind === "RITUAL" ? 1.6 : 1;
    default:
      return 1;
  }
}

/**
 * Вес по явному отношению к категории (онбординг: категории и свайпы).
 * Раньше учитывались только LIKE, и «не моё» в онбординге ничего не меняло.
 *
 * 0.5, а не 0: это мягкое «реже», а не запрет. Дизлайк категории в онбординге —
 * грубый сигнал по одному-двум свайпам, и вычёркивать целую категорию из жизни
 * по нему было бы слишком сильным выводом. Жёсткий фильтр уже есть там, где
 * сигнал точный, — «не интересно» на конкретном впечатлении в ленте.
 * LIKE перевешивает DISLIKE — то же правило, что при сохранении онбординга.
 */
export function preferenceWeight(liked: boolean, disliked: boolean): number {
  return disliked && !liked ? 0.5 : 1;
}

/** Сколько кандидатов показываем в выборе недели. */
const CANDIDATES = 3;

function clampRatio(noveltyRatio: number): number {
  return Number.isFinite(noveltyRatio) ? Math.min(100, Math.max(0, noveltyRatio)) : 30;
}

/**
 * Релевантность впечатления из НЕ любимой категории в зависимости от
 * «новизны» (User.noveltyRatio, 0..100; онбординг: 20 / 40 / 70).
 *
 * Линейно 0.3 + ratio/100: при значении по умолчанию 30 получается прежняя
 * константа 0.6 — сами веса у тех, кто ничего не выбирал, не меняются.
 * (Подборка при этом может сдвинуться: noveltySlots(30) = 1, и у человека
 * с тремя и более любимыми категориями одно место теперь уходит незнакомому —
 * это намеренно, умолчание 30 уже означает «немного нового».)
 * Нелюбимая (DISLIKE) категория тоже считается незнакомой и может занять
 * место новизны, но с весом ×0.5 обычно проигрывает нейтральным — в резерв
 * она чаще всего попадает, когда другого незнакомого в каталоге нет (бюджет,
 * близость и детерминированный разброс могут изредка перевесить множитель).
 * «Спокойно» (20) → 0.5, «баланс» (40) → 0.7, «смело» (70) → 1.0.
 * Любимые категории остаются на 2: новизна поднимает незнакомое, а не
 * опускает знакомое.
 */
export function unfamiliarRelevance(noveltyRatio: number): number {
  return 0.3 + clampRatio(noveltyRatio) / 100;
}

/**
 * Сколько мест из трёх держим за незнакомыми категориями: round(3 × ratio/100).
 * 20/30/40 → 1, 70 → 2, 100 → 3. Одних весов мало: у человека с тремя и более
 * любимыми категориями они всё равно забрали бы все места, и ответ «хочу
 * нового» ничего бы не значил. Резерв действует, только если незнакомое
 * в каталоге есть, — пустое место хуже знакомого.
 */
export function noveltySlots(noveltyRatio: number, total: number = CANDIDATES): number {
  return Math.min(total, Math.round((total * clampRatio(noveltyRatio)) / 100));
}

/**
 * Множитель по предпочитаемому формату (User.socialMode).
 *
 * Как и с барьерами, поднимаем только там, где у каталога есть честный
 * признак. Отдельного поля «с кем это делают» у Experience нет, поэтому:
 * - NEW_PEOPLE → EVENT (на событии вокруг всегда незнакомые люди) или
 *   категория CONNECTION (она про людей по определению). 1.25 — скромно:
 *   формат — пожелание, а не фильтр, и он не должен перебивать интерес.
 * - SOLO → RITUAL: тихое домашнее делается без компании и без договорённостей.
 *   1.2 — ещё скромнее: в одиночку можно и многое другое, ритуал лишь
 *   самый надёжный случай.
 * - CLOSE_ONES → 1: «с близкими» можно почти всё, признака, который отличал
 *   бы такое впечатление от остальных, нет — выдумывать его не будем.
 */
export function socialBoost(
  mode: SocialMode | null,
  e: { kind: ExperienceKind; category: LifeCategory },
): number {
  switch (mode) {
    case "NEW_PEOPLE":
      return e.kind === "EVENT" || e.category === "CONNECTION" ? 1.25 : 1;
    case "SOLO":
      return e.kind === "RITUAL" ? 1.2 : 1;
    default:
      return 1;
  }
}

/**
 * Подходит ли день под свободные окна человека (User.freeWindows).
 * Окна известны с точностью до «будни / выходные», поэтому и сравниваем
 * так же: будний день подходит при любом WEEKDAY_*, сб/вс — при любом
 * WEEKEND_*. Без окон — ничего не подсвечиваем: молчание не значит «никогда».
 */
export function dayFitsWindows(weekday: number, freeWindows: readonly FreeWindow[]): boolean {
  const weekend = weekday === 6 || weekday === 7;
  return freeWindows.some((w) => w.startsWith(weekend ? "WEEKEND_" : "WEEKDAY_"));
}

/** Поля впечатления, от которых зависит обход препятствия. */
export type ExperienceForScore = {
  durationMin: number | null;
  price: number | null;
  kind: ExperienceKind;
};

export type WhyCode = "LIKED_CATEGORY" | "IN_BUDGET" | "NEARBY" | "CURATED" | "FRESH";

export type Candidate = {
  experienceId: string;
  title: string;
  category: LifeCategory;
  price: number | null;
  currency: string;
  durationMin: number | null;
  distanceKm: number | null;
  location: string | null;
  imageUrl: string | null;
  sponsored: boolean;
  whyCode: WhyCode;
  whyCategory: LifeCategory | null;
};

export type SelectedStory = {
  /** id впечатления: нужен как стабильный ключ для узора на билете. */
  experienceId: string;
  title: string;
  category: LifeCategory;
  price: number | null;
  currency: string;
  location: string | null;
  imageUrl: string | null;
  whyCode: WhyCode;
  whyCategory: LifeCategory | null;
};

/** Подтверждение недели (Flow C → PRD 5.4): день, бюджет, компания, свидетель. */
export type Commitment = {
  plannedFor: string | null;
  budget: number | null;
  socialMode: SocialMode | null;
  companionName: string | null;
  witnessName: string | null;
};

/** Варианты дня для подтверждения: ближайшие дни недели + погода. */
export type DayOption = {
  /** ISO-дата YYYY-MM-DD. */
  date: string;
  /** 1=пн … 7=вс — для локализованной подписи. */
  weekday: number;
  weather: DayWeather | null;
  /** День попадает в свободные окна человека — тихая подсказка, не ограничение. */
  fits: boolean;
};

export type WeeklyView =
  | { kind: "choose"; weekStart: string; candidates: Candidate[] }
  /** История выбрана (или спасена) но день не подтверждён — экран commitment. */
  | { kind: "commit"; weekStart: string; story: SelectedStory; days: DayOption[] }
  /** История подтверждена — план недели с контекстной подсказкой. */
  | {
      kind: "committed";
      weekStart: string;
      story: SelectedStory;
      commitment: Commitment;
      weather: DayWeather | null;
      nudge: Nudge;
      /** Уже назван барьер — план под угрозой (Flow F). */
      atRisk: boolean;
    }
  /** День истории наступил — время спросить, как прошло (Flow G). */
  | { kind: "checkin"; weekStart: string; story: SelectedStory }
  /** История прожита и сохранена — воспоминание этой недели. */
  | { kind: "completed"; weekStart: string; story: SelectedStory; memory: MemoryView }
  /** Неделя перенесена без вины — тупика и упрёка здесь быть не должно. */
  | { kind: "deferred"; weekStart: string; story: SelectedStory };

/** Воспоминание для показа (архив и завершённая неделя). */
export type MemoryView = {
  id: string;
  weekLabel: string;
  title: string;
  note: string | null;
  emotion: Emotion | null;
  companion: string | null;
  category: LifeCategory | null;
  deferred: boolean;
  /** Своё фото, если человек его приложил. Иначе кадр рисуется узором. */
  photo: string | null;
};

/** Понедельник текущей недели в UTC (ADR-004), для weekly_stories.weekStart (@db.Date). */
export function weekStartUTC(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0=вс..6=сб
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function pickWhy(
  liked: boolean,
  category: LifeCategory,
  inBudget: boolean,
  nearby: boolean,
): { whyCode: WhyCode; whyCategory: LifeCategory | null } {
  if (liked) return { whyCode: "LIKED_CATEGORY", whyCategory: category };
  if (nearby) return { whyCode: "NEARBY", whyCategory: null };
  if (inBudget) return { whyCode: "IN_BUDGET", whyCategory: null };
  return { whyCode: "CURATED", whyCategory: null };
}

/**
 * Дни для выбора: от сегодня до конца недели (вс), минимум 3 варианта —
 * чтобы в четверг-воскресенье выбор не схлопывался в один день.
 */
function buildDayOptions(
  byDate: Map<string, DayWeather>,
  freeWindows: readonly FreeWindow[] = [],
): DayOption[] {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dow = start.getUTCDay() === 0 ? 7 : start.getUTCDay(); // 1=пн..7=вс
  const untilSunday = 7 - dow + 1; // включая сегодня
  const count = Math.min(7, Math.max(3, untilSunday));

  const days: DayOption[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    days.push({
      date,
      weekday,
      weather: byDate.get(date) ?? null,
      fits: dayFitsWindows(weekday, freeWindows),
    });
  }
  return days;
}

export async function getWeeklyView(
  userId: string,
  locale: string = DEFAULT_LOCALE,
): Promise<WeeklyView> {
  const weekStart = weekStartUTC();
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  // Уже выбранная история недели?
  const existing = await prisma.weeklyStory.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    include: { experience: true, memory: true },
  });
  if (existing?.experience) {
    const e = existing.experience;
    const text = localizeExperience(e, locale);
    const whyCode = (existing.whyExplanation as WhyCode) || "CURATED";
    const story: SelectedStory = {
      experienceId: e.id,
      title: text.title,
      category: e.category,
      price: e.price,
      currency: e.currency,
      location: text.location,
      imageUrl: e.imageUrl,
      whyCode,
      // Для LIKED_CATEGORY «понравившаяся» категория = категория впечатления.
      whyCategory: whyCode === "LIKED_CATEGORY" ? e.category : null,
    };

    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { city: true, freeWindows: true },
    });
    const forecast = await getWeekForecast(owner?.city ?? null, e.lat, e.lng);
    const byDate = new Map(forecast.map((d) => [d.date, d]));

    // История прожита — показываем воспоминание этой недели.
    if (existing.status === "COMPLETED" && existing.memory) {
      return {
        kind: "completed",
        weekStart: weekStartIso,
        story,
        memory: {
          id: existing.memory.id,
          weekLabel: weekStartIso,
          title: text.title,
          note: existing.memory.note,
          emotion: existing.memory.emotion,
          companion: existing.memory.companion,
          category: e.category,
          deferred: existing.memory.deferred,
          // Бакет приватный — наружу отдаём подписанную ссылку, не путь.
          photo: existing.memory.media[0] ? await signedPhotoUrl(existing.memory.media[0]) : null,
        },
      };
    }

    // Неделя перенесена без вины — отдельный спокойный вид.
    if (existing.status === "DEFERRED") {
      return { kind: "deferred", weekStart: weekStartIso, story };
    }

    const plannedIso = existing.plannedFor ? existing.plannedFor.toISOString().slice(0, 10) : null;

    // Подтверждена (или под угрозой) — план недели с подсказкой.
    if (existing.status === "COMMITTED" || existing.status === "AT_RISK") {
      const todayIso = new Date().toISOString().slice(0, 10);

      // День истории наступил или прошёл — пора спросить, как всё сложилось.
      // Не подгоняем и не упрекаем: на самом экране есть и «перенесено».
      if (plannedIso && plannedIso <= todayIso) {
        return { kind: "checkin", weekStart: weekStartIso, story };
      }

      return {
        kind: "committed",
        weekStart: weekStartIso,
        story,
        commitment: {
          plannedFor: plannedIso,
          budget: existing.budget,
          socialMode: existing.socialMode,
          companionName: existing.companionName,
          witnessName: existing.witnessName,
        },
        weather: plannedIso ? (byDate.get(plannedIso) ?? null) : null,
        nudge: buildNudge({
          plannedFor: plannedIso,
          forecast,
          socialMode: existing.socialMode,
          companionName: existing.companionName,
          todayIso,
        }),
        atRisk: existing.status === "AT_RISK",
      };
    }

    // SELECTED или RESCUED — день ещё не выбран, показываем commitment.
    const days: DayOption[] = buildDayOptions(byDate, owner?.freeWindows ?? []);
    return { kind: "commit", weekStart: weekStartIso, story, days };
  }

  const [user, prefs, experiences, reactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        budgetMax: true,
        city: true,
        radiusKm: true,
        mainBarrier: true,
        noveltyRatio: true,
        socialMode: true,
      },
    }),
    prisma.preference.findMany({
      where: { userId, sentiment: { in: ["LIKE", "DISLIKE"] } },
      select: { category: true, sentiment: true },
    }),
    prisma.experience.findMany({
      where: {
        ...liveExperienceWhere(),
        // «Не интересно» в ленте — значит не предлагать и как историю недели,
        // иначе свайп влево ничего не менял бы.
        reactions: { none: { userId, liked: false } },
      },
      // Берём каталог целиком: он курируемый и небольшой (ADR-006), а срез
      // без orderBy отрезал бы произвольную часть — например, все ритуалы.
      take: 500,
    }),
    prisma.experienceReaction.findMany({
      where: { userId, liked: true },
      select: { experienceId: true },
    }),
  ]);

  const likedExperiences = new Set(reactions.map((r) => r.experienceId));

  const liked = new Set<LifeCategory>(
    prefs.filter((p) => p.sentiment === "LIKE").map((p) => p.category),
  );
  const disliked = new Set<LifeCategory>(
    prefs.filter((p) => p.sentiment === "DISLIKE").map((p) => p.category),
  );
  const noveltyRatio = user?.noveltyRatio ?? 30;
  const socialMode = user?.socialMode ?? null;
  const budgetMax = user?.budgetMax ?? null;
  const radiusKm = user?.radiusKm ?? null;
  const userCity = user?.city ?? null;
  const mainBarrier = user?.mainBarrier ?? null;

  const scored = experiences
    .map((e) => {
      const isLiked = liked.has(e.category);
      const isDisliked = disliked.has(e.category);
      const inBudget = budgetMax == null || e.price == null || e.price <= budgetMax;
      const nearby =
        (radiusKm == null || e.distanceKm == null || e.distanceKm <= radiusKm) &&
        (userCity == null || e.city == null || e.city === userCity);

      const relevance =
        (isLiked ? 2 : unfamiliarRelevance(noveltyRatio)) * preferenceWeight(isLiked, isDisliked);
      const feasibility = inBudget ? 1 : 0.3;
      const proximity = nearby ? 1 : 0.6;
      // Прямой лайк в ленте — самый честный сигнал интереса, сильнее чем
      // совпадение по категории: человек сказал «да» именно этому событию.
      const swipedRight = likedExperiences.has(e.id) ? 1.8 : 1;
      // Человек сам назвал, что ему мешает — поднимаем то, что это обходит.
      const barrier = barrierBoost(mainBarrier, e);
      // Предпочитаемый формат — скромно и только по честному признаку.
      const social = socialBoost(socialMode, e);
      // Детерминированный джиттер по id — стабильный порядок в течение недели.
      const jitter = (parseInt(e.id.replace(/\D/g, "").slice(0, 4) || "0", 10) % 17) / 100;
      const score = relevance * feasibility * proximity * swipedRight * barrier * social + jitter;

      return { e, score, isLiked, ...pickWhy(isLiked, e.category, inBudget, nearby) };
    })
    .sort((a, b) => b.score - a.score);

  // Портфель: разнообразие категорий, затем добор.
  //
  // Отдельно ограничиваем события: три события в выборе недели означали бы,
  // что вся неделя упирается в билеты, погоду и деньги. Пусть максимум одно —
  // остальное вызовы и ритуалы, доступные в любую неделю.
  //
  // Новизна: часть мест держим за незнакомыми категориями (noveltySlots).
  // Это ограничение только на первых двух проходах — если незнакомого
  // в каталоге не хватает, места достаются любимому, а не пустуют.
  // Пока любимых категорий нет, всё незнакомое и ограничение не действует.
  const picked: typeof scored = [];
  const usedCategories = new Set<LifeCategory>();
  let events = 0;
  let familiar = 0;
  const maxFamiliar = CANDIDATES - noveltySlots(noveltyRatio);

  const canTake = (s: (typeof scored)[number]) =>
    s.e.kind !== "EVENT" || events < MAX_EVENT_CANDIDATES;
  const familiarRoom = (s: (typeof scored)[number]) => !s.isLiked || familiar < maxFamiliar;
  const take = (s: (typeof scored)[number]) => {
    picked.push(s);
    usedCategories.add(s.e.category);
    if (s.e.kind === "EVENT") events += 1;
    if (s.isLiked) familiar += 1;
  };

  for (const s of scored) {
    if (picked.length >= CANDIDATES) break;
    if (usedCategories.has(s.e.category) || !canTake(s) || !familiarRoom(s)) continue;
    take(s);
  }
  // Добор без учёта категории, но лимиты на события и знакомое держим.
  for (const s of scored) {
    if (picked.length >= CANDIDATES) break;
    if (picked.includes(s) || !canTake(s) || !familiarRoom(s)) continue;
    take(s);
  }
  // Незнакомого не хватило — добираем знакомым, лимит на события держим.
  for (const s of scored) {
    if (picked.length >= CANDIDATES) break;
    if (picked.includes(s) || !canTake(s)) continue;
    take(s);
  }
  // Крайний случай: в каталоге не осталось ничего, кроме событий. Лучше
  // показать три события, чем пустой экран выбора.
  for (const s of scored) {
    if (picked.length >= CANDIDATES) break;
    if (picked.includes(s)) continue;
    take(s);
  }

  const candidates: Candidate[] = picked.map((s) => {
    // Отбор идёт по цене, длительности и категории — они от языка не зависят,
    // поэтому переводим только то, что дошло до экрана.
    const text = localizeExperience(s.e, locale);
    return {
      experienceId: s.e.id,
      title: text.title,
      category: s.e.category,
      price: s.e.price,
      currency: s.e.currency,
      durationMin: s.e.durationMin,
      distanceKm: s.e.distanceKm,
      location: text.location,
      imageUrl: s.e.imageUrl,
      sponsored: s.e.sponsored,
      whyCode: s.whyCode,
      whyCategory: s.whyCategory,
    };
  });

  return { kind: "choose", weekStart: weekStartIso, candidates };
}
