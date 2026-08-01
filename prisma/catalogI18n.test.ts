import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { CATALOG_I18N } from "./catalogI18n";

/*
 * Каталог обязан быть переведён целиком.
 *
 * Проверка тестом, а не типом: slug'и лежат в массиве обычными строками,
 * литерального union из них нет, и Record<string, …> ничего не гарантирует.
 * Зато тест ловит ровно тот случай, ради которого всё это писалось —
 * куратор добавил карточку и забыл про два языка. Без него испанский
 * пользователь увидел бы посреди ленты русскую строку.
 */

describe("переводы каталога", () => {
  it("есть у каждой карточки, на обоих языках", () => {
    const missing = CATALOG.filter((item) => !CATALOG_I18N[item.slug]).map((i) => i.slug);
    expect(missing).toEqual([]);
  });

  it("не содержат пустых title и description", () => {
    for (const item of CATALOG) {
      for (const locale of ["en", "es"] as const) {
        const t = CATALOG_I18N[item.slug]?.[locale];
        expect(t?.title.trim(), `${item.slug}.${locale}.title`).toBeTruthy();
        expect(t?.description.trim(), `${item.slug}.${locale}.description`).toBeTruthy();
      }
    }
  });

  it("переводят место везде, где оно есть у карточки", () => {
    for (const item of CATALOG) {
      if (!item.location) continue;
      for (const locale of ["en", "es"] as const) {
        const location = CATALOG_I18N[item.slug]?.[locale]?.location;
        expect(location?.trim(), `${item.slug}.${locale}.location`).toBeTruthy();
      }
    }
  });

  it("не переводят карточки, которых в каталоге нет", () => {
    const slugs = new Set(CATALOG.map((i) => i.slug));
    const orphans = Object.keys(CATALOG_I18N).filter((slug) => !slugs.has(slug));
    expect(orphans).toEqual([]);
  });

  it("не оставляют кириллицу в переводе — признак недоделанной карточки", () => {
    const cyrillic = /[А-Яа-яЁё]/;
    const leftovers: string[] = [];
    for (const [slug, translations] of Object.entries(CATALOG_I18N)) {
      for (const locale of ["en", "es"] as const) {
        const t = translations[locale];
        for (const [field, value] of Object.entries(t)) {
          if (typeof value === "string" && cyrillic.test(value)) {
            leftovers.push(`${slug}.${locale}.${field}`);
          }
        }
      }
    }
    expect(leftovers).toEqual([]);
  });
});
