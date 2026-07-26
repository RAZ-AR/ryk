import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Карусель на главном сводит два источника в один список: свои
 * подтверждённые истории и принятые приглашения. Проверяем именно склейку
 * и порядок — остальное это тонкий запрос к базе.
 */

const findManyStory = vi.fn();
const findManyInvite = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    weeklyStory: { findMany: (...a: unknown[]) => findManyStory(...a) },
    invite: { findMany: (...a: unknown[]) => findManyInvite(...a) },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  findManyStory.mockResolvedValue([]);
  findManyInvite.mockResolvedValue([]);
});

describe("getUpcoming", () => {
  it("сводит свои истории и принятые приглашения в один список", async () => {
    findManyStory.mockResolvedValue([
      {
        id: "s1",
        plannedFor: new Date("2026-07-29T12:00:00.000Z"),
        companionName: "Федя",
        experience: { title: "Каякинг", category: "NATURE" },
      },
    ]);
    findManyInvite.mockResolvedValue([
      {
        id: "i1",
        inviterName: "Марина",
        weeklyStory: {
          plannedFor: new Date("2026-07-27T12:00:00.000Z"),
          experience: { title: "Джаз", category: "CULTURE" },
        },
      },
    ]);
    const { getUpcoming } = await import("./upcoming");

    const items = await getUpcoming("me");

    expect(items).toHaveLength(2);
    // Ближайшее первым — приглашение на 27-е раньше своей истории на 29-е.
    expect(items[0]).toMatchObject({ title: "Джаз", kind: "invited", withWhom: "Марина" });
    expect(items[1]).toMatchObject({ title: "Каякинг", kind: "mine", withWhom: "Федя" });
  });

  it("события без даты уходят в конец, а не наверх", async () => {
    findManyStory.mockResolvedValue([
      {
        id: "s1",
        plannedFor: null,
        companionName: null,
        experience: { title: "Без даты", category: "REST" },
      },
      {
        id: "s2",
        plannedFor: new Date("2026-07-29T12:00:00.000Z"),
        companionName: null,
        experience: { title: "С датой", category: "JOY" },
      },
    ]);
    const { getUpcoming } = await import("./upcoming");

    const items = await getUpcoming("me");

    expect(items.map((i) => i.title)).toEqual(["С датой", "Без даты"]);
  });

  it("берёт только подтверждённое и только от текущей недели", async () => {
    const { getUpcoming } = await import("./upcoming");
    await getUpcoming("me");

    const where = findManyStory.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ["COMMITTED", "AT_RISK"] });
    // Прошлые недели живут в «Памяти», в карусели их быть не должно.
    expect(where.weekStart.gte).toBeInstanceOf(Date);

    const inviteWhere = findManyInvite.mock.calls[0][0].where;
    expect(inviteWhere.status).toBe("ACCEPTED");
    expect(inviteWhere.recipientId).toBe("me");
  });

  it("истории без впечатления не ломают список", async () => {
    findManyStory.mockResolvedValue([
      { id: "s1", plannedFor: null, companionName: null, experience: null },
    ]);
    const { getUpcoming } = await import("./upcoming");

    expect(await getUpcoming("me")).toEqual([]);
  });
});
