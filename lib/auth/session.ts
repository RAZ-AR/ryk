import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/*
 * Сессия Mini App. После валидации initData выдаём подписанный JWT
 * в httpOnly-cookie; серверные компоненты читают его отсюда.
 *
 * Секрет подписи — SESSION_SECRET (env). Если не задан, в dev берём
 * запасной, чтобы не блокировать локальную разработку; в prod — ошибка.
 */

const COOKIE_NAME = "ryk_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 дней

export type SessionPayload = {
  /** id пользователя в нашей БД (User.id). */
  userId: string;
  /** Telegram user id — для диагностики. */
  telegramId: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET не задан в production");
  }
  // Только для локальной разработки.
  return new TextEncoder().encode("ryk-dev-insecure-session-secret-change-me");
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret());
    if (typeof payload.userId !== "string" || typeof payload.telegramId !== "string") {
      return null;
    }
    return { userId: payload.userId, telegramId: payload.telegramId };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
