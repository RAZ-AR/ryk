import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Язык живёт в двух местах — cookie и профиль, — и главное здесь порядок
 * записи. Сначала было наоборот: cookie ставилась до базы, и провал записи
 * оставлял систему в противоречии. Человек нажимал EN, экран не менялся
 * (клиент не обновляет на ошибке), а на следующем переходе приложение
 * внезапно оказывалось английским.
 */

const updateUser = vi.fn();
const setLocaleCookie = vi.fn();
const getSession = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: (...a: unknown[]) => updateUser(...a) } },
}));
vi.mock("@/lib/i18n/localeCookie", () => ({
  setLocaleCookie: (l: string) => setLocaleCookie(l),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: () => getSession() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ userId: "user-1", telegramId: "1" });
  updateUser.mockResolvedValue({});
});

describe("switchLocale", () => {
  it("пишет и в профиль, и в cookie", async () => {
    const { switchLocale } = await import("./locale");

    const res = await switchLocale("en");

    expect(res).toEqual({ ok: true });
    expect(updateUser).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { locale: "EN" } });
    expect(setLocaleCookie).toHaveBeenCalledWith("EN");
  });

  it("при провале базы НЕ трогает cookie — иначе интерфейс расходится с ответом", async () => {
    updateUser.mockRejectedValue(new Error("база недоступна"));
    const { switchLocale } = await import("./locale");

    const res = await switchLocale("es");

    expect(res).toEqual({ ok: false, reason: "db_error" });
    // Вот это и есть суть: неудача не меняет ничего.
    expect(setLocaleCookie).not.toHaveBeenCalled();
  });

  it("гостю профиль не нужен — cookie ставится и без сессии", async () => {
    getSession.mockResolvedValue(null);
    const { switchLocale } = await import("./locale");

    const res = await switchLocale("ru");

    expect(res).toEqual({ ok: true });
    expect(updateUser).not.toHaveBeenCalled();
    expect(setLocaleCookie).toHaveBeenCalledWith("RU");
  });

  it("не верит клиенту: выдуманный язык отбрасывается до всякой записи", async () => {
    const { switchLocale } = await import("./locale");

    for (const bad of ["de", "", "RU; DROP", "../../etc"]) {
      expect(await switchLocale(bad)).toEqual({ ok: false, reason: "bad_locale" });
    }
    expect(updateUser).not.toHaveBeenCalled();
    expect(setLocaleCookie).not.toHaveBeenCalled();
  });
});
