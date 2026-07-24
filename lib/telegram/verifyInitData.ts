import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Валидация initData из Telegram Mini App.
 * Спека: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Алгоритм:
 *   secret_key   = HMAC_SHA256(key="WebAppData", msg=bot_token)
 *   check_string = отсортированные по ключу "k=v", соединённые "\n" (без hash)
 *   expected     = HMAC_SHA256(key=secret_key, msg=check_string) в hex
 *   валидно, если expected === hash (сравнение постоянного времени)
 */

export type TelegramUser = {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
};

export type VerifiedInitData = {
  user: TelegramUser;
  authDate: Date;
  raw: URLSearchParams;
};

export type VerifyResult =
  | { ok: true; data: VerifiedInitData }
  | { ok: false; reason: "no_hash" | "bad_hash" | "expired" | "no_user" | "malformed" };

const DAY_SECONDS = 86_400;

/**
 * Проверяет подпись и свежесть initData.
 * @param initData сырая строка из `window.Telegram.WebApp.initData`
 * @param botToken токен бота (секрет; в код/логи не попадает)
 * @param maxAgeSeconds максимально допустимый возраст подписи (защита от replay)
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = DAY_SECONDS,
): VerifyResult {
  if (!initData || !botToken) return { ok: false, reason: "malformed" };

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no_hash" };

  // check_string: все пары, кроме hash, отсортированы по ключу.
  const checkString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(checkString).digest("hex");

  if (!safeEqualHex(expected, hash)) return { ok: false, reason: "bad_hash" };

  // Свежесть подписи.
  const authDateRaw = params.get("auth_date");
  const authDateSec = authDateRaw ? Number(authDateRaw) : NaN;
  if (!Number.isFinite(authDateSec)) return { ok: false, reason: "malformed" };
  const ageSeconds = Math.floor(Date.now() / 1000) - authDateSec;
  if (ageSeconds > maxAgeSeconds) return { ok: false, reason: "expired" };

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, reason: "no_user" };

  let user: TelegramUser;
  try {
    const parsed = JSON.parse(userRaw) as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
    };
    if (typeof parsed.id !== "number") return { ok: false, reason: "no_user" };
    user = {
      id: parsed.id,
      firstName: parsed.first_name,
      lastName: parsed.last_name,
      username: parsed.username,
      languageCode: parsed.language_code,
      isPremium: parsed.is_premium,
    };
  } catch {
    return { ok: false, reason: "no_user" };
  }

  return {
    ok: true,
    data: { user, authDate: new Date(authDateSec * 1000), raw: params },
  };
}

/** Сравнение hex-строк постоянного времени (защита от timing-атак). */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
