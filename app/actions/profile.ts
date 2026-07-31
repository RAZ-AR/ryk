"use server";

import { revalidatePath } from "next/cache";
import type { Locale, SocialMode } from "@/generated/prisma/enums";
import { track } from "@/lib/analytics/track";
import { clearSession, getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { deleteMemoryPhoto } from "@/lib/storage/memoryPhotos";

/*
 * Личный кабинет (CLAUDE.md постулат №6): профиль редактируем, память
 * (Preference) удаляема поштучно, аккаунт удаляем по-настоящему — не только
 * помечаем deletedAt, но и стираем то, что этим deletedAt должно закрыть.
 */

const LOCALES: readonly Locale[] = ["EN", "RU", "ES"];
const SOCIAL_MODES: readonly SocialMode[] = ["SOLO", "CLOSE_ONES", "NEW_PEOPLE"];

export type ProfileResult = { ok: true } | { ok: false; reason: string };

export type ProfileInput = {
  city: string | null;
  radiusKm: number;
  budgetMax: number | null;
  socialMode: SocialMode | null;
  locale: Locale;
  noveltyRatio: number;
  /** Разрешено ли боту писать первым (см. lib/engine/nudgeDelivery). */
  nudges: boolean;
};

export async function updateProfile(input: ProfileInput): Promise<ProfileResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  if (!LOCALES.includes(input.locale)) return { ok: false, reason: "bad_locale" };
  if (input.socialMode !== null && !SOCIAL_MODES.includes(input.socialMode)) {
    return { ok: false, reason: "bad_social_mode" };
  }
  if (!Number.isFinite(input.radiusKm) || input.radiusKm < 1 || input.radiusKm > 200) {
    return { ok: false, reason: "bad_radius" };
  }
  if (!Number.isFinite(input.noveltyRatio) || input.noveltyRatio < 0 || input.noveltyRatio > 100) {
    return { ok: false, reason: "bad_novelty_ratio" };
  }
  if (input.budgetMax != null && (!Number.isFinite(input.budgetMax) || input.budgetMax < 0)) {
    return { ok: false, reason: "bad_budget" };
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        city: input.city?.trim() ? input.city.trim().slice(0, 80) : null,
        radiusKm: Math.round(input.radiusKm),
        budgetMax: input.budgetMax != null ? Math.round(input.budgetMax) : null,
        socialMode: input.socialMode,
        locale: input.locale,
        noveltyRatio: Math.round(input.noveltyRatio),
        // Пишем всё поле целиком: других ключей в нём пока нет, и слияние
        // усложнило бы код ради несуществующей настройки.
        notificationPreferences: { nudges: input.nudges !== false },
      },
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}

/** Удалить одну запись памяти (Preference) — «AI-память видна, редактируема, удаляема». */
export async function deletePreference(id: string): Promise<ProfileResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  try {
    // Скоуп по userId, а не голый id с клиента — иначе можно стереть чужую запись.
    await prisma.preference.deleteMany({ where: { id, userId: session.userId } });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Удалить аккаунт по-настоящему. Каскады в схеме (`onDelete: Cascade`)
 * срабатывают только на реальный DELETE, а не на UPDATE deletedAt — поэтому
 * стираем зависимые записи явно, а не полагаемся на одну лишь метку.
 * Саму запись User не удаляем: telegramId должен остаться занятым, чтобы
 * `authenticateWithInitData` мог опознать возврат и завести чистый профиль
 * заново, а не создать вторую строку с тем же Telegram-аккаунтом.
 */
export async function deleteAccount(): Promise<ProfileResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  // До удаления строк — иначе трекать будет нечего.
  await track(session.userId, { name: "account_deleted", props: {} });

  /*
   * Файлы в бакете каскадом не удаляются: строки Memory уйдут, а фотографии
   * останутся лежать. «Удалить» должно значить удалить (PRD §8), поэтому
   * собираем пути до транзакции и стираем их после неё.
   */
  const photos = (
    await prisma.memory.findMany({
      where: { weeklyStory: { userId: session.userId } },
      select: { media: true },
    })
  ).flatMap((m) => m.media);

  try {
    await prisma.$transaction([
      prisma.intervention.deleteMany({ where: { userId: session.userId } }),
      prisma.preference.deleteMany({ where: { userId: session.userId } }),
      // Полученные приглашения: отправленные уйдут каскадом вместе с историями.
      prisma.invite.deleteMany({ where: { recipientId: session.userId } }),
      // Тянет за собой Memory, Invite и оставшиеся Intervention каскадом.
      prisma.weeklyStory.deleteMany({ where: { userId: session.userId } }),
      prisma.wish.deleteMany({ where: { userId: session.userId } }),
      // Имя стираем вместе с остальным: «удалить» должно значить удалить.
      prisma.user.update({
        where: { id: session.userId },
        data: { deletedAt: new Date(), firstName: null, username: null },
      }),
    ]);
  } catch {
    return { ok: false, reason: "db_error" };
  }

  // После транзакции: не удалившийся файл не должен отменять удаление аккаунта.
  for (const path of photos) await deleteMemoryPhoto(path);

  await clearSession();
  revalidatePath("/");
  return { ok: true };
}
