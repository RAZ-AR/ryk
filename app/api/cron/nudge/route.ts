import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { Locale } from "@/generated/prisma/enums";
import { buildNudge, type NudgeCode } from "@/lib/engine/nudges";
import { decideDelivery, notificationsEnabled } from "@/lib/engine/nudgeDelivery";
import { weekStartUTC } from "@/lib/engine/weekly";
import { prisma } from "@/lib/prisma";
import { callTelegramApi } from "@/lib/telegram/botApi";
import { buildNudgeMessage, buildWitnessMessage } from "@/lib/telegram/nudgeMessage";
import { getWeekForecast, type DayWeather } from "@/lib/weather/openMeteo";

/*
 * GET /api/cron/nudge — единственное место, где бот пишет первым.
 *
 * Раньше вся связь была односторонней: движок подсказок (buildNudge) уже
 * существовал, но его результат человек видел, только сам открыв приложение.
 * То есть подсказка «завтра дождь, суббота лучше» доходила ровно до тех,
 * кто и так зашёл, — то есть до тех, кому она не нужна.
 *
 * Кого именно и как часто трогаем, решает nudgeDelivery — там же объяснено,
 * почему потолок два сообщения в неделю и почему часть кодов молчит всегда.
 * Здесь только сбор контекста и отправка.
 *
 * Запускается Vercel Cron (vercel.json). Идемпотентен: повторный запуск
 * в тот же день ничего не отправит второй раз — отправленное записано
 * в interventions и учитывается при следующем решении.
 */

