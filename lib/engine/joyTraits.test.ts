import { describe, expect, it } from "vitest";
import { JOY_TRAITS, JOYS } from "./dailyJoy";
import { INSPIRE_JOYS, parseJoyTraits, sanitizeJoyTraits, traitsFromText } from "./joyTraits";

/*
 * Черты — тихий сигнал: человек их не видит после онбординга, поэтому
 * ошибка здесь незаметна и копится. Проверяем главное: что с клиента не
 * пролезает мусор и что разбор текста скорее промолчит, чем выдумает.
 */

describe("INSPIRE_JOYS", () => {
  it("каждый мини-билет — настоящая радость каталога и известная черта", () => {
    const keys = new Set(JOYS.map((j) => j.key));
    for (const item of INSPIRE_JOYS) {
      expect(keys.has(item.joyKey)).toBe(true);
      expect(JOY_TRAITS).toContain(item.trait);
    }
    // Черты не повторяются — иначе два билета значили бы одно и то же.
    expect(new Set(INSPIRE_JOYS.map((i) => i.trait)).size).toBe(INSPIRE_JOYS.length);
  });
});

describe("sanitizeJoyTraits", () => {
  it("отбрасывает неизвестное и дубли, порядок — как в каталоге", () => {
    expect(sanitizeJoyTraits(["music", "hacking", "coffee", "music", 7])).toEqual([
      "coffee",
      "music",
    ]);
  });

  it("не массив — пустой список", () => {
    expect(sanitizeJoyTraits("coffee")).toEqual([]);
    expect(parseJoyTraits(null)).toEqual([]);
  });
});

describe("traitsFromText", () => {
  it("находит черты на трёх языках", () => {
    expect(traitsFromText("Гуляли с друзьями у моря")).toEqual(["walks", "friends", "nature"]);
    expect(traitsFromText("A concert with friends")).toEqual(["friends", "music"]);
    expect(traitsFromText("Un café con mi amiga")).toEqual(["coffee", "friends"]);
  });

  it("не путает похожие слова — лучше промолчать", () => {
    // «другой» — не друг, «мороженое» — не море, «лестница» — не лес, «юмор» — не море.
    expect(traitsFromText("В другой раз ели мороженое на лестнице, было много юмора")).toEqual([]);
  });

  it("пустой текст — без черт", () => {
    expect(traitsFromText(null)).toEqual([]);
    expect(traitsFromText("   ")).toEqual([]);
  });
});
