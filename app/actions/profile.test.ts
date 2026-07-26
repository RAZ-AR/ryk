import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Личный кабинет — постулат «данные видны, редактируемы, удаляемы».
 * Здесь важно не поведение UI, а то, что действия не выходят за границы
 * своего пользователя и что удаление аккаунта реально стирает данные,
 * а не только помечает их.
 */

const findMany = vi.fn();
const deleteManyPreference = vi.fn();
const deleteManyIntervention = vi.fn();
const deleteManyWeeklyStory = vi.fn();
const deleteManyWish = vi.fn();
const updateUser = vi.fn();
const $transaction = vi.fn(async (ops: unknown[]) => Promise.all(ops));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: updateUser },
    preference: { deleteMany: deleteManyPreference, findMany },
    intervention: { deleteMany: deleteManyIntervention },
    weeklyStory: { deleteMany: deleteManyWeeklyStory },
    wish: { deleteMany: deleteManyWish },
    $transaction,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getSession = vi.fn();
const clearSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getSession: () => getSession(),
  clearSession: () => clearSession(),
}));

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const SESSION = { userId: "user-1", telegramId: "111" };

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(SESSION);
  updateUser.mockResolvedValue({});
  deleteManyPreference.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("deletePreference", () => {
  it("скоупит удаление по userId — нельзя стереть чужую запись голым id", async () => {
    const { deletePreference } = await import("./profile");
    await deletePreference("pref-1");

    expect(deleteManyPreference).toHaveBeenCalledWith({
      where: { id: "pref-1", userId: "user-1" },
    });
  });

  it("без сессии не трогает базу", async () => {
    getSession.mockResolvedValue(null);
    const { deletePreference } = await import("./profile");
    const res = await deletePreference("pref-1");

    expect(res).toEqual({ ok: false, reason: "no_session" });
    expect(deleteManyPreference).not.toHaveBeenCalled();
  });
});

describe("deleteAccount", () => {
  it("стирает зависимые данные и только потом ставит deletedAt", async () => {
    const { deleteAccount } = await import("./profile");
    const res = await deleteAccount();

    expect(res).toEqual({ ok: true });
    expect(deleteManyIntervention).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(deleteManyPreference).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(deleteManyWeeklyStory).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(deleteManyWish).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { deletedAt: expect.any(Date) },
    });
    // Мягкая метка — не единственное действие: без явного удаления строк
    // это была бы деактивация, а не удаление (постулат «удаляема»).
    expect($transaction).toHaveBeenCalledOnce();
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("без сессии не удаляет ничего", async () => {
    getSession.mockResolvedValue(null);
    const { deleteAccount } = await import("./profile");
    const res = await deleteAccount();

    expect(res).toEqual({ ok: false, reason: "no_session" });
    expect($transaction).not.toHaveBeenCalled();
  });
});

describe("updateProfile", () => {
  it("отклоняет значения вне разумного диапазона", async () => {
    const { updateProfile } = await import("./profile");

    const badRadius = await updateProfile({
      city: null,
      radiusKm: 999,
      budgetMax: null,
      socialMode: null,
      locale: "RU",
      noveltyRatio: 30,
    });
    expect(badRadius).toEqual({ ok: false, reason: "bad_radius" });

    const badNovelty = await updateProfile({
      city: null,
      radiusKm: 30,
      budgetMax: null,
      socialMode: null,
      locale: "RU",
      noveltyRatio: 150,
    });
    expect(badNovelty).toEqual({ ok: false, reason: "bad_novelty_ratio" });

    expect(updateUser).not.toHaveBeenCalled();
  });

  it("принимает валидные значения и обрезает город", async () => {
    const { updateProfile } = await import("./profile");
    const res = await updateProfile({
      city: "  Белград  ",
      radiusKm: 25,
      budgetMax: 2000,
      socialMode: "CLOSE_ONES",
      locale: "RU",
      noveltyRatio: 40,
    });

    expect(res).toEqual({ ok: true });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        city: "Белград",
        radiusKm: 25,
        budgetMax: 2000,
        socialMode: "CLOSE_ONES",
        locale: "RU",
        noveltyRatio: 40,
      },
    });
  });
});
