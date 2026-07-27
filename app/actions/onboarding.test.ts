import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OnboardingInput } from "./onboarding";

/*
 * Онбординг спрашивает много, и почти всё — необязательно. Проверяем именно
 * это: что пропущенный шаг не ломает завершение, что рассказанное своими
 * словами доходит до вкусов и желаний, и что клиенту здесь не верят на слово.
 */

const deletePreferences = vi.fn();
const createPreferences = vi.fn();
const createWish = vi.fn();
const updateUser = vi.fn();

const tx = {
  preference: { deleteMany: deletePreferences, createMany: createPreferences },
  wish: { create: createWish },
  user: { update: updateUser },
};

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const getSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSession() }));

const structureWish = vi.fn();
vi.mock("@/lib/ai/structureWish", () => ({ structureWish: (t: string) => structureWish(t) }));

const BASE: OnboardingInput = {
  categories: ["NATURE"],
  swipes: [],
  budgetMax: 2000,
  socialMode: "SOLO",
  noveltyRatio: 40,
  city: "Белград",
};

/**
 * Часть кейсов намеренно шлёт мусор («LAZINESS»), которого нет в типе, —
 * ровно так и приходит подделанный запрос к server action, поэтому здесь
 * приведение к типу оправдано.
 */
const input = (over: Record<string, unknown> = {}) =>
  ({ ...BASE, ...over }) as unknown as OnboardingInput;

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ userId: "me", telegramId: "1" });
  structureWish.mockResolvedValue({ category: "CONNECTION", budget: null, timing: "SOMEDAY" });
});

describe("completeOnboarding", () => {
  it("завершает онбординг, даже когда все необязательные шаги пропущены", async () => {
    const { completeOnboarding } = await import("./onboarding");

    const res = await completeOnboarding(input());

    expect(res.ok).toBe(true);
    // Ни одного обращения к модели: пропущенный шаг не должен ничего стоить.
    expect(structureWish).not.toHaveBeenCalled();
    expect(createWish).not.toHaveBeenCalled();
    expect(updateUser.mock.calls[0][0].data).toMatchObject({
      mainBarrier: null,
      freeWindows: [],
      onboardingState: "DONE",
    });
  });

  it("превращает отложенное в желание", async () => {
    structureWish.mockResolvedValue({ category: "MOVEMENT", budget: 3000, timing: "SOON" });
    const { completeOnboarding } = await import("./onboarding");

    await completeOnboarding(input({ postponed: "  Научиться плавать  " }));

    expect(createWish).toHaveBeenCalledTimes(1);
    expect(createWish.mock.calls[0][0].data).toMatchObject({
      userId: "me",
      text: "Научиться плавать",
      category: "MOVEMENT",
      budget: 3000,
      status: "SOON",
    });
  });

  it("хороший момент становится вкусом с высокой уверенностью", async () => {
    structureWish.mockResolvedValue({ category: "CONNECTION", budget: null, timing: "SOMEDAY" });
    const { completeOnboarding } = await import("./onboarding");

    await completeOnboarding(input({ categories: ["NATURE"], goodMoment: "Сидели на крыше" }));

    const rows = createPreferences.mock.calls[0][0].data;
    const connection = rows.find((r: { category: string }) => r.category === "CONNECTION");
    // Рассказанное самим человеком весит больше выбранного из нашей сетки (0.7).
    expect(connection).toMatchObject({ sentiment: "LIKE", confidence: 0.8 });
  });

  it("при совпадении категорий побеждает более уверенный сигнал, а не первый", async () => {
    structureWish.mockResolvedValue({ category: "NATURE", budget: null, timing: "SOMEDAY" });
    const { completeOnboarding } = await import("./onboarding");

    await completeOnboarding(
      input({
        // Та же категория приходит трижды с разной уверенностью.
        categories: ["NATURE"],
        swipes: [{ category: "NATURE", liked: true }],
        goodMoment: "Ходили в горы",
      }),
    );

    const rows = createPreferences.mock.calls[0][0].data;
    const nature = rows.filter((r: { category: string }) => r.category === "NATURE");
    expect(nature).toHaveLength(1);
    // 0.8 (рассказ) > 0.7 (категория) > 0.5 (свайп).
    expect(nature[0].confidence).toBe(0.8);
  });

  it("«не моё» не перебивает названный интерес", async () => {
    const { completeOnboarding } = await import("./onboarding");

    await completeOnboarding(
      input({ categories: ["NATURE"], swipes: [{ category: "NATURE", liked: false }] }),
    );

    const rows = createPreferences.mock.calls[0][0].data;
    const nature = rows.find((r: { category: string }) => r.category === "NATURE");
    expect(nature.sentiment).toBe("LIKE");
  });

  it("не роняет онбординг, если разбор текста не удался", async () => {
    structureWish.mockRejectedValue(new Error("модель недоступна"));
    const { completeOnboarding } = await import("./onboarding");

    const res = await completeOnboarding(input({ goodMoment: "Что-то хорошее" }));

    expect(res.ok).toBe(true);
    expect(updateUser).toHaveBeenCalled();
  });

  it("не верит клиенту: выдуманное препятствие и окна отбрасываются", async () => {
    const { completeOnboarding } = await import("./onboarding");

    await completeOnboarding(
      input({
        mainBarrier: "LAZINESS",
        freeWindows: ["WEEKEND_DAY", "MIDNIGHT", "WEEKEND_DAY"],
      }),
    );

    expect(updateUser.mock.calls[0][0].data).toMatchObject({
      mainBarrier: null,
      // Дубли схлопнуты, выдуманное окно отброшено.
      freeWindows: ["WEEKEND_DAY"],
    });
  });

  it("принимает вклад как категорию — раньше он молча терялся", async () => {
    const { completeOnboarding } = await import("./onboarding");

    await completeOnboarding(input({ categories: ["CONTRIBUTION"] }));

    const rows = createPreferences.mock.calls[0][0].data;
    expect(rows.map((r: { category: string }) => r.category)).toContain("CONTRIBUTION");
  });

  it("без сессии ничего не пишет", async () => {
    getSession.mockResolvedValue(null);
    const { completeOnboarding } = await import("./onboarding");

    const res = await completeOnboarding(input({ postponed: "Что угодно" }));

    expect(res).toEqual({ ok: false, reason: "no_session" });
    expect(createWish).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
