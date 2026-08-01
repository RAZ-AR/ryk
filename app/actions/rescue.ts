"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import type { BarrierType } from "@/generated/prisma/enums";
import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";
import { weekStartUTC } from "@/lib/engine/weekly";
import { getRescueOptions, type RescueOption } from "@/lib/engine/rescue";
import { prisma } from "@/lib/prisma";

/*
 * Rescue Mission (Flow F): барьер → альтернативы → спасённая неделя,
 * либо честный перенос без вины. Ни один путь не помечает неделю провалом.
 */

const BARRIERS: readonly BarrierType[] = [
  "WEATHER",
  "NO_ENERGY",
  "TOO_EXPENSIVE",
  "NOT_ALONE",
  "CHANGED_MIND",
];

export type RescueResult = { ok: true; options: RescueOption[] } | { ok: false; reason: string };

/** Пользователь назвал барьер — фиксируем и подбираем спасательные варианты. */
export async function startRescue(barrier: BarrierType): Promise<RescueResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };
  if (!BARRIERS.includes(barrier)) return { ok: false, reason: "bad_barrier" };

  const weekStart = weekStartUTC();
  const story = await prisma.weeklyStory.findUnique({
    where: { userId_weekStart: { userId: session.userId, weekStart } },
    include: { experience: true },
  });
  if (!story) return { ok: false, reason: "no_story" };

  const options = await getRescueOptions({
    userId: session.userId,
    barrier,
    currentExperienceId: story.experienceId,
    currentPrice: story.experience?.price ?? null,
    currentDurationMin: story.experience?.durationMin ?? null,
    currentCategory: story.experience?.category ?? null,
    locale: await getLocale(),
  });

  try {
    await prisma.$transaction([
      prisma.weeklyStory.update({
        where: { id: story.id },
        data: { barrier, status: "AT_RISK" },
      }),
      // Фиксируем разговор о барьере — пригодится для guardrail-метрик (11-analytics).
      prisma.intervention.create({
        data: {
          userId: session.userId,
          weeklyStoryId: story.id,
          type: "BARRIER_PROMPT",
          reason: `barrier:${barrier}`,
          content: `Предложены ${options.length} варианта спасения`,
          sentAt: new Date(),
          outcome: "PENDING",
        },
      }),
    ]);
  } catch {
    return { ok: false, reason: "db_error" };
  }

  await track(session.userId, { name: "barrier_named", props: { barrier } });

  revalidatePath("/");
  return { ok: true, options };
}

export type ApplyResult = { ok: true } | { ok: false; reason: string };

/** Заменить историю недели спасательным вариантом. */
export async function applyRescue(experienceId: string): Promise<ApplyResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const weekStart = weekStartUTC();
  const story = await prisma.weeklyStory.findUnique({
    where: { userId_weekStart: { userId: session.userId, weekStart } },
  });
  if (!story) return { ok: false, reason: "no_story" };

  // Подтверждаем, что вариант реально из спасательной выборки — не доверяем клиенту.
  const existing = await prisma.experience.findUnique({
    where: { id: experienceId },
    select: { id: true },
  });
  if (!existing) return { ok: false, reason: "unknown_experience" };

  try {
    await prisma.$transaction([
      prisma.weeklyStory.update({
        where: { id: story.id },
        data: {
          experienceId,
          status: "RESCUED",
          // План меняется — прежний день больше не актуален.
          plannedFor: null,
        },
      }),
      prisma.intervention.create({
        data: {
          userId: session.userId,
          weeklyStoryId: story.id,
          type: "RESCUE",
          reason: `barrier:${story.barrier ?? "unknown"}`,
          content: `Неделя спасена: ${experienceId}`,
          sentAt: new Date(),
          outcome: "ACTED",
        },
      }),
    ]);
  } catch {
    return { ok: false, reason: "db_error" };
  }

  await track(session.userId, { name: "rescue_applied", props: { barrier: story.barrier } });

  revalidatePath("/");
  return { ok: true };
}

/** «Пропустить неделю без вины» — это тоже нормальный исход (PRD 5.7). */
export async function deferWeek(): Promise<ApplyResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  try {
    await prisma.weeklyStory.updateMany({
      where: { userId: session.userId, weekStart: weekStartUTC() },
      data: { status: "DEFERRED" },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  await track(session.userId, { name: "week_deferred", props: { stage: "plan" } });

  revalidatePath("/");
  return { ok: true };
}
