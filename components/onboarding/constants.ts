import type { ExperienceKind, LifeCategory } from "@/generated/prisma/enums";

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
 * Тексты (title/note/meta) берутся из messages по id.
 *
 * Половина проб — вызовы и ритуалы, а не события: с первых экранов должно
 * быть видно, что это не афиша города. Покажем только концерты — человек
 * и ждать потом будет только концертов.
 */
export const ONBOARDING_PROBES: ReadonlyArray<{
  id: string;
  category: LifeCategory;
  kind: ExperienceKind;
}> = [
  { id: "climb", category: "CHALLENGE", kind: "EVENT" },
  { id: "call", category: "CONNECTION", kind: "CHALLENGE" },
  { id: "kayak", category: "NATURE", kind: "EVENT" },
  { id: "film", category: "CULTURE", kind: "RITUAL" },
  { id: "organ", category: "CULTURE", kind: "EVENT" },
  { id: "alone", category: "CHALLENGE", kind: "CHALLENGE" },
  { id: "pottery", category: "JOY", kind: "EVENT" },
  { id: "letter", category: "DISCOVERY", kind: "RITUAL" },
  { id: "dinner", category: "CONNECTION", kind: "EVENT" },
  { id: "cold", category: "CHALLENGE", kind: "CHALLENGE" },
  { id: "rooftop", category: "DISCOVERY", kind: "EVENT" },
  { id: "help", category: "CONTRIBUTION", kind: "CHALLENGE" },
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
