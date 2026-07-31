import { describe, expect, it } from "vitest";
import { buildTranslations, localizeExperience, parseTranslations } from "./experience";

/*
 * Правило отката — единственное, что здесь по-настоящему важно.
 * Карточка без перевода обязана показаться на базовом языке: пустой
 * заголовок означал бы, что человек не может выбрать неделю вообще.
 */

const CARD = {
  title: "Каякинг на Аде на рассвете",
  description: "Группа до 6 человек, опыт не нужен.",
  location: "Ада Циганлија",
  translations: {
    en: {
      title: "Sunrise kayaking on Ada",
      description: "Groups of up to six, no experience needed.",
      location: "Ada Ciganlija",
    },
    es: { title: "Kayak al amanecer en Ada" },
  },
};

describe("localizeExperience", () => {
  it("отдаёт перевод целиком, когда он есть", () => {
    expect(localizeExperience(CARD, "en")).toEqual({
      title: "Sunrise kayaking on Ada",
      description: "Groups of up to six, no experience needed.",
      location: "Ada Ciganlija",
    });
  });

  it("откатывается поштучно: переведён заголовок — остальное базовое", () => {
    expect(localizeExperience(CARD, "es")).toEqual({
      title: "Kayak al amanecer en Ada",
      description: "Группа до 6 человек, опыт не нужен.",
      location: "Ада Циганлија",
    });
  });

  it("на базовом языке не заглядывает в переводы", () => {
    expect(localizeExperience(CARD, "ru").title).toBe("Каякинг на Аде на рассвете");
  });

  it("переживает карточку вообще без переводов", () => {
    const bare = { title: "Посадить что-нибудь", description: null, location: null };
    expect(localizeExperience(bare, "en")).toEqual({
      title: "Посадить что-нибудь",
      description: null,
      location: null,
    });
  });

  it("принимает локаль и из БД (RU/EN/ES), и из next-intl (ru/en/es)", () => {
    expect(localizeExperience(CARD, "EN").title).toBe("Sunrise kayaking on Ada");
  });

  it("незнакомый язык — базовый текст, а не пустота", () => {
    expect(localizeExperience(CARD, "de").title).toBe("Каякинг на Аде на рассвете");
  });

  it("не подставляет пустую строку вместо перевода", () => {
    const card = { ...CARD, translations: { en: { title: "   ", description: "Fine" } } };
    const text = localizeExperience(card, "en");
    expect(text.title).toBe("Каякинг на Аде на рассвете");
    expect(text.description).toBe("Fine");
  });
});

describe("parseTranslations", () => {
  it("отбрасывает мусор вместо того, чтобы падать", () => {
    expect(parseTranslations(null)).toEqual({});
    expect(parseTranslations("строка")).toEqual({});
    expect(parseTranslations([1, 2])).toEqual({});
    expect(parseTranslations({ en: 42, xx: { title: "нет такого языка" } })).toEqual({});
  });

  it("не тащит поля, которых у карточки не бывает", () => {
    expect(parseTranslations({ en: { title: "T", price: 100 } })).toEqual({ en: { title: "T" } });
  });
});

describe("buildTranslations", () => {
  it("выбрасывает пустые языки — незаполненная форма не пишет мусор в БД", () => {
    expect(
      buildTranslations({
        en: { title: "Plant something", description: "", location: "" },
        es: { title: "", description: "", location: "" },
      }),
    ).toEqual({ en: { title: "Plant something" } });
  });
});
