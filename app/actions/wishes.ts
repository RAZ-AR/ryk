"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { structureWish, type StructuredWish } from "@/lib/ai/structureWish";
import { prisma } from "@/lib/prisma";

/*
 * Wishlist (Flow B): разобрать желание через Claude, сохранить, скрыть.
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