/** Заголовок ставит Vercel Cron; вручную дёрнуть роут без секрета нельзя. */
function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const given = request.headers.get("authorization");
  if (!expected || expected.length < 16 || !given) return false;

  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(`Bearer ${expected}`, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const WEEKDAYS: Record<Locale, string[]> = {
  RU: [
    "в воскресенье",
    "в понедельник",
    "во вторник",
    "в среду",
    "в четверг",
    "в пятницу",
    "в субботу",
  ],
  EN: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ES: [
    "el domingo",
    "el lunes",
    "el martes",
    "el miércoles",
    "el jueves",
    "el viernes",
    "el sábado",
  ],
};

const WEATHER_WORDS: Record<Locale, Record<DayWeather["kind"], string>> = {
  RU: { CLEAR: "ясно", CLOUDY: "облачно", RAIN: "дождь", SNOW: "снег", STORM: "гроза" },
  EN: { CLEAR: "clear", CLOUDY: "cloudy", RAIN: "rain", SNOW: "snow", STORM: "storm" },
  ES: { CLEAR: "despejado", CLOUDY: "nublado", RAIN: "lluvia", SNOW: "nieve", STORM: "tormenta" },
};

function describeWeather(w: DayWeather, locale: Locale): string {
  const word = WEATHER_WORDS[locale]?.[w.kind] ?? WEATHER_WORDS.RU[w.kind];
  return `${word}, ${w.tempMax > 0 ? "+" : ""}${w.tempMax}°`;
}

function weekdayName(iso: string, locale: Locale): string {
  const day = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  return (WEEKDAYS[locale] ?? WEEKDAYS.RU)[day];
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }

  const weekStart = weekStartUTC();
  const todayIso = new Date().toISOString().slice(0, 10);

  const sent = { nudges: 0, witness: 0 };
  const skipped: Record<string, number> = {};
  const note = (reason: string) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };

  // ── 1. Подсказки по активным историям недели ──────────────────
  const active = await prisma.weeklyStory.findMany({
    where: {
      weekStart,
      status: { in: ["COMMITTED", "AT_RISK"] },
      // Нет впечатления — нечего и подсказывать.
      experience: { isNot: null },
      user: { deletedAt: null },
    },
    include: {
      experience: true,
      user: {
        select: {
          id: true,
          telegramId: true,
          locale: true,
          city: true,
          notificationPreferences: true,
        },
      },
    },
  });

  for (const story of active) {
    const { user, experience } = story;
    if (!experience) continue;

    // Что уже сказали на этой неделе — и есть весь наш дедуп.
    const alreadySent = await prisma.intervention.findMany({
      where: { userId: user.id, type: "NUDGE", sentAt: { gte: weekStart } },
      select: { reason: true },
    });
    const sentCodes = alreadySent.map((i) => i.reason as NudgeCode);

    const forecast = await getWeekForecast(user.city, experience.lat, experience.lng);
    const nudge = buildNudge({
      plannedFor: story.plannedFor ? story.plannedFor.toISOString().slice(0, 10) : null,
      forecast,
      socialMode: story.socialMode,
      companionName: story.companionName,
      todayIso,
    });

    const decision = decideDelivery({
      code: nudge.code,
      sentThisWeek: sentCodes,
      notificationsEnabled: notificationsEnabled(user.notificationPreferences),
    });
    if (!decision.send) {
      note(decision.reason);
      continue;
    }

    const text = buildNudgeMessage(nudge.code, user.locale, {
      title: experience.title,
      suggestedDay: nudge.suggestedDate ? weekdayName(nudge.suggestedDate, user.locale) : undefined,
      suggestedWeather: nudge.suggestedWeather
        ? describeWeather(nudge.suggestedWeather, user.locale)
        : undefined,
    });
    if (!text) {
      note("no_template");
      continue;
    }

    const res = await callTelegramApi("sendMessage", {
      chat_id: user.telegramId,
      text,
      disable_notification: false,
    });
    if (!res.ok) {
      // Человек мог заблокировать бота — это нормальный исход, не ошибка.
      note(`telegram:${res.error}`);
      continue;
    }

    await prisma.intervention.create({
      data: {
        userId: user.id,
        weeklyStoryId: story.id,
        type: "NUDGE",
        reason: nudge.code,
        content: text,
        sentAt: new Date(),
      },
    });
    sent.nudges += 1;
  }

  // ── 2. Итог недели свидетелю (Flow E) ─────────────────────────
  // Свидетель видит только обещание и результат — ни места, ни бюджета.
  const finished = await prisma.weeklyStory.findMany({
    where: {
      weekStart,
      status: { in: ["COMPLETED", "DEFERRED"] },
      invites: { some: { role: "WITNESS", status: "ACCEPTED", recipientId: { not: null } } },
    },
    include: {
      experience: { select: { title: true } },
      invites: {
        where: { role: "WITNESS", status: "ACCEPTED" },
        include: { recipient: { select: { id: true, telegramId: true, locale: true } } },
      },
    },
  });

  for (const story of finished) {
    const witness = story.invites[0]?.recipient;
    if (!witness || !story.experience) continue;

    // Итог сообщается один раз — дедуп по истории и роли.
    const already = await prisma.intervention.findFirst({
      where: { userId: witness.id, weeklyStoryId: story.id, reason: "WITNESS_OUTCOME" },
      select: { id: true },
    });
    if (already) {
      note("witness_already_told");
      continue;
    }

    const text = buildWitnessMessage(
      story.status === "COMPLETED" ? "done" : "deferred",
      witness.locale,
      {
        title: story.experience.title,
      },
    );

    const res = await callTelegramApi("sendMessage", { chat_id: witness.telegramId, text });
    if (!res.ok) {
      note(`telegram:${res.error}`);
      continue;
    }

    await prisma.intervention.create({
      data: {
        userId: witness.id,
        weeklyStoryId: story.id,
        type: "CHECK_IN",
        reason: "WITNESS_OUTCOME",
        content: text,
        sentAt: new Date(),
      },
    });
    sent.witness += 1;
  }

  return NextResponse.json({
    ok: true,
    weekStart: weekStart.toISOString().slice(0, 10),
    considered: { stories: active.length, finished: finished.length },
    sent,
    skipped,
  });
}
