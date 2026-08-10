import { describe, expect, it } from "vitest";
import { isTravelMode, travelState } from "./travel";
import { parseDetectedCity } from "@/lib/geo/detectedCity";

const detected = (header: string | null) => parseDetectedCity(header);

describe("travelState", () => {
  it("совпал город — вопроса нет", () => {
    expect(travelState("Белград", null, detected("Belgrade"), "ru")).toEqual({ kind: "home" });
  });

  it("написание из заголовка не считается другим городом", () => {
    // «Нови-Сад» в профиле и «Novi%20Sad» из сети — одно место.
    expect(travelState("Нови-Сад", null, detected("Novi%20Sad"), "ru")).toEqual({ kind: "home" });
  });

  it("сеть промолчала — ведём себя как дома", () => {
    expect(travelState("Белград", null, detected(null), "ru")).toEqual({ kind: "home" });
  });

  it("другой город пилота — спрашиваем, и на языке интерфейса", () => {
    expect(travelState("Белград", null, detected("Novi Sad"), "ru")).toEqual({
      kind: "ask",
      city: "Нови-Сад",
    });
    expect(travelState("Белград", null, detected("Novi Sad"), "en")).toEqual({
      kind: "ask",
      city: "Novi Sad",
    });
  });

  it("про отказанный город второй раз не спрашиваем", () => {
    expect(travelState("Белград", "Нови-Сад", detected("Novi Sad"), "ru")).toEqual({
      kind: "dismissed",
    });
  });

  it("отказ от одного города не гасит вопрос про другой", () => {
    expect(travelState("Белград", "Нови-Сад", detected("Yerevan"), "ru")).toEqual({
      kind: "ask",
      city: "Ереван",
    });
  });

  it("город вне пилота — дорожный режим, а не предложение сменить город", () => {
    const state = travelState("Белград", null, detected("Barcelona"), "ru");
    expect(state).toEqual({ kind: "away", place: "Barcelona" });
    expect(isTravelMode(state)).toBe(true);
  });

  it("без домашнего города не спрашиваем ни о чём", () => {
    // Графу МЕСТО можно пропустить. Подставить определённый город молча —
    // ровно то, чего мы не делаем: это работа онбординга, с подтверждением.
    expect(travelState(null, null, detected("Novi Sad"), "ru")).toEqual({ kind: "home" });
  });

  it("дома дорожного режима нет", () => {
    expect(isTravelMode(travelState("Белград", null, detected("Belgrade"), "ru"))).toBe(false);
  });
});
