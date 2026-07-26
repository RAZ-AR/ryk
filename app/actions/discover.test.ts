import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Лента кормит две вещи сразу: отметку «показано» и вишлист. Проверяем
 * именно связку — что лайк доходит до желаний, дизлайк туда не лезет,
 * и что повторный свайп не плодит дубли.
 */

const findUniqueExperience = vi.fn();
const upsertReaction = vi.fn();
const findFirstWish = vi.fn();
const createWish = vi.fn();

const tx = {
  experienceReaction: { upsert: upsertReaction },
  wish: { findFirst: findFirstWish, create: createWish },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    experience: { findUnique: (...a: unknown[]) => findUniqueExperience(...a) },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const getSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSession() }));

const EXPERIENCE = {
  id: "exp-1",
  title: "Каякинг на Аде",
  category: "NATURE",
  price: 2200,
};

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ userId: "me", telegramId: "1" });
  findUniqueExperience.mockResolvedValue(EXPERIENCE);
  findFirstWish.mockResolvedValue(null);
});

describe("reactToExperience", () => {
  it("лайк пишет реакцию и заводит желание", async () => {
    const { reactToExperience } = await import("./discover");

    expect(await reactToExperience("exp-1", true)).toEqual({ ok: true });

    expect(upsertReaction).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_experienceId: { userId: "me", experienceId: "exp-1" } },
        create: { userId: "me", experienceId: "exp-1", liked: true },
      }),
    );
    expect(createWish).toHaveBeenCalledWith({
      data: {
        userId: "me",
        text: "Каякинг на Аде",
        category: "NATURE",
        budget: 2200,
        status: "SOMEDAY",
      },
    });
  });

  it("дизлайк пишет только реакцию — в желания не лезет", async () => {
    const { reactToExperience } = await import("./discover");

    expect(await reactToExperience("exp-1", false)).toEqual({ ok: true });

    expect(upsertReaction).toHaveBeenCalledOnce();
    expect(createWish).not.toHaveBeenCalled();
  });

  it("повторный лайк не плодит дубли в вишлисте", async () => {
    findFirstWish.mockResolvedValue({ id: "wish-1" });
    const { reactToExperience } = await import("./discover");

    await reactToExperience("exp-1", true);

    expect(upsertReaction).toHaveBeenCalledOnce();
    expect(createWish).not.toHaveBeenCalled();
  });

  it("без сессии не трогает базу", async () => {
    getSession.mockResolvedValue(null);
    const { reactToExperience } = await import("./discover");

    expect(await reactToExperience("exp-1", true)).toEqual({ ok: false, reason: "no_session" });
    expect(upsertReaction).not.toHaveBeenCalled();
  });

  it("несуществующее впечатление — not_found, без записи", async () => {
    findUniqueExperience.mockResolvedValue(null);
    const { reactToExperience } = await import("./discover");

    expect(await reactToExperience("nope", true)).toEqual({ ok: false, reason: "not_found" });
    expect(upsertReaction).not.toHaveBeenCalled();
  });
});
