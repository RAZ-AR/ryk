import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Вебхук — единственная точка входа для чужих запросов в проекте, где
 * Telegram сам не подписывает тело HMAC'ом (в отличие от initData).
 * Здесь важнее всего: секрет реально проверяется, и is_personal всегда
 * выставлен (иначе Telegram кеширует чужую карточку между пользователями).
 */

const findFirstUser = vi.fn();
const findUniqueStory = vi.fn();
const callTelegramApi = vi.fn().mockResolvedValue({ ok: true, result: {} });

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: (...a: unknown[]) => findFirstUser(...a) },
    weeklyStory: { findUnique: (...a: unknown[]) => findUniqueStory(...a) },
  },
}));
vi.mock("@/lib/telegram/botApi", () => ({
  callTelegramApi: (...a: unknown[]) => callTelegramApi(...a),
}));

const SECRET = "a-very-real-secret-value-1234";

function request(body: unknown, secretHeader = SECRET): Request {
  return new Request("http://localhost/api/telegram/webhook", {
    method: "POST",
    headers: secretHeader
      ? { "x-telegram-bot-api-secret-token": secretHeader, "content-type": "application/json" }
      : { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
});

describe("POST /api/telegram/webhook", () => {
  it("отклоняет запрос без секрета — 401, без обращения к базе", async () => {
    const { POST } = await import("./route");
    const res = await POST(request({}, ""));

    expect(res.status).toBe(401);
    expect(findFirstUser).not.toHaveBeenCalled();
  });

  it("отклоняет запрос с неверным секретом — 401", async () => {
    const { POST } = await import("./route");
    const res = await POST(request({}, "totally-wrong-secret-value-000"));
    expect(res.status).toBe(401);
  });

  it("нет пользователя — пустые results, не падает", async () => {
    findFirstUser.mockResolvedValue(null);
    const { POST } = await import("./route");

    const res = await POST(
      request({ inline_query: { id: "q1", from: { id: 999 }, query: "companion" } }),
    );

    expect(res.status).toBe(200);
    expect(callTelegramApi).toHaveBeenCalledWith(
      "answerInlineQuery",
      expect.objectContaining({ results: [], is_personal: true }),
    );
  });

  it("есть подтверждённая история — карточка собрана, is_personal:true", async () => {
    findFirstUser.mockResolvedValue({ id: "user-1", locale: "RU" });
    findUniqueStory.mockResolvedValue({
      status: "COMMITTED",
      plannedFor: new Date("2026-07-27T12:00:00.000Z"),
      experience: {
        title: "Джазовый вечер",
        location: "Дом омладине",
        price: 1200,
        currency: "RSD",
      },
    });
    const { POST } = await import("./route");

    const res = await POST(
      request({ inline_query: { id: "q1", from: { id: 128136200 }, query: "companion" } }),
    );

    expect(res.status).toBe(200);
    const [, payload] = callTelegramApi.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.is_personal).toBe(true);
    expect(payload.cache_time).toBe(0);
    const results = payload.results as Array<{ input_message_content: { message_text: string } }>;
    expect(results).toHaveLength(1);
    expect(results[0].input_message_content.message_text).toContain("Джазовый вечер");
  });

  it("история не COMMITTED/AT_RISK — пустые results (нет плана, нечего слать)", async () => {
    findFirstUser.mockResolvedValue({ id: "user-1", locale: "RU" });
    findUniqueStory.mockResolvedValue({
      status: "COMPLETED",
      plannedFor: new Date("2026-07-20T12:00:00.000Z"),
      experience: { title: "Старая история", location: null, price: null, currency: "RSD" },
    });
    const { POST } = await import("./route");

    await POST(request({ inline_query: { id: "q1", from: { id: 1 }, query: "companion" } }));

    const [, payload] = callTelegramApi.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.results).toEqual([]);
  });

  it("не inline_query — отвечает ok без обращения к Telegram API", async () => {
    const { POST } = await import("./route");
    const res = await POST(request({ message: { text: "привет" } }));

    expect(res.status).toBe(200);
    expect(callTelegramApi).not.toHaveBeenCalled();
  });
});
