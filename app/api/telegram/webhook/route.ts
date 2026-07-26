import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { callTelegramApi } from "@/lib/telegram/botApi";
import { buildInviteCard, type InviteRole } from "@/lib/telegram/inviteCard";
import { weekStartUTC } from "@/lib/engine/weekly";
import { prisma } from "@/lib/prisma";

/*
 * POST /api/telegram/webhook — первый живой вебхук бота в проекте (до сих
 * пор Bot API использовался только для проверки initData, без сети).
 *
 * Обрабатывает inline_query от switchInlineQuery (companion/witness —
 * Фаза «приглашения»). Только отправка: узнать, дошло ли приглашение,
 * и уведомить свидетеля об итоге — отдельная, более тяжёлая фича
 * (нужна инлайн-кнопка с callback_query + witnessTelegramId),
 * сознательно не в этом пассе.
 *
 * Telegram не подписывает вебхуки HMAC'ом как initData — секрет передаётся
 * заголовком, который сам выставляешь через setWebhook(secret_token=...).
 */

function verifySecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const given = request.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || expected.length < 16 || !given) return false;

  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type TelegramInlineQuery = {
  id: string;
  from: { id: number; language_code?: string };
  query: string;
};

function parseRole(query: string): InviteRole {
  return query.trim().toLowerCase() === "witness" ? "witness" : "companion";
}

export async function POST(request: Request) {
  if (!verifySecret(request)) {
    return new NextResponse(null, { status: 401 });
  }

  let body: { inline_query?: TelegramInlineQuery };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const query = body.inline_query;
  if (!query) return NextResponse.json({ ok: true });

  const results = await buildResults(query);

  // is_personal — обязательно: Telegram кеширует ответ на уровне бота по
  // тексту запроса, а не по пользователю. Без этого другой человек с
  // подтверждённой историей в тот же момент может получить чужую карточку.
  await callTelegramApi("answerInlineQuery", {
    inline_query_id: query.id,
    results,
    cache_time: 0,
    is_personal: true,
  });

  return NextResponse.json({ ok: true });
}

type InlineQueryResultArticle = {
  type: "article";
  id: string;
  title: string;
  input_message_content: { message_text: string };
};

/** Пустой массив — безопасный дефолт: нет пользователя, нет истории, статус не тот. */
async function buildResults(query: TelegramInlineQuery): Promise<InlineQueryResultArticle[]> {
  const telegramId = String(query.from.id);
  const user = await prisma.user.findFirst({
    where: { telegramId, deletedAt: null },
    select: { id: true, locale: true },
  });
  if (!user) return [];

  const story = await prisma.weeklyStory.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart: weekStartUTC() } },
    include: { experience: true },
  });
  if (!story?.experience || (story.status !== "COMMITTED" && story.status !== "AT_RISK")) return [];

  const card = buildInviteCard(
    parseRole(query.query),
    {
      title: story.experience.title,
      plannedForISO: story.plannedFor ? story.plannedFor.toISOString().slice(0, 10) : null,
      location: story.experience.location,
      price: story.experience.price,
      currency: story.experience.currency,
    },
    user.locale,
  );

  return [
    {
      type: "article",
      id: card.id,
      title: card.title,
      input_message_content: { message_text: card.messageText },
    },
  ];
}
