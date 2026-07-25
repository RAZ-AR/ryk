"use server";

import { revalidatePath } from "next/cache";
import type { SocialMode } from "@/generated/prisma/enums";
import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";
import { weekStartUTC } from "@/lib/engine/weekly";
import { prisma } from "@/lib/prisma";

/*
 * Commitment (PRD 5.4): день, бюджет, формат компании, свидетель.
 * Мягкое обязательство — менять и отменять можно без штрафа (14-brand-and-copy).
 */

const SOCIAL_MODES: readonly SocialMode[] = ["SOLO", "CLOSE_ONES", "NEW_PEOPLE"];

export type CommitInput = {
  /** ISO-дата YYYY-MM-DD из предложенных вариантов. */
  plannedFor: string;
  budget: number | null;
  socialMode: SocialMode | null;
  companionName: string | null;
  witnessName: string | null;
};

export type CommitResult = { ok: true } | { ok: false; reason: string };

export async function commitStory(input: CommitInput): Promise<CommitResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  // Дата приходит от клиента — валидируем формат и разумный диапазон.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.plannedFor)) {
    return { ok: false, reason: "bad_date" };
  }
  const planned = new Date(`${input.plannedFor}T12:00:00.000Z`);
  if (Number.isNaN(planned.getTime())) return { ok: false, reason: "bad_date" };

  const weekStart = weekStartUTC();
  const maxAhead = new Date(weekStart);
  maxAhead.setUTCDate(maxAhead.getUTCDate() + 14);
  if (planned < weekStart || planned > maxAhead) return { ok: false, reason: "date_out_of_range" };

  const socialMode =
    input.socialMode && SOCIAL_MODES.includes(input.socialMode) ? input.socialMode : null;
  const budget =
    typeof input.budget === "number" && input.budget > 0 ? Math.round(input.budget) : null;
  const companionName = input.companionName?.trim()
    ? input.companionName.trim().slice(0, 80)
    : null;
  const witnessName = input.witnessName?.trim() ? input.witnessName.trim().slice(0, 80) : null;

  try {
    // Обновляем только свою историю текущей недели.
    const updated = await prisma.weeklyStory.updateMany({
      where: { userId: session.userId, weekStart },
      data: {
        plannedFor: planned,
        budget,
        socialMode,
        companionName,
        witnessName,
        status: "COMMITTED",
      },
    });
    if (updated.count === 0) return { ok: false, reason: "no_story" };
  } catch {
    return { ok: false, reason: "db_error" };
  }

  // Насколько заранее человек планирует — сигнал качества сопровождения.
  const daysAhead = Math.round((planned.getTime() - Date.now()) / 86_400_000);
  await track(session.userId, {
    name: "commitment_confirmed",
    props: { daysAhead, hasCompanion: companionName != null, hasWitness: witnessName != null },
  });

  revalidatePath("/");
  return { ok: true };
}

/** Вернуть историю в состояние выбора — «поменять без штрафа». */
export async function uncommitStory(): Promise<CommitResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  try {
    await prisma.weeklyStory.updateMany({
      where: { userId: session.userId, weekStart: weekStartUTC() },
      data: { status: "SELECTED" },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}
