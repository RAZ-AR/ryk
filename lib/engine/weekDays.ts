/*
 * Дни, оставшиеся в текущей неделе, — для выбора дня истории недели.
 *
 * Отдельный модуль, потому что это чистая календарная арифметика: её
 * удобно проверять тестом без БД, а `weekly.ts` про недельный цикл, а не
 * про раскладку дней.
 *
 * Прошедшие дни недели не отдаём вовсе. Показать их выключенными значит
 * сказать «понедельник и вторник ты упустил» — это упрёк, а продукт
 * устроен так, чтобы упрёков не делать (CLAUDE.md, постулат №4).
 *
 * Неделя начинается с понедельника (ADR-004), всё считаем в UTC — как и
 * `weekStartUTC`, иначе на границе суток день уезжает на соседний.
 */

export type WeekDay = {
  /** `YYYY-MM-DD` — то, что уходит в `plannedFor`. */
  iso: string;
  /** 1 = понедельник … 7 = воскресенье. Ключ для подписи в messages. */
  weekday: number;
  /** Число месяца без ведущего нуля — как его пишут на билете. */
  dayOfMonth: number;
};

export function weekDaysFromToday(now: Date = new Date()): WeekDay[] {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0),
  );

  // getUTCDay: 0 — воскресенье. Переводим в 1…7 с понедельника.
  const weekday = today.getUTCDay() === 0 ? 7 : today.getUTCDay();
  const daysLeft = 7 - weekday;

  return Array.from({ length: daysLeft + 1 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      weekday: d.getUTCDay() === 0 ? 7 : d.getUTCDay(),
      dayOfMonth: d.getUTCDate(),
    };
  });
}
