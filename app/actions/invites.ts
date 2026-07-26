"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/*
 * Приём приглашений (Flow D/E). Приглашение создаётся вебхуком при отправке
 * ссылки и до первого открытия «ничьё»: recipientId пуст, значок никому не
 * горит. Первый, кто открыл ссылку, забирает его себе — дальше принять или
 * отклонить может только он.
 */

export type InviteResult =
  | { ok: true }
  /** Приглашение уже забрал кто-то другой — ссылку разослали нескольким. */
  | { ok: false; reason: "taken" | "no_session" | "not_found" | "own_invite" | "db_error" };

/**
 * Закрепить приглашение за открывшим ссылку. Идемпотентно: повторный вызов
 * тем же человеком — снова ok, чтобы перезаход по ссылке не ломался.
 */
export async function claimInvite(inviteId: string): Promise<InviteResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const invite = await prisma.invite.findUnique({
    where: { id: inviteId },
    select: { id: true, inviterId: true, recipientId: true },
  });
  if (!invite) return { ok: false, reason: "not_found" };

  // Позвать самого себя нельзя — иначе история «подтвердится» без второго человека.
  if (invite.inviterId === session.userId) return { ok: false, reason: "own_invite" };
  if (invite.recipientId === session.userId) return { ok: true };
  if (invite.recipientId) return { ok: false, reason: "taken" };

  try {
    // Условие recipientId: null в самом запросе — гонку двух получателей
    // разрешает БД, а не проверка выше.
    const claimed = await prisma.invite.updateMany({
      where: { id: inviteId, recipientId: null },
      data: { recipientId: session.userId },
    });
    if (claimed.count === 0) return { ok: false, reason: "taken" };
  } catch {
    return { ok: false, reason: "db_error" };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * Принять или отклонить. При приёме имя пишется в companionName/witnessName
 * истории — поля уже есть ровно для этого, и приглашающий видит подтверждение
 * на своём экране недели без отдельного запроса.
 */
export async function respondInvite(inviteId: string, accept: boolean): Promise<InviteResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const invite = await prisma.invite.findUnique({
    where: { id: inviteId },
    select: { id: true, role: true, status: true, recipientId: true, weeklyStoryId: true },
  });
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.recipientId !== session.userId) return { ok: false, reason: "taken" };
  if (invite.status !== "PENDING") return { ok: false, reason: "taken" };

  // Имя берём из своей записи (источник — подписанный initData), а не из
  // аргумента: иначе принявший мог бы вписать приглашающему что угодно.
  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { firstName: true, username: true },
  });
  const name = me?.firstName?.trim() || (me?.username ? `@${me.username}` : "") || "—";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: { id: inviteId },
        data: { status: accept ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
      });

      if (accept) {
        await tx.weeklyStory.update({
          where: { id: invite.weeklyStoryId },
          data: invite.role === "COMPANION" ? { companionName: name } : { witnessName: name },
        });
      }
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  await track(session.userId, {
    name: accept ? "invite_accepted" : "invite_declined",
    props: { role: invite.role === "COMPANION" ? "companion" : "witness" },
  });

  revalidatePath("/");
  return { ok: true };
}
