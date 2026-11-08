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
        /** Сколько черт сохранено — выбранных и найденных в рассказе. Сами черты не шлём. */
        traits: number;
      };
    }
  /** Экран-вдохновение показан: сравнивая с joy_traits_picked, видно, откликаются ли мини-билеты. */
  | { name: "onboarding_inspiration_seen"; props: Record<string, never> }
  /** Сколько мини-билетов человек отметил «про себя». Только число — черты про человека. */
  | { name: "joy_traits_picked"; props: { count: number } }
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
  /**
   * Назначен срок. `horizon` показывает, на каком расстоянии человек готов
   * держать желание: если `thisWeek` почти не встречается, список копится,
   * но в прожитое не превращается — а это и есть провал продукта.
   */
  | {
      name: "wish_scheduled";
      props: { horizon: "someday" | "thisMonth" | "thisWeek"; hasDay: boolean };
    }
  /** Прожито мимо недельного цикла — сам факт того, что так бывает. */
  | { name: "wish_realized"; props: Record<string, never> }
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
  | { name: "experience_reacted"; props: { category: LifeCategory; liked: boolean } }
  // ── «Лист дня» (22-daily-joy-plan, фаза 5) ────────────────
  /**
   * Лист показан. Только факты о полноте листа — была ли погода и сколько
   * строк «Скоро»: по ним видно, часто ли лист выходит пустым. Ни города,
   * ни текста радости, ни названий событий — это уже про человека.
   */
  | { name: "day_leaf_viewed"; props: { hasWeather: boolean; soonCount: number } };

export type RykEventName = RykEvent["name"];
