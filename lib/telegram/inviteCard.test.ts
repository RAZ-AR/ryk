import { describe, expect, it } from "vitest";
import {
  buildInviteCard,
  buildInviteLink,
  type InviteInviter,
  type InviteStoryContext,
} from "./inviteCard";

/*
 * Главное здесь — не happy path, а регрессия на приватность (Flow E,
 * 08-social-and-accountability): свидетель видит только обещание и дату,
 * никогда бюджет или место. Проверяем это даже когда данные ЕСТЬ во
 * входном объекте — значит, их обрезает сама функция, а не вызывающий код.
 */

const STORY: InviteStoryContext = {
  title: "Каякинг на Аде",
  plannedForISO: "2026-07-27",
  location: "Ада Циганлија",
  price: 2200,
  currency: "RSD",
};

const INVITER: InviteInviter = { name: "Артём", username: "raz_ar" };
const LINK = "https://t.me/ryk_life_bot?startapp=inv-1";

const card = (role: "companion" | "witness", story = STORY, inviter = INVITER) =>
  buildInviteCard(role, story, "RU", inviter, LINK);

describe("buildInviteCard", () => {
  it("свидетелю — без места и цены, даже если они есть во входных данных", () => {
    const text = card("witness").messageText;

    expect(text).not.toContain("Ада Циганлија");
    expect(text).not.toContain("2200");
    expect(text).toContain("Каякинг на Аде");
  });

  it("companion — с местом и ценой", () => {
    const text = card("companion").messageText;

    expect(text).toContain("Ада Циганлија");
    expect(text).toContain("2200 RSD");
  });

  it("представляется ботом и называет пригласившего с юзернеймом", () => {
    const text = card("companion").messageText;

    expect(text).toContain("RYK бот");
    expect(text).toContain("Артём (@raz_ar)");
  });

  it("без юзернейма — только имя, без пустых скобок", () => {
    const text = card("companion", STORY, { name: "Артём", username: null }).messageText;

    expect(text).toContain("Артём");
    expect(text).not.toContain("(@");
  });

  it("в обе роли кладёт ссылку-приглашение", () => {
    expect(card("companion").messageText).toContain(LINK);
    expect(card("witness").messageText).toContain(LINK);
  });

  it("бесплатное событие — не пишет «0 RSD»", () => {
    const text = card("companion", { ...STORY, price: 0 }).messageText;
    expect(text).toContain("бесплатно");
    expect(text).not.toContain("0 RSD");
  });

  it("без даты — понятный текст, а не «Invalid Date»", () => {
    const text = card("companion", { ...STORY, plannedForISO: null }).messageText;
    expect(text).not.toMatch(/Invalid/i);
    expect(text).toContain("дата ещё не выбрана");
  });

  it("работает на всех трёх локалях без падений", () => {
    for (const locale of ["RU", "EN", "ES"] as const) {
      const companion = buildInviteCard("companion", STORY, locale, INVITER, LINK);
      const witness = buildInviteCard("witness", STORY, locale, INVITER, LINK);
      expect(companion.messageText).toContain("Каякинг на Аде");
      expect(witness.messageText).toContain("Каякинг на Аде");
      expect(witness.messageText).not.toContain("2200");
      expect(witness.messageText).toContain("Артём");
    }
  });
});

describe("buildInviteLink", () => {
  it("собирает ссылку на Mini App с параметром приглашения", () => {
    expect(buildInviteLink("ryk_life_bot", "abc-123")).toBe(
      "https://t.me/ryk_life_bot?startapp=abc-123",
    );
  });
});
