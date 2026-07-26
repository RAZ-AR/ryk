import { NextResponse } from "next/server";
import { buildIcs } from "@/lib/calendar/ics";
import { weekStartUTC } from "@/lib/engine/weekly";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics/track";

/*
 * GET /api/calendar/ics — .ics для текущей подтверждённой истории недели.
 * Раздача файлом (Content-Disposition), а не client-side Blob/data-URI —
 * тот же приём и та же причина, что у экспорта профиля: в Telegram WebView
 * это надёжнее.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "no_session" }, { status: 401 });

  const story = await prisma.weeklyStory.findUnique({
    where: { userId_weekStart: { userId: session.userId, weekStart: weekStartUTC() } },
    include: { experience: true },
  });

  if (!story || !story.experience || !story.plannedFor) {
    return NextResponse.json({ ok: false, reason: "no_committed_story" }, { status: 404 });
  }
  if (story.status !== "COMMITTED" && story.status !== "AT_RISK") {
    return NextResponse.json({ ok: false, reason: "not_committed" }, { status: 404 });
  }

  const dateISO = story.plannedFor.toISOString().slice(0, 10);
  const ics = buildIcs({
    uid: `${story.id}@ryk`,
    title: story.experience.title,
    dateISO,
    location: story.experience.location,
  });

  await track(session.userId, { name: "calendar_added", props: { method: "ics" } });

  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="ryk-story.ics"',
    },
  });
}
