import type { ExperienceKind, LifeCategory } from "@/generated/prisma/enums";
import type { CurrencyCode } from "@/lib/cities";

/** Порядок категорий в сетке онбординга (совпадает с хендоффом). */
export const ONBOARDING_CATEGORIES: ReadonlyArray<{ id: LifeCategory; num: string }> = [
  { id: "NATURE", num: "I" },
  { id: "CULTURE", num: "II" },
  { id: "DISCOVERY", num: "III" },
  { id: "MOVEMENT", num: "IV" },
  { id: "CONNECTION", num: "V" },
  { id: "JOY", num: "VI" },
  { id: "CHALLENGE", num: "VII" },
  { id: "REST", num: "VIII" },
  // Вклада в сетке не было, хотя в каталоге такие впечатления есть,
  // а completeOnboarding его молча отбрасывал — выбрать было нельзя.
  { id: "CONTRIBUTION", num: "IX" },
];

/**
 * Пробные идеи для свайпа — зонды вкуса, не реальные Experience.
 * Тексты (title/note/meta) берутся из messages по id; meta — только
 * длительность, а цена — здесь, в валюте города: человеку в Ереване
 * «1500 дин» говорит только то, что приложение не про него.
 *
 * Половина проб — вызовы и ритуалы, а не события: с первых экранов должно
 * быть видно, что это не афиша города. Покажем только концерты — человек
 * и ждать потом будет только концертов.
 */
export const ONBOARDING_PROBES: ReadonlyArray<{
  id: string;
  category: LifeCategory;
  kind: ExperienceKind;
  /** 0 — бесплатно. Армянские цены — порядок местных, а не пересчёт по курсу. */
  price: Record<CurrencyCode, number>;
}> = [
  { id: "climb", category: "CHALLENGE", kind: "EVENT", price: { RSD: 1500, AMD: 5000 } },
  { id: "call", category: "CONNECTION", kind: "CHALLENGE", price: { RSD: 0, AMD: 0 } },
  { id: "kayak", category: "NATURE", kind: "EVENT", price: { RSD: 2200, AMD: 8000 } },
  { id: "film", category: "CULTURE", kind: "RITUAL", price: { RSD: 0, AMD: 0 } },
  { id: "organ", category: "CULTURE", kind: "EVENT", price: { RSD: 1800, AMD: 6000 } },
  { id: "alone", category: "CHALLENGE", kind: "CHALLENGE", price: { RSD: 1500, AMD: 5000 } },
  { id: "pottery", category: "JOY", kind: "EVENT", price: { RSD: 3500, AMD: 12000 } },
  { id: "letter", category: "DISCOVERY", kind: "RITUAL", price: { RSD: 0, AMD: 0 } },
  { id: "dinner", category: "CONNECTION", kind: "EVENT", price: { RSD: 2600, AMD: 9000 } },
  { id: "cold", category: "CHALLENGE", kind: "CHALLENGE", price: { RSD: 0, AMD: 0 } },
  { id: "rooftop", category: "DISCOVERY", kind: "EVENT", price: { RSD: 0, AMD: 0 } },
  { id: "help", category: "CONTRIBUTION", kind: "CHALLENGE", price: { RSD: 0, AMD: 0 } },
];

/** Препятствия — порядок в UI. */
export const ONBOARDING_BARRIERS = [
  "NO_TIME",
  "TOO_EXPENSIVE",
  "NO_COMPANY",
  "FEAR",
  "NO_ENERGY",
] as const;

/** Свободные окна — порядок в UI. */
export const ONBOARDING_WINDOWS = [
  "WEEKDAY_MORNING",
  "WEEKDAY_EVENING",
  "WEEKEND_DAY",
  "WEEKEND_EVENING",
] as const;

/**
 * Бюджет на историю в валюте города. Для незнакомого города — динары, как
 * было до валют: каталог пока сербский, и сравнивать бюджет не с чем.
 */
export const ONBOARDING_BUDGET: Record<CurrencyCode, { low: number; mid: number }> = {
  RSD: { low: 1500, mid: 4000 },
  AMD: { low: 5000, mid: 15000 },
};
