import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Возврат «удалённого» пользователя не должен запирать его навсегда.
 * upsert по telegramId находит мягко удалённую запись (deletedAt != null) —
 * без явного сброса getCurrentUser() (фильтрует deletedAt: null) вечно
 * возвращал бы null: бесконечный экран входа без выхода.
 */

const upsert = vi.fn();
const update = vi.fn();
const setCookie = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { upsert: (...a: unknown[]) => upsert(...a), update: (...a: unknown[]) => update(...a) },
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: setCookie }) }));
vi.mock("./session", () => ({ createSession: vi.fn() }));
vi.mock("@/lib/telegram/verifyInitData", () => ({
  verifyInitData: () => ({
    ok: true,
    data: {
      user: { id: 42, languageCode: "ru" },
      authDate: new Date(),
      raw: new URLSearchParams(),
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
});

describe("authenticateWithInitData", () => {
  it("не трогает deletedAt для обычного (не удалённого) пользователя", async () => {
    upsert.mockResolvedValue({
      id: "u1",
      telegramId: "42",
      locale: "RU",
      onboardingState: "DONE",
      deletedAt: null,
    });
    const { authenticateWithInitData } = await import("./authenticate");

    const res = await authenticateWithInitData("any");

    expect(res.ok).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("сбрасывает мягко удалённую запись в чистое состояние при возврате", async () => {
    upsert.mockResolvedValue({
      id: "u1",
      telegramId: "42",
      locale: "RU",
      onboardingState: "DONE",
      deletedAt: new Date("2026-01-01"),
    });
    const { authenticateWithInitData } = await import("./authenticate");

    const res = await authenticateWithInitData("any");

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Сессия открывается на чистый профиль, а не на онбординг "DONE"
    // старого удалённого аккаунта — иначе пользователь попадёт в приложение
    // с данными, которых по идее уже не должно быть.
    expect(res.user.onboardingState).toBe("NOT_STARTED");
    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: expect.objectContaining({ deletedAt: null, onboardingState: "NOT_STARTED" }),
    });
  });
});
