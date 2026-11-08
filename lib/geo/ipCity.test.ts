import { describe, expect, it } from "vitest";
import { nearestCity } from "@/lib/cities";
import { cityFromIpHeaders } from "./ipCity";

const h = (entries: Record<string, string>) => new Headers(entries);

describe("nearestCity", () => {
  it("узнаёт пилотные города по координатам рядом с центром", () => {
    expect(nearestCity(44.82, 20.46)?.id).toBe("belgrade");
    expect(nearestCity(45.26, 19.84)?.id).toBe("novi-sad");
    expect(nearestCity(40.2, 44.5)?.id).toBe("yerevan");
  });

  it("далеко от пилота — не город, а null", () => {
    // Москва: ближайший пилотный город — за тысячи км.
    expect(nearestCity(55.75, 37.62)).toBeNull();
    // Ниш: Сербия, но не пилотный город.
    expect(nearestCity(43.32, 21.9)).toBeNull();
  });

  it("мусор вместо координат — null", () => {
    expect(nearestCity(Number.NaN, 20)).toBeNull();
  });
});

describe("cityFromIpHeaders", () => {
  it("берёт координаты из заголовков Vercel", () => {
    const city = cityFromIpHeaders(
      h({ "x-vercel-ip-latitude": "40.1811", "x-vercel-ip-longitude": "44.5136" }),
    );
    expect(city?.id).toBe("yerevan");
  });

  it("без заголовков (локально) — null", () => {
    expect(cityFromIpHeaders(h({}))).toBeNull();
  });
});
