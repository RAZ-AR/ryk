"use server";

import { revalidatePath } from "next/cache";
import type { Emotion } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth/session";
import { weekStartUTC } from "@/lib/engine/weekly";
import { prisma } from "@/lib/prisma";

/*
 * Completion & Memory (Flow G, PRD 5.8).
 *
 * Максимум три вопроса: получилось? какое чувство? одна фраза.
 * Больше не спрашиваем — сохранение впечатления не должно превращаться
 * в отчётность (07-ai-companion, Memory Keeper).
 */

const EMOTIONS: readonly Emotion[] = ["DELIGHT", "CALM", "PRIDE", "CLOSENESS"];

export type CompleteInput = {
  emotion: Emotion | null;
  /** Одна фраза — необязательна. */
  note: string | null;
};

export type CompleteResult = { ok: true } | { ok: false; reason: string };

/** «Сделано» — история прожита, сохраняем воспоминание. */
export async function completeStory(input: CompleteInput): Promise<CompleteResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const weekStart = weekStartUTC();
  const story = await prisma.weeklyStory.findUnique({
    where: { userId_weekStart: { userId: session.userId, weekStart } },
  });
  if (!story) return { ok: false, reason: "no_story" };

  const emotion = input.emotion && EMOTIONS.includes(input.emotion) ? input.emotion : null;
  const note = input.note?.trim() ? input.note.trim().slice(0, 280) : null;

  try {
    await prisma.$transaction([
      prisma.weeklyStory.update({
        where: { id: story.id },
        data: { status: "COMPLETED" },
      }),
      // Воспоминание одно на историю — повторное «сделано» не плодит дубли.
      prisma.memory.upsert({
        where: { weeklyStoryId: story.id },
        update: { emotion, note, completedAt: new Date(), deferred: false },
        create: {
          weeklyStoryId: story.id,
          emotion,
          note,
          companion: story.companionName,
          completedAt: new Date(),
          deferred: false,
        },
      }),
      prisma.intervention.create({
        data: {
          userId: session.userId,
          weeklyStoryId: story.id,
          type: "CHECK_IN",
          reason: "story_completed",
          content: emotion ? `emotion:${emotion}` : "no_emotion",
          sentAt: new Date(),
          outcome: "ACTED",
        },
      }),
    ]);
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * «Перенесено» — не провал. Сохраняем как отложенное воспоминание,
 * чтобы неделя осталась в архиве честно, но без вины (PRD 5.9).
 */
export async function deferStory(): Promise<CompleteResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const weekStart = weekStartUTC();
  const story = await prisma.weeklyStory.findUnique({
    where: { userId_weekStart: { userId: session.userId, weekStart } },
  });
  if (!story) return { ok: false, reason: "no_story" };

  try {
    await prisma.$transaction([
      prisma.weeklyStory.update({
        where: { id: story.id },
        data: { status: "DEFERRED" },
      }),
      prisma.memory.upsert({
        where: { weeklyStoryId: story.id },
        update: { deferred: true },
        create: { weeklyStoryId: story.id, deferred: true },
      }),
    ]);
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}
