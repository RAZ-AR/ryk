import type { Locale } from "@/generated/prisma/enums";
import { DEFAULT_DB_LOCALE } from "@/lib/i18n/locale";
import { setLocaleCookie } from "@/lib/i18n/localeCookie";
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
  if (!code) return DEFAULT_DB_LOCALE;
  // Язык вне трёх наших — английский: он ближе к любому четвёртому, чем русский.
  return TELEGRAM_TO_LOCALE[code.slice(0, 2).toLowerCase()] ?? "EN";
}

/**
 * Пустой профиль для пользователя, который удалил аккаунт и вернулся с тем же
 * Telegram-аккаунтом. upsert ниже находит старую (мягко удалённую) запись —
 * без явного сброса полей `deletedAt` остался бы навсегда, и `getCurrentUser`
 * (фильтрует `deletedAt: null`) вечно возвращал бы null: бесконечный экран
 * входа без единого способа снова попасть в приложение.
 */
const FRESH_ACCOUNT_FIELDS = {
  deletedAt: null,
  onboardingState: "NOT_STARTED",
  city: null,
  radiusKm: 30,
  budgetMax: null,
  socialMode: null,
  noveltyRatio: 30,
  notificationPreferences: {},
} as const;

/** Аутентификация по реальному initData из Telegram. */
export async function authenticateWithInitData(initData: string): Promise<AuthResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, reason: "server_misconfigured" };

  const verified = verifyInitData(initData, token);
  if (!verified.ok) return { ok: false, reason: verified.reason };

  const tg = verified.data.user;
  const telegramId = String(tg.id);
  // Имя приходит подписанным — обновляем на каждом входе: человек мог сменить
  // его в Telegram, а им подписываются принятые приглашения.
  const displayName = { firstName: tg.firstName ?? null, username: tg.username ?? null };

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: displayName,
    create: {
      telegramId,
      locale: localeFromTelegram(tg.languageCode),
      ...displayName,
    },
    select: {
      id: true,
      telegramId: true,
      locale: true,
      onboardingState: true,
      deletedAt: true,
    },
  });

  if (user.deletedAt) {
    await prisma.user.update({ where: { id: user.id }, data: FRESH_ACCOUNT_FIELDS });
    user.onboardingState = "NOT_STARTED";
  }

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

  // Имя проставляем и здесь: у реального пользователя оно приходит из initData,
  // и без него локальная проверка приглашений врала бы (подпись «—» вместо имени).
  const user = await prisma.user.upsert({
    where: { telegramId: "dev-local" },
    update: { firstName: "Dev" },
    create: {
      telegramId: "dev-local",
      firstName: "Dev",
      locale: "RU",
      onboardingState: "DONE",
    },
    select: { id: true, telegramId: true, locale: true, onboardingState: true },
  });

  await createSession({ userId: user.id, telegramId: user.telegramId });
  await setLocaleCookie(user.locale);
  return { ok: true, user };
}
