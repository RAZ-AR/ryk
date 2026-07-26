import { describe, expect, it } from "vitest";
import { buildInviteCard, type InviteStoryContext } from "./inviteCard";

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

describe("buildInviteCard", () => {
  it("свидетелю — без места и цены, даже если они есть во входных данных", () => {
    const card = buildInviteCard("witness", STORY, "RU");

    expect(card.messageText).not.toContain("Ада Циганлија");
    expect(card.messageText).not.toContain("2200");
    expect(card.messageText).toContain("Каякинг на Аде");
  });

  it("companion — с местом и ценой", () => {
    const card = buildInviteCard("companion", STORY, "RU");

    expect(card.messageText).toContain("Ада Циганлија");
    expect(card.messageText).toContain("2200 RSD");
  });

  it("бесплатное событие — не пишет «0 RSD»", () => {
    const card = buildInviteCard("companion", { ...STORY, price: 0 }, "RU");
    expect(card.messageText).toContain("бесплатно");
    expect(card.messageText).not.toContain("0 RSD");
  });

  it("без даты — понятный текст, а не «Invalid Date»", () => {
    const card = buildInviteCard("companion", { ...STORY, plannedForISO: null }, "RU");
    expect(card.messageText).not.toMatch(/Invalid/i);
    expect(card.messageText).toContain("дата ещё не выбрана");
  });

  it("работает на всех трёх локалях без падений", () => {
    for (const locale of ["RU", "EN", "ES"] as const) {
      const companion = buildInviteCard("companion", STORY, locale);
      const witness = buildInviteCard("witness", STORY, locale);
      expect(companion.messageText).toContain("Каякинг на Аде");
      expect(witness.messageText).toContain("Каякинг на Аде");
      expect(witness.messageText).not.toContain("2200");
    }
  });
});
