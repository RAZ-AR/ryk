import type { BarrierType, Emotion, LifeCategory } from "@/generated/prisma/enums";

/*
 * Единственный список аналитических событий (ryk_docs/11-analytics-and-kpis.md).
 *
 * Почему всё в одном файле: воронка из 8 шагов имеет смысл, только если
 * названия событий не разъезжаются по кодовой базе. Новое событие —
 * сначала сюда, потом в вызов.
 *
 * ⚠️ ПРИВАТНОСТЬ (12-technical-architecture): в свойствах НЕТ персональных
 * данных — ни текстов желаний, ни имён спутников и свидетелей, ни заметок
 * из воспоминаний. Только категории, коды и счётчики. Чувствительное живёт
 * в БД, продуктовая аналитика — отдельно.
 */

export type RykEvent =
  // ── Core funnel ──────────────────────────────────────────────
  | {
      name: "onboarding_completed";
      props: {
        categories: number;
        hasBudget: boolean;
        /* Необязательные шаги: по ним видно, не слишком ли длинным вышел онбординг. */
        toldMoment: boolean;
        toldPostponed: boolean;
        namedBarrier: boolean;
        windows: number;
        swipes: number;
      };
    }
  | { name: "candidates_viewed"; props: { count: number } }
  | { name: "story_selected"; props: { category: LifeCategory; whyCode: string } }
  | {
      name: "commitment_confirmed";
      props: { daysAhead: number; hasCompanion: boolean; hasWitness: boolean };
    }
  | { name: "story_completed"; props: { emotion: Emotion | null; hasNote: boolean } }
  | { name: "memory_saved"; props: { deferred: boolean } }
  // ── Wishlist ─────────────────────────────────────────────────
  | { name: "wish_added"; props: { category: LifeCategory; source: "ai" | "heuristic" } }
  // ── Guardrail-метрики: сигналы трения и давления ─────────────
  | { name: "barrier_named"; props: { barrier: BarrierType } }
  | { name: "rescue_applied"; props: { barrier: BarrierType | null } }
  /** % недель, когда пользователь выбирает отдых — прямой guardrail из 11-analytics. */
  | { name: "week_deferred"; props: { stage: "plan" | "checkin" } }
  // ── Личный кабинет (владение данными, CLAUDE.md постулат №6) ─
  | { name: "account_deleted"; props: Record<string, never> }
  // ── Логистика подтверждённой истории ──────────────────────
  | { name: "calendar_added"; props: { method: "ics" | "google" } }
  | { name: "invite_initiated"; props: { role: "companion" | "witness" } }
  | { name: "invite_accepted"; props: { role: "companion" | "witness" } }
  | { name: "invite_declined"; props: { role: "companion" | "witness" } }
  // ── Лента впечатлений ─────────────────────────────────────
  | { name: "experience_reacted"; props: { category: LifeCategory; liked: boolean } };

export type RykEventName = RykEvent["name"];
