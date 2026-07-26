import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

/*
 * Доступ к внутреннему concierge-инструменту (ADR-006: каталог событий
 * Белграда/Нови-Сада ведёт куратор руками).
 *
 * Отдельный от пользовательской сессии контур — сознательно:
 *   - у куратора нет Telegram-аккаунта в продукте, и наоборот;
 *   - утечка одной куки не даёт доступ ко второму контуру;
 *   - без CONCIERGE_TOKEN раздел просто не существует (404), а не «пустой admin».
 *
 * Аккаунтов нет: один общий токен, который заводит владелец проекта в env.
 * Для пилота с одним-двумя кураторами этого достаточно; когда кураторов
 * станет больше — нужны роли, и это будет отдельное решение.
 */

const COOKIE_NAME = "ryk_concierge";
const MAX_AGE_SECONDS = 60 * 60 * 12; // смена куратора, не месяц

/** Раздел включён только если владелец задал токен. */
export function isConciergeEnabled(): boolean {
  return (process.env.CONCIERGE_TOKEN ?? "").length >= 16;
}

function getSecret(): Uint8Array {
  // Подписываем куку тем же секретом, что и пользовательские сессии:
  // отдельный секрет ничего не добавляет, а забыть его в env — легко.
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET не задан в production");
  }
  return new TextEncoder().encode("ryk-dev-insecure-session-secret-change-me");
}

/** Сравнение в постоянном времени: длина токена не должна утекать по таймингу. */
export function tokenMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function signInConcierge(given: string): Promise<boolean> {
  const expected = process.env.CONCIERGE_TOKEN ?? "";
  if (expected.length < 16) return false;
  if (!tokenMatches(given, expected)) return false;

  const token = await new SignJWT({ role: "concierge" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/concierge",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function isConciergeSignedIn(): Promise<boolean> {
  if (!isConciergeEnabled()) return false;
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify<{ role?: string }>(token, getSecret());
    return payload.role === "concierge";
  } catch {
    return false;
  }
}

export async function signOutConcierge(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
