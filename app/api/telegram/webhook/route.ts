import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { InviteRole as PrismaInviteRole } from "@/generated/prisma/enums";
import { callTelegramApi } from "@/lib/telegram/botApi";
import { buildInviteCard, buildInviteLink, type InviteRole } from "@/lib/telegram/inviteCard";
import { weekStartUTC } from "@/lib/engine/weekly";
import { localizeExperience } from "@/lib/i18n/experience";
import { prisma } from "@/lib/prisma";

/*
 * POST /api/telegram/webhook — единственный вебхук бота (до приглашений
 * Bot API использовался только для проверки initData, без сети).
 *
 * Обрабатывает inline_query от switchInlineQuery: создаёт (или переиспользует)
 * приглашение и отдаёт карточку со ссылкой на Mini App. Приняв её, человек
 * попадает в приложение с `startapp=<id приглашения>`.
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
  from: { id: number; first_name?: string; last_name?: string; username?: string };
  query: string;
};

function parseRole(query: string): InviteRole {
  return query.trim().toLowerCase() === "witness" ? "witness" : "companion";
}

const PRISMA_ROLE: Record<InviteRole, PrismaInviteRole> = {
  companion: "COMPANION",
  witness: "WITNESS",
};

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
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) return [];

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

  const role = parseRole(query.query);
  const inviterName = [query.from.first_name, query.from.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const inviter = {
    name: inviterName || "Ryk",
    username: query.from.username ?? null,
  };

  // upsert, а не create: inline_query прилетает на каждое нажатие клавиши,
  // а приглашение на историю и роль — одно (@@unique). Имя обновляем: человек
  // мог сменить его в Telegram между попытками.
  const invite = await prisma.invite.upsert({
    where: {
      weeklyStoryId_role: { weeklyStoryId: story.id, role: PRISMA_ROLE[role] },
    },
    update: { inviterName: inviter.name, inviterUsername: inviter.username },
    create: {
      weeklyStoryId: story.id,
      inviterId: user.id,
      role: PRISMA_ROLE[role],
      inviterName: inviter.name,
      inviterUsername: inviter.username,
    },
    select: { id: true },
  });

  /*
   * Язык приглашающего, а не получателя: карточку он набирает у себя в чате
   * и своими словами отправляет дальше. Получателя мы здесь ещё не знаем —
   * приглашение «ничьё» до первого открытия ссылки.
   */
  const text = localizeExperience(story.experience, user.locale);

  const card = buildInviteCard(
    role,
    {
      title: text.title,
      plannedForISO: story.plannedFor ? story.plannedFor.toISOString().slice(0, 10) : null,
      location: text.location,
      price: story.experience.price,
      currency: story.experience.currency,
    },
    user.locale,
    inviter,
    buildInviteLink(botUsername, invite.id),
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
