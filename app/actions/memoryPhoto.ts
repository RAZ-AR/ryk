"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  MAX_PHOTO_BYTES,
  deleteMemoryPhoto,
  isPhotoStorageConfigured,
  uploadMemoryPhoto,
} from "@/lib/storage/memoryPhotos";

/*
 * Своё фото к воспоминанию (Flow G).
 *
 * Одно фото на воспоминание: «Плёнка» — про один кадр, а не про галерею.
 * Повторная загрузка заменяет прежнее и удаляет файл, чтобы в приватном
 * бакете не копился мусор, который человек уже не видит и не может стереть.
 */

export type PhotoResult = { ok: true } | { ok: false; reason: string };

export async function attachMemoryPhoto(formData: FormData): Promise<PhotoResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };
  if (!isPhotoStorageConfigured()) return { ok: false, reason: "storage_not_configured" };

  const memoryId = formData.get("memoryId");
  const file = formData.get("photo");
  if (typeof memoryId !== "string" || !(file instanceof File)) {
    return { ok: false, reason: "bad_request" };
  }
  if (file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, reason: "too_large" };

  // Воспоминание должно принадлежать этому человеку: server action —
  // публичный эндпоинт, id из формы сам по себе ничего не доказывает.
  const memory = await prisma.memory.findFirst({
    where: { id: memoryId, weeklyStory: { userId: session.userId } },
    select: { id: true, media: true },
  });
  if (!memory) return { ok: false, reason: "not_found" };

  const uploaded = await uploadMemoryPhoto(session.userId, memory.id, {
    bytes: await file.arrayBuffer(),
    type: file.type,
  });
  if (!uploaded.ok) return { ok: false, reason: uploaded.reason };

  const previous = memory.media[0];

  try {
    await prisma.memory.update({
      where: { id: memory.id },
      data: { media: [uploaded.path] },
    });
  } catch {
    // Запись не удалась — только что загруженный файл осиротел бы.
    await deleteMemoryPhoto(uploaded.path);
    return { ok: false, reason: "db_error" };
  }

  if (previous) await deleteMemoryPhoto(previous);

  revalidatePath("/");
  return { ok: true };
}

/** Убрать фото — человек владеет своими данными (PRD §8). */
export async function removeMemoryPhoto(memoryId: string): Promise<PhotoResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const memory = await prisma.memory.findFirst({
    where: { id: memoryId, weeklyStory: { userId: session.userId } },
    select: { id: true, media: true },
  });
  if (!memory) return { ok: false, reason: "not_found" };

  try {
    await prisma.memory.update({ where: { id: memory.id }, data: { media: [] } });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  for (const path of memory.media) await deleteMemoryPhoto(path);

  revalidatePath("/");
  return { ok: true };
}
