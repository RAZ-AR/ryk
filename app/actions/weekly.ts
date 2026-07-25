"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
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

  // Проверяем, что кандидат действительно из недельной выборки этого пользователя.
  const view = await getWeeklyView(session.userId);
  if (view.kind !== "choose") return { ok: true }; // история недели уже есть
  const candidate = view.candidates.find((c) => c.experienceId === experienceId);
  if (!candidate) return { ok: false, reason: "not_a_candidate" };

  const weekStart = weekStartUTC();

  try {
    await prisma.weeklyStory.upsert({
      where: { userId_weekStart: { userId: session.userId, weekStart } },
      update: { experienceId, whyExplanation: candidate.whyCode, status: "SELECTED" },
      create: {
        userId: session.userId,
        weekStart,
        experienceId,
        whyExplanation: candidate.whyCode,
        status: "SELECTED",
      },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}
