"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics/track";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/*
 * Реакция на впечатление в ленте.
 *
 * «Интересно» делает две вещи сразу: помечает впечатление (чтобы не
 * показывать снова и поднять его в кандидатах недели) и заводит желание —
 * понравившееся должно оседать в вишлисте, а не только во внутренней модели.
 */

export type ReactionResult = { ok: true } | { ok: false; reason: string };

export async function reactToExperience(
  experienceId: string,
  liked: boolean,
): Promise<ReactionResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const experience = await prisma.experience.findUnique({
    where: { id: experienceId },
    select: { id: true, title: true, category: true, price: true },
  });
  if (!experience) return { ok: false, reason: "not_found" };

  try {
    await prisma.$transaction(async (tx) => {
      // upsert: повторный свайп (двойное касание, гонка кнопки и жеста)
      // не должен падать на уникальном ключе.
      await tx.experienceReaction.upsert({
        where: { userId_experienceId: { userId: session.userId, experienceId } },
        update: { liked },
        create: { userId: session.userId, experienceId, liked },
      });

      if (!liked) return;

      // Желание заводим только на первый лайк: иначе повторный свайп
      // насыпал бы дублей в вишлист.
      const alreadyWished = await tx.wish.findFirst({
        where: { userId: session.userId, text: experience.title },
        select: { id: true },
      });
      if (alreadyWished) return;

      await tx.wish.create({
        data: {
          userId: session.userId,
          text: experience.title,
          category: experience.category,
          budget: experience.price,
          status: "SOMEDAY",
        },
      });
    });
  } catch {
    return { ok: false, reason: "db_error" };
  }

  await track(session.userId, {
    name: "experience_reacted",
    props: { category: experience.category, liked },
  });

  revalidatePath("/");
  return { ok: true };
}
