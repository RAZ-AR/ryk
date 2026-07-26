import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Приглашение живёт между двумя людьми, поэтому проверяем именно границы:
 * нельзя принять своё, нельзя перехватить чужое, и имя в чужую историю
 * попадает из подписанного профиля, а не из аргумента вызова.
 */

const findUniqueInvite = vi.fn();
const updateManyInvite = vi.fn();
const updateInvite = vi.fn();
const findUniqueUser = vi.fn();
const updateStory = vi.fn();

const tx = {
  invite: { update: updateInvite },
  weeklyStory: { update: updateStory },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invite: {
      findUnique: (...a: unknown[]) => findUniqueInvite(...a),
      updateMany: (...a: unknown[]) => updateManyInvite(...a),
    },
    user: { findUnique: (...a: unknown[]) => findUniqueUser(...a) },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const getSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSession() }));

const ME = { userId: "me", telegramId: "111" };

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(ME);
  updateManyInvite.mockResolvedValue({ count: 1 });
  findUniqueUser.mockResolvedValue({ firstName: "Федя", username: "fedya" });
});

describe("claimInvite", () => {
  it("нельзя забрать собственное приглашение", async () => {
    findUniqueInvite.mockResolvedValue({ id: "i1", inviterId: "me", recipientId: null });
    const { claimInvite } = await import("./invites");

    const res = await claimInvite("i1");

    expect(res).toEqual({ ok: false, reason: "own_invite" });
    expect(updateManyInvite).not.toHaveBeenCalled();
  });

  it("уже занятое кем-то другим — taken", async () => {
    findUniqueInvite.mockResolvedValue({ id: "i1", inviterId: "other", recipientId: "someone" });
    const { claimInvite } = await import("./invites");

    expect(await claimInvite("i1")).toEqual({ ok: false, reason: "taken" });
    expect(updateManyInvite).not.toHaveBeenCalled();
  });

  it("повторный заход тем же человеком — ok, не ломается", async () => {
    findUniqueInvite.mockResolvedValue({ id: "i1", inviterId: "other", recipientId: "me" });
    const { claimInvite } = await import("./invites");

    expect(await claimInvite("i1")).toEqual({ ok: true });
  });

  it("закрепляет с условием recipientId: null — гонку решает БД", async () => {
    findUniqueInvite.mockResolvedValue({ id: "i1", inviterId: "other", recipientId: null });
    const { claimInvite } = await import("./invites");

    expect(await claimInvite("i1")).toEqual({ ok: true });
    expect(updateManyInvite).toHaveBeenCalledWith({
      where: { id: "i1", recipientId: null },
      data: { recipientId: "me" },
    });
  });

  it("если между чтением и записью успел другой — taken, а не молчаливый успех", async () => {
    findUniqueInvite.mockResolvedValue({ id: "i1", inviterId: "other", recipientId: null });
    updateManyInvite.mockResolvedValue({ count: 0 });
    const { claimInvite } = await import("./invites");

    expect(await claimInvite("i1")).toEqual({ ok: false, reason: "taken" });
  });
});

describe("respondInvite", () => {
  const PENDING = {
    id: "i1",
    role: "COMPANION" as const,
    status: "PENDING" as const,
    recipientId: "me",
    weeklyStoryId: "story-1",
  };

  it("принятие пишет имя из профиля в историю приглашающего", async () => {
    findUniqueInvite.mockResolvedValue(PENDING);
    const { respondInvite } = await import("./invites");

    expect(await respondInvite("i1", true)).toEqual({ ok: true });
    expect(updateStory).toHaveBeenCalledWith({
      where: { id: "story-1" },
      data: { companionName: "Федя" },
    });
  });

  it("свидетель пишется в своё поле, не в companionName", async () => {
    findUniqueInvite.mockResolvedValue({ ...PENDING, role: "WITNESS" });
    const { respondInvite } = await import("./invites");

    await respondInvite("i1", true);

    expect(updateStory).toHaveBeenCalledWith({
      where: { id: "story-1" },
      data: { witnessName: "Федя" },
    });
  });

  it("отказ не трогает историю", async () => {
    findUniqueInvite.mockResolvedValue(PENDING);
    const { respondInvite } = await import("./invites");

    expect(await respondInvite("i1", false)).toEqual({ ok: true });
    expect(updateStory).not.toHaveBeenCalled();
    expect(updateInvite).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "DECLINED", respondedAt: expect.any(Date) },
    });
  });

  it("нельзя ответить за чужое приглашение", async () => {
    findUniqueInvite.mockResolvedValue({ ...PENDING, recipientId: "someone-else" });
    const { respondInvite } = await import("./invites");

    expect(await respondInvite("i1", true)).toEqual({ ok: false, reason: "taken" });
    expect(updateStory).not.toHaveBeenCalled();
  });

  it("повторный ответ на уже отвеченное — taken", async () => {
    findUniqueInvite.mockResolvedValue({ ...PENDING, status: "ACCEPTED" });
    const { respondInvite } = await import("./invites");

    expect(await respondInvite("i1", true)).toEqual({ ok: false, reason: "taken" });
  });

  it("без имени в профиле подставляет @username, а не пустоту", async () => {
    findUniqueInvite.mockResolvedValue(PENDING);
    findUniqueUser.mockResolvedValue({ firstName: null, username: "fedya" });
    const { respondInvite } = await import("./invites");

    await respondInvite("i1", true);

    expect(updateStory).toHaveBeenCalledWith({
      where: { id: "story-1" },
      data: { companionName: "@fedya" },
    });
  });
});
