/*
 * Как «Лист дня» называет дату строки «Скоро» (ryk_docs/22-daily-joy-plan.md).
 *
 * Без «осталось N дней»: обратный отсчёт — то давление, от которого продукт
 * обещает избавить. Поэтому ближнее называем словом, как сказал бы человек
 * («завтра», «в субботу»), а дальше недели — просто датой. Внутри шести дней
 * день недели однозначен; дальше «в субботу» уже путает, какую из суббот.
 *
 * Отдельно от компонента — чтобы правило проверялось тестом без рендера.
 */

export type SoonWhen =
  | { kind: "today" }
  | { kind: "tomorrow" }
  /** 1 — понедельник … 7 — воскресенье, как `Today.weekday`. */
  | { kind: "weekday"; weekday: number }
  | { kind: "date" };

const DAY_MS = 86_400_000;

function utc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** ISO-день недели: 1 — понедельник … 7 — воскресенье. */
export function isoWeekday(iso: string): number {
  const d = new Date(utc(iso)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function soonWhen(todayIso: string, dateIso: string): SoonWhen {
  const days = Math.round((utc(dateIso) - utc(todayIso)) / DAY_MS);
  if (days <= 0) return { kind: "today" };
  if (days === 1) return { kind: "tomorrow" };
  if (days < 7) return { kind: "weekday", weekday: isoWeekday(dateIso) };
  return { kind: "date" };
}
