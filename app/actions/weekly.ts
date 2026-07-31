"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";
import { liveExperienceWhere } from "@/lib/engine/liveExperiences";
import { getWeeklyView, weekStartUTC } from "@/lib/engine/weekly";
import { prisma } from "@/lib/prisma";

/*
 * Выбор истории недели (Flow C). Кандидат → weekly_story (SELECTED),
 * одна на пользователя в неделю (@@unique userId,weekStart).
 */

export type SelectResult = { ok: true } | { ok: false; reason: string };

export async function selectStory(experienceId: string): Promise<SelectResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  // Без языка: наружу отсюда уходят только id, категория и код «почему» —
  // текст карточки здесь никому не показывается, переводить нечего.
  const view = await getWeeklyView(session.userId);
  if (view.kind !== "choose") return { ok: true }; // история недели уже есть

  // Историей недели можно сделать не только один из трёх кандидатов, но и любое
  // событие из ленты на главном. Проверка остаётся, но по существу: событие
  // должно быть живым — не снято куратором и дата не прошла.
  const candidate = view.candidates.find((c) => c.experienceId === experienceId);
  const fromCatalog = candidate
    ? null
    : await prisma.experience.findFirst({
        where: { id: experienceId, ...liveExperienceWhere() },
        select: { category: true },
      });
  if (!candidate && !fromCatalog) return { ok: false, reason: "not_available" };

  // Кандидату «почему» посчитал движок; выбранному из ленты — CURATED:
  // человек выбрал сам, а не по нашей рекомендации, и врать об этом не нужно.
  const whyCode = candidate ? candidate.whyCode : "CURATED";
  const category = candidate ? candidate.category : fromCatalog!.category;
  const weekStart = weekStartUTC();

  try {
    await prisma.weeklyStory.upsert({
      where: { userId_weekStart: { userId: session.userId, weekStart } },
      update: { experienceId, whyExplanation: whyCode, status: "SELECTED" },
      create: {
        userId: session.userId,
        weekStart,
        experienceId,
        whyExplanation: whyCode,
        status: "SELECTED",
      },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  await track(session.userId, {
    name: "story_selected",
    props: { category, whyCode },
  });

  revalidatePath("/");
  return { ok: true };
}
