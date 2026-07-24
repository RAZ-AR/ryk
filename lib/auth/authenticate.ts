import { cookies } from "next/headers";
import type { Locale } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { verifyInitData } from "@/lib/telegram/verifyInitData";
import { createSession } from "./session";

/*
 * Аутентификация Mini App: проверяем initData, заводим/находим пользователя,
 * открываем сессию. Возвращаем минимум для клиента.
 */

export type AuthedUser = {
  id: string;
  telegramId: string;
  locale: Locale;
  onboardingState: string;
};

export type AuthResult = { ok: true; user: AuthedUser } | { ok: false; reason: string };

const TELEGRAM_TO_LOCALE: Record<string, Locale> = {
  en: "EN",
  ru: "RU",
  es: "ES",
};

function localeFromTelegram(code: string | undefined): Locale {
  if (!code) return "RU";
  return TELEGRAM_TO_LOCALE[code.slice(0, 2).toLowerCase()] ?? "EN";
}

/** Кладём язык в отдельную cookie, чтобы next-intl (i18n/request.ts) его читал. */
async function setLocaleCookie(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set("ryk_locale", locale.toLowerCase(), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Аутентификация по реальному initData из Telegram. */
export async function authenticateWithInitData(initData: string): Promise<AuthResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, reason: "server_misconfigured" };

  const verified = verifyInitData(initData, token);
  if (!verified.ok) return { ok: false, reason: verified.reason };

  const tg = verified.data.user;
  const telegramId = String(tg.id);

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {},
    create: {
      telegramId,
      locale: localeFromTelegram(tg.languageCode),
    },
    select: { id: true, telegramId: true, locale: true, onboardingState: true },
  });

  await createSession({ userId: user.id, telegramId: user.telegramId });
  await setLocaleCookie(user.locale);
  return { ok: true, user };
}

/**
 * Dev-вход вне Telegram: используем сид-пользователя `dev-local`.
 * Разрешён ТОЛЬКО не в production — иначе это дыра в обход подписи.
 */
export async function authenticateDev(): Promise<AuthResult> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "dev_auth_disabled" };
  }

  const user = await prisma.user.upsert({
    where: { telegramId: "dev-local" },
    update: {},
    create: { telegramId: "dev-local", locale: "RU", onboardingState: "DONE" },
    select: { id: true, telegramId: true, locale: true, onboardingState: true },
  });

  await createSession({ userId: user.id, telegramId: user.telegramId });
  await setLocaleCookie(user.locale);
  return { ok: true, user };
}
