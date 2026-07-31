import { describe, expect, it } from "vitest";
import { normalizeUrl, parseExperienceInput } from "./experienceInput";

/*
 * Проверяем правила, а не поля: что куратор может ввести грязно,
 * и что через форму нельзя протащить опасную ссылку.
 */

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID = { title: "Каякинг на Аде", category: "NATURE" };

describe("parseExperienceInput", () => {
  it("принимает минимум: название и категория", () => {
    const res = parseExperienceInput(form(VALID));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.title).toBe("Каякинг на Аде");
    expect(res.value.currency).toBe("RSD");
    expect(res.value.sponsored).toBe(false);
  });

  it("отклоняет пустое название и чужую категорию", () => {
    const res = parseExperienceInput(form({ title: "  ", category: "SHOPPING" }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors).toContain("title");
    expect(res.errors).toContain("category");
  });

  it("чистит цену, введённую как есть", () => {
    const res = parseExperienceInput(
      form({ ...VALID, price: "2 200 дин", durationMin: "120 мин" }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.price).toBe(2200);
    expect(res.value.durationMin).toBe(120);
  });

  it("дописывает схему ссылке на билеты", () => {
    const res = parseExperienceInput(form({ ...VALID, bookingUrl: "kolarac.rs/tickets" }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.bookingUrl).toBe("https://kolarac.rs/tickets");
  });

  it("не пропускает javascript: в ссылку — по ней кликает пользователь", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    const res = parseExperienceInput(form({ ...VALID, bookingUrl: "javascript:alert(1)" }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors).toContain("bookingUrl");
  });

  it("отклоняет неразбираемую дату, но пустую пропускает", () => {
    expect(parseExperienceInput(form({ ...VALID, startTime: "завтра" })).ok).toBe(false);
    const empty = parseExperienceInput(form({ ...VALID, startTime: "" }));
    expect(empty.ok).toBe(true);
    if (!empty.ok) return;
    expect(empty.value.startTime).toBeNull();
  });

  it("сохраняет отметку «спонсорское» — она обязана дойти до UI", () => {
    const res = parseExperienceInput(form({ ...VALID, sponsored: "on" }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sponsored).toBe(true);
  });
  it("по умолчанию заводит событие — старые формы без поля «тип» не ломаются", () => {
    const res = parseExperienceInput(form(VALID));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.kind).toBe("EVENT");
  });

  it("принимает вызов и ритуал, но не выдуманный тип", () => {
    for (const kind of ["CHALLENGE", "RITUAL"]) {
      const res = parseExperienceInput(form({ ...VALID, kind }));
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.kind).toBe(kind);
    }

    const bad = parseExperienceInput(form({ ...VALID, kind: "PARTY" }));
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.errors).toContain("kind");
  });

  it("нормализует ссылку на афишу и не пускает javascript:", () => {
    const ok = parseExperienceInput(form({ ...VALID, imageUrl: "kolarac.rs/poster.jpg" }));
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.value.imageUrl).toBe("https://kolarac.rs/poster.jpg");

    const bad = parseExperienceInput(form({ ...VALID, imageUrl: "javascript:alert(1)" }));
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.errors).toContain("imageUrl");
  });

  it("собирает переводы из полей вида title_en", () => {
    const res = parseExperienceInput(
      form({
        ...VALID,
        title_en: "Organ evening at Kolarac",
        description_en: "A classical programme by candlelight.",
        location_en: "Kolarac Endowment",
        title_es: "Noche de órgano en Kolarac",
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.translations).toEqual({
      en: {
        title: "Organ evening at Kolarac",
        description: "A classical programme by candlelight.",
        location: "Kolarac Endowment",
      },
      es: { title: "Noche de órgano en Kolarac" },
    });
  });

  /*
   * Перевод не обязателен намеренно: карточку надо успеть завести, пока
   * событие не прошло. Пустая колонка — откат на русский, а не пустая
   * карточка (см. lib/i18n/experience.ts).
   */
  it("пустые переводы не создают мусорную колонку", () => {
    const res = parseExperienceInput(form({ ...VALID, title_en: "  ", description_es: "" }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.translations).toEqual({});
  });
});
