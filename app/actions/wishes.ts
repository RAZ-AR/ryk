"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";
import { structureWish, type StructuredWish } from "@/lib/ai/structureWish";
import { weekStartUTC } from "@/lib/engine/weekly";
import { localizeExperience } from "@/lib/i18n/experience";
import { prisma } from "@/lib/prisma";

/*
 * Wishlist (Flow B): разобрать желание через Claude, сохранить, скрыть,
 * назначить срок и отметить прожитым.
 */

export type StructureResult =
  { ok: true; structured: StructuredWish } | { ok: false; reason: string };

/** Шаг «Ryk понял так» — разбор без сохранения. */
export async function analyzeWish(text: string): Promise<StructureResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };
  const trimmed = text.trim();
  if (trimmed.length < 3) return { ok: false, reason: "too_short" };

  const structured = await structureWish(trimmed.slice(0, 500));
  return { ok: true, structured };
}

export type AddResult = { ok: true } | { ok: false; reason: string };

/** Сохранить желание (после подтверждения разбора). */
export async function addWish(text: string, structured: StructuredWish): Promise<AddResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };
  const trimmed = text.trim();
  if (trimmed.length < 3) return { ok: false, reason: "too_short" };

  try {
    await prisma.wish.create({
      data: {
        userId: session.userId,
        text: trimmed.slice(0, 500),
        category: structured.category,
        budget: structured.budget,
        status: structured.timing,
      },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  // Отмечаем, сработал ли AI или эвристика — иначе не поймём, стоит ли
  // качество разбора включённого ключа (ADR-008).
  await track(session.userId, {
    name: "wish_added",
    props: {
      category: structured.category,
      source: process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY ? "ai" : "heuristic",
    },
  });

  revalidatePath("/");
  return { ok: true };
}

/*
 * --- Срок желания ---
 *
 * Горизонтов три, и точность растёт по мере приближения:
 *
 *  - `someday` / `thisMonth` — это про само желание, живут в `Wish.status`
 *    и вешаются на сколько угодно желаний сразу;
 *  - `thisWeek` — уже не про желание, а про неделю: оно становится историей
 *    недели (`weekly_story`), и такое желание ровно одно.
 *
 * Ограничение держит не интерфейс, а схема: у `weekly_story` уникальный
 * ключ `(userId, weekStart)`. Поэтому «одна неделя — одна история» нельзя
 * обойти ни гонкой запросов, ни второй вкладкой.
 */
export type WishHorizon = "someday" | "thisMonth" | "thisWeek";

/*
 * Причины перечислены поимённо, а не `string`: иначе `reason === "week_taken"`
 * не сужает объединение, и `takenTitle` не достать без приведения типа.
 */
export type ScheduleResult =
  | { ok: true }
  | { ok: false; reason: "week_taken"; takenTitle: string }
  | { ok: false; reason: "no_session" | "not_found" | "bad_day" | "db_error" };

export async function scheduleWish(
  wishId: string,
  horizon: WishHorizon,
  /** День внутри недели, `YYYY-MM-DD`. Только для `thisWeek`. */
  day?: string | null,
  /** Занятую неделю перезаписываем только по явному согласию человека. */
  replace = false,
): Promise<ScheduleResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const wish = await prisma.wish.findFirst({
    where: { id: wishId, userId: session.userId },
    select: { id: true },
  });
  if (!wish) return { ok: false, reason: "not_found" };

  if (horizon !== "thisWeek") {
    try {
      await prisma.wish.update({
        where: { id: wish.id },
        data: { status: horizon === "thisMonth" ? "THIS_MONTH" : "SOMEDAY" },
      });
    } catch {
      return { ok: false, reason: "db_error" };
    }
    revalidatePath("/");
    return { ok: true };
  }

  const weekStart = weekStartUTC();
  const existing = await prisma.weeklyStory.findUnique({
    where: { userId_weekStart: { userId: session.userId, weekStart } },
    select: {
      wishId: true,
      wish: { select: { text: true } },
      experience: {
        select: { title: true, description: true, location: true, translations: true },
      },
    },
  });

  /*
   * Занятую неделю не перезаписываем молча. `selectStory` в этом случае
   * тихо возвращает `ok`, и для ленты это уместно — там человек и так
   * видит выбранную историю. Здесь он смотрит в список желаний и о неделе
   * не думает: подменить её без спроса значило бы отменить его же выбор.
   */
  if (existing && existing.wishId !== wish.id && !replace) {
    const locale = await getLocale();
    const takenTitle = existing.experience
      ? localizeExperience(existing.experience, locale).title
      : (existing.wish?.text ?? "");
    return { ok: false, reason: "week_taken", takenTitle };
  }

  // Дата приходит из своего же списка дней недели, но верим ей только после
  // проверки: `new Date("что угодно")` даёт Invalid Date, а он уходит в БД
  // как ошибка драйвера, а не как понятный отказ.
  let plannedFor: Date | null = null;
  if (day) {
    const parsed = new Date(`${day}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return { ok: false, reason: "bad_day" };
    plannedFor = parsed;
  }

  try {
    await prisma.weeklyStory.upsert({
      where: { userId_weekStart: { userId: session.userId, weekStart } },
      update: { wishId: wish.id, experienceId: null, plannedFor, status: "SELECTED" },
      create: {
        userId: session.userId,
        weekStart,
        wishId: wish.id,
        plannedFor,
        status: "SELECTED",
        /*
         * «Почему» здесь пустое, и это не пропуск: объяснение обязательно
         * у рекомендации (PRD §7), а человек выбрал своё желание сам —
         * приписывать сюда наш довод было бы враньём.
         */
      },
    });
    // Желание уехало в неделю — в списке ему место среди ближайшего.
    await prisma.wish.update({ where: { id: wish.id }, data: { status: "SOON" } });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  await track(session.userId, { name: "wish_scheduled", props: { horizon, hasDay: Boolean(day) } });
  revalidatePath("/");
  return { ok: true };
}

/*
 * «Случилось» — для желания, которое человек прожил сам, мимо недельного
 * цикла. Если желание стало историей недели, интерфейс ведёт в чек-ин:
 * там появляется воспоминание, и второй путь к тому же итогу нам не нужен.
 */
export async function realizeWish(wishId: string): Promise<AddResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  try {
    const updated = await prisma.wish.updateMany({
      where: { id: wishId, userId: session.userId },
      data: { status: "REALIZED" },
    });
    if (updated.count === 0) return { ok: false, reason: "not_found" };
  } catch {
    return { ok: false, reason: "db_error" };
  }

  await track(session.userId, { name: "wish_realized", props: {} });
  revalidatePath("/");
  return { ok: true };
}

/** Скрыть желание (мягко — не удаляем). */
export async function hideWish(wishId: string): Promise<AddResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  try {
    // Обновляем только своё желание.
    await prisma.wish.updateMany({
      where: { id: wishId, userId: session.userId },
      data: { status: "HIDDEN" },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}
