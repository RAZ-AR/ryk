/*
 * Исходящие вызовы Telegram Bot API. До сих пор бот использовался только
 * для проверки initData (HMAC, без сети) — это первый реальный HTTP-вызов
 * к api.telegram.org в проекте.
 */

export type TelegramApiResult = { ok: true; result: unknown } | { ok: false; error: string };

export async function callTelegramApi(
  method: string,
  payload: unknown,
): Promise<TelegramApiResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "no_bot_token" };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok: boolean; result?: unknown; description?: string };
    if (!data.ok) return { ok: false, error: data.description ?? "telegram_api_error" };
    return { ok: true, result: data.result };
  } catch {
    return { ok: false, error: "network_error" };
  }
}
