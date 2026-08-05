import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Срок желания. Проверяем то, ради чего экшен вообще отдельный от
 * `selectStory`: занятую неделю нельзя подменить молча, «когда-нибудь»
 * и «в этом месяце» недельного цикла не касаются, а кривой день не
 * доезжает до драйвера БД.
 */

const findFirstWish = vi.fn();
const updateWish = vi.fn();
const updateManyWish = vi.fn();
const findUniqueStory = vi.fn();
const upsertStory = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    wish: {
      findFirst: (...a: unknown[]) => findFirstWish(...a),
      update: (...a: unknown[]) => updateWish(...a),
      updateMany: (...a: unknown[]) => updateManyWish(...a),
    },
    weeklyStory: {
      findUnique: (...a: unknown[]) => findUniqueStory(...a),
      upsert: (...a: unknown[]) => upsertStory(...a),
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "ru" }));

const getSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSession() }));

import { realizeWish, scheduleWish } from "./wishes";

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ userId: "me", telegramId: "1" });
  findFirstWish.mockResolvedValue({ id: "wish-1" });
  findUniqueStory.mockResolvedValue(null);
  updateManyWish.mockResolvedValue({ count: 1 });
});

describe("scheduleWish", () => {
  it("«в этом месяце» меняет только желание и не трогает неделю", async () => {
    const res = await scheduleWish("wish-1", "thisMonth");

    expect(res).toEqual({ ok: true });
    expect(updateWish).toHaveBeenCalledWith({
      where: { id: "wish-1" },
      data: { status: "THIS_MONTH" },
    });
    expect(upsertStory).not.toHaveBeenCalled();
  });

  it("«когда-нибудь» возвращает желание в дальний горизонт", async () => {
    await scheduleWish("wish-1", "someday");

    expect(updateWish).toHaveBeenCalledWith({
      where: { id: "wish-1" },
      data: { status: "SOMEDAY" },
    });
  });

  it("на свободной неделе заводит историю с назначенным днём", async () => {
    const res = await scheduleWish("wish-1", "thisWeek", "2026-08-12");

    expect(res).toEqual({ ok: true });
    const arg = upsertStory.mock.calls[0][0];
    expect(arg.create.wishId).toBe("wish-1");
    expect(arg.create.plannedFor.toISOString()).toBe("2026-08-12T12:00:00.000Z");
    // Уехало в неделю — в списке живёт среди ближайшего.
    expect(updateWish).toHaveBeenCalledWith({ where: { id: "wish-1" }, data: { status: "SOON" } });
  });

  it("занятую неделю не подменяет молча и называет, кто её занял", async () => {
    findUniqueStory.mockResolvedValue({
      wishId: "other-wish",
      wish: null,
      experience: {
        title: "Ночной поход к маяку",
        description: null,
        location: null,
        translations: null,
      },
    });

    const res = await scheduleWish("wish-1", "thisWeek", "2026-08-12");

    expect(res).toEqual({
      ok: false,
      reason: "week_taken",
      takenTitle: "Ночной поход к маяку",
    });
    expect(upsertStory).not.toHaveBeenCalled();
  });

  it("с явного согласия перезаписывает занятую неделю", async () => {
    findUniqueStory.mockResolvedValue({ wishId: "other-wish", wish: null, experience: null });

    const res = await scheduleWish("wish-1", "thisWeek", "2026-08-12", true);

    expect(res).toEqual({ ok: true });
    // Прежняя история была из каталога — ссылку на неё надо снять,
    // иначе у недели окажется и желание, и событие сразу.
    expect(upsertStory.mock.calls[0][0].update).toMatchObject({
      wishId: "wish-1",
      experienceId: null,
    });
  });

  it("повторное назначение того же желания не считается занятой неделей", async () => {
    findUniqueStory.mockResolvedValue({ wishId: "wish-1", wish: null, experience: null });

    const res = await scheduleWish("wish-1", "thisWeek", "2026-08-13");

    expect(res).toEqual({ ok: true });
    expect(upsertStory).toHaveBeenCalled();
  });

  it("кривой день отсекается до запроса в БД", async () => {
    const res = await scheduleWish("wish-1", "thisWeek", "не дата");

    expect(res).toEqual({ ok: false, reason: "bad_day" });
    expect(upsertStory).not.toHaveBeenCalled();
  });

  it("чужое желание не находится", async () => {
    findFirstWish.mockResolvedValue(null);

    const res = await scheduleWish("wish-1", "thisMonth");

    expect(res).toEqual({ ok: false, reason: "not_found" });
    expect(updateWish).not.toHaveBeenCalled();
  });

  it("без сессии ничего не делает", async () => {
    getSession.mockResolvedValue(null);

    const res = await scheduleWish("wish-1", "thisWeek");

    expect(res).toEqual({ ok: false, reason: "no_session" });
    expect(findFirstWish).not.toHaveBeenCalled();
  });
});

describe("realizeWish", () => {
  it("помечает прожитым только своё желание", async () => {
    const res = await realizeWish("wish-1");

    expect(res).toEqual({ ok: true });
    expect(updateManyWish).toHaveBeenCalledWith({
      where: { id: "wish-1", userId: "me" },
      data: { status: "REALIZED" },
    });
  });

  it("чужое желание не помечает", async () => {
    updateManyWish.mockResolvedValue({ count: 0 });

    const res = await realizeWish("wish-1");

    expect(res).toEqual({ ok: false, reason: "not_found" });
  });
});
