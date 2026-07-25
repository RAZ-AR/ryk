import type { LifeCategory } from "@/generated/prisma/enums";

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
];

/**
 * Пробные идеи для свайпа — зонды вкуса, не реальные Experience.
 * Тексты (title/note/meta) берутся из messages по id.
 */
export const ONBOARDING_PROBES: ReadonlyArray<{ id: string; category: LifeCategory }> = [
  { id: "climb", category: "CHALLENGE" },
  { id: "kayak", category: "NATURE" },
  { id: "organ", category: "CULTURE" },
  { id: "pottery", category: "JOY" },
  { id: "dinner", category: "CONNECTION" },
  { id: "rooftop", category: "DISCOVERY" },
];
