import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/*
 * GET /api/profile/export — «пользователь владеет данными» (CLAUDE.md
 * постулат №6): выгрузка всего, что мы о нём храним, одним JSON-файлом.
 *
 * Через `Content-Disposition`, а не client-side Blob/data-URI — тот же
 * риск ненадёжности в Telegram WebView, что и у .ics-раздачи (Фаза
 * «календарь»), и то же решение.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "no_session" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      telegramId: true,
      firstName: true,
      username: true,
      locale: true,
      city: true,
      radiusKm: true,
      timezone: true,
      budgetMax: true,
      socialMode: true,
      noveltyRatio: true,
      notificationPreferences: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  const [preferences, wishes, weeklyStories, invitesReceived, invitesSent] = await Promise.all([
    prisma.preference.findMany({
      where: { userId: session.userId },
      select: { category: true, entity: true, sentiment: true, confidence: true, source: true },
    }),
    prisma.wish.findMany({
      where: { userId: session.userId },
      select: { text: true, category: true, budget: true, status: true, createdAt: true },
    }),
    prisma.weeklyStory.findMany({
      where: { userId: session.userId },
      select: {
        weekStart: true,
        status: true,
        plannedFor: true,
        budget: true,
        socialMode: true,
        companionName: true,
        witnessName: true,
        experience: { select: { title: true, category: true } },
        memory: { select: { rating: true, emotion: true, note: true, companion: true } },
      },
    }),
    prisma.invite.findMany({
      where: { recipientId: session.userId },
      select: { role: true, status: true, inviterName: true, createdAt: true, respondedAt: true },
    }),
    prisma.invite.findMany({
      where: { inviterId: session.userId },
      select: { role: true, status: true, createdAt: true, respondedAt: true },
    }),
  ]);

  const payload = {
    profile: user,
    preferences,
    wishes,
    weeklyStories,
    invites: { received: invitesReceived, sent: invitesSent },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="ryk-export.json"',
    },
  });
}
