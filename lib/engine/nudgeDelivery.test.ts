import { describe, expect, it } from "vitest";
import { MAX_NUDGES_PER_WEEK, decideDelivery, notificationsEnabled } from "./nudgeDelivery";

/*
 * Эти тесты защищают не код, а обещание: бот не превращается в машину
 * вовлечения. Если один из них когда-нибудь придётся «поправить» ради
 * метрик — это и будет момент, когда продукт свернул не туда.
 */

const decide = (over: Partial<Parameters<typeof decideDelivery>[0]> = {}) =>
  decideDelivery({
    code: "TOMORROW",
    sentThisWeek: [],
    notificationsEnabled: true,
    ...over,
  });

describe("decideDelivery", () => {
  it("пишет, когда есть что предложить", () => {
    expect(decide({ code: "WEATHER_SWAP" })).toEqual({ send: true, code: "WEATHER_SWAP" });
    expect(decide({ code: "TOMORROW" })).toEqual({ send: true, code: "TOMORROW" });
    expect(decide({ code: "INVITE_SOMEONE" })).toEqual({ send: true, code: "INVITE_SOMEONE" });
  });

  it("молчит, когда сказать нечего", () => {
    // «Всё идёт по плану» — сообщение без действия, то есть шум.
    expect(decide({ code: "ON_TRACK" })).toEqual({ send: false, reason: "nothing_to_say" });
    // Тревога без запасного дня делает только хуже.
    expect(decide({ code: "WEATHER_WATCH" })).toEqual({ send: false, reason: "nothing_to_say" });
    // В день события помогать поздно, а «ну что, идёшь?» — это давление.
    expect(decide({ code: "TODAY" })).toEqual({ send: false, reason: "nothing_to_say" });
  });

  it("не повторяет одно и то же за неделю", () => {
    expect(decide({ code: "TOMORROW", sentThisWeek: ["TOMORROW"] })).toEqual({
      send: false,
      reason: "already_said",
    });
  });

  it("держит потолок в два сообщения за неделю", () => {
    const sent = ["WEATHER_SWAP", "INVITE_SOMEONE"] as const;
    expect(sent).toHaveLength(MAX_NUDGES_PER_WEEK);

    expect(decide({ code: "TOMORROW", sentThisWeek: [...sent] })).toEqual({
      send: false,
      reason: "weekly_cap",
    });
  });

  it("выключенные уведомления перекрывают всё остальное", () => {
    expect(decide({ code: "WEATHER_SWAP", notificationsEnabled: false })).toEqual({
      send: false,
      reason: "opted_out",
    });
  });
});

describe("notificationsEnabled", () => {
  it("по умолчанию включено", () => {
    expect(notificationsEnabled({})).toBe(true);
    expect(notificationsEnabled(null)).toBe(true);
    expect(notificationsEnabled(undefined)).toBe(true);
  });

  it("выключается только явным false", () => {
    expect(notificationsEnabled({ nudges: false })).toBe(false);
    expect(notificationsEnabled({ nudges: true })).toBe(true);
    // Мусор в поле не должен случайно выключать связь с человеком.
    expect(notificationsEnabled({ nudges: "нет" })).toBe(true);
  });
});
