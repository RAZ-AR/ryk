import { describe, expect, it } from "vitest";
import { barrierBoost, type ExperienceForScore } from "./weekly";

/*
 * Онбординг спрашивает «что чаще всего мешает?». Вопрос имеет смысл только
 * если ответ меняет подборку — эти тесты про то, что он её меняет,
 * и меняет в правильную сторону.
 */

const exp = (over: Partial<ExperienceForScore> = {}): ExperienceForScore => ({
  durationMin: 180,
  price: 3000,
  kind: "EVENT",
  ...over,
});

describe("barrierBoost", () => {
  it("без названного препятствия ничего не меняет", () => {
    expect(barrierBoost(null, exp())).toBe(1);
    expect(barrierBoost(null, exp({ price: 0, durationMin: 20, kind: "RITUAL" }))).toBe(1);
  });

  it("«не хватает времени» поднимает то, что помещается в час", () => {
    expect(barrierBoost("NO_TIME", exp({ durationMin: 40 }))).toBeGreaterThan(1);
    expect(barrierBoost("NO_TIME", exp({ durationMin: 60 }))).toBeGreaterThan(1);
    expect(barrierBoost("NO_TIME", exp({ durationMin: 61 }))).toBe(1);
    // Длительность неизвестна — обещать короткое нельзя.
    expect(barrierBoost("NO_TIME", exp({ durationMin: null }))).toBe(1);
  });

  it("«дорого» поднимает только бесплатное", () => {
    expect(barrierBoost("TOO_EXPENSIVE", exp({ price: 0 }))).toBeGreaterThan(1);
    expect(barrierBoost("TOO_EXPENSIVE", exp({ price: 300 }))).toBe(1);
    // Цена не указана — это не то же самое, что бесплатно.
    expect(barrierBoost("TOO_EXPENSIVE", exp({ price: null }))).toBe(1);
  });

  it("«нет сил» поднимает тихое и домашнее", () => {
    expect(barrierBoost("NO_ENERGY", exp({ kind: "RITUAL" }))).toBeGreaterThan(1);
    expect(barrierBoost("NO_ENERGY", exp({ kind: "CHALLENGE" }))).toBe(1);
    expect(barrierBoost("NO_ENERGY", exp({ kind: "EVENT" }))).toBe(1);
  });

  it("не выдумывает обход там, где признака в каталоге нет", () => {
    // «Не хочу идти один» и «страшно» пока не на что опереть: признаков
    // «делают в одиночку» и «маленький шаг» у впечатлений нет, а выводить
    // их из категории значило бы врать в объяснении «почему это подходит».
    for (const e of [exp(), exp({ price: 0 }), exp({ kind: "RITUAL" })]) {
      expect(barrierBoost("NO_COMPANY", e)).toBe(1);
      expect(barrierBoost("FEAR", e)).toBe(1);
    }
  });
});
