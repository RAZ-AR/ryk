import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callTelegramApi } from "./botApi";

const ORIGINAL_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
});

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = ORIGINAL_TOKEN;
  vi.restoreAllMocks();
});

describe("callTelegramApi", () => {
  it("бьёт по правильному URL с токеном и телом в JSON", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, result: { done: true } }), { status: 200 }),
      );

    const res = await callTelegramApi("answerInlineQuery", { inline_query_id: "1", results: [] });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-bot-token/answerInlineQuery",
      expect.objectContaining({ method: "POST" }),
    );
    expect(res).toEqual({ ok: true, result: { done: true } });
  });

  it("без токена не бьёт по сети вообще", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const res = await callTelegramApi("answerInlineQuery", {});

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: false, error: "no_bot_token" });
  });

  it("отражает ошибку Telegram API как ok:false, а не бросает", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false, description: "Bad Request" }), { status: 400 }),
    );

    const res = await callTelegramApi("answerInlineQuery", {});
    expect(res).toEqual({ ok: false, error: "Bad Request" });
  });

  it("сетевой сбой — тоже ok:false, не исключение", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const res = await callTelegramApi("answerInlineQuery", {});
    expect(res).toEqual({ ok: false, error: "network_error" });
  });
});
