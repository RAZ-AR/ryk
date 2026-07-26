"use server";

import { revalidatePath } from "next/cache";
import {
  isConciergeEnabled,
  isConciergeSignedIn,
  signInConcierge,
  signOutConcierge,
} from "@/lib/concierge/auth";
import { parseExperienceInput } from "@/lib/concierge/experienceInput";
import { prisma } from "@/lib/prisma";

/*
 * Действия внутреннего инструмента куратора (Фаза 11, ADR-006).
 *
 * Каждое действие само проверяет доступ: server action — это публичный
 * HTTP-эндпоинт, и то, что страница отрисовалась только вошедшему,
 * ничего не гарантирует.
 */

export type ConciergeResult = { ok: true } | { ok: false; reason: string };

export async function conciergeSignIn(formData: FormData): Promise<ConciergeResult> {
  if (!isConciergeEnabled()) return { ok: false, reason: "disabled" };
  const token = formData.get("token");
  if (typeof token !== "string") return { ok: false, reason: "bad_token" };

  const ok = await signInConcierge(token);
  if (!ok) return { ok: false, reason: "bad_token" };

  revalidatePath("/concierge");
  return { ok: true };
}

/** Вызывается как `<form action>` — поэтому без возвращаемого значения. */
export async function conciergeSignOut(): Promise<void> {
  await signOutConcierge();
  revalidatePath("/concierge");
}

export async function createExperience(formData: FormData): Promise<ConciergeResult> {
  if (!(await isConciergeSignedIn())) return { ok: false, reason: "forbidden" };

  const parsed = parseExperienceInput(formData);
  if (!parsed.ok) return { ok: false, reason: parsed.errors.join(",") };

  try {
    await prisma.experience.create({
      // Заведено куратором вручную — это и есть источник CURATED (ADR-006).
      data: { ...parsed.value, source: "CURATED" },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/concierge");
  // Каталог кандидатов на главной должен увидеть новое событие сразу.
  revalidatePath("/");
  return { ok: true };
}

/** Снять с показа / вернуть. Без удаления: на событие ссылаются прошлые истории. */
export async function setExperienceArchived(
  experienceId: string,
  archived: boolean,
): Promise<ConciergeResult> {
  if (!(await isConciergeSignedIn())) return { ok: false, reason: "forbidden" };

  try {
    await prisma.experience.update({
      where: { id: experienceId },
      data: { archivedAt: archived ? new Date() : null },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/concierge");
  revalidatePath("/");
  return { ok: true };
}
