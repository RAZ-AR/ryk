/*
 * Ссылка «добавить в Google Calendar» — без файла, без OAuth, работает
 * везде одним тапом. Дополняет .ics, а не заменяет: у людей на Apple/Outlook
 * файл надёжнее ссылки, привязанной к одному провайдеру.
 */

export type GoogleCalendarLinkInput = {
  title: string;
  /** YYYY-MM-DD. */
  dateISO: string;
  details?: string | null;
  location?: string | null;
};

function nextDayISO(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildGoogleCalendarUrl(input: GoogleCalendarLinkInput): string {
  const start = input.dateISO.replaceAll("-", "");
  const end = nextDayISO(input.dateISO).replaceAll("-", "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${start}/${end}`,
  });
  if (input.details) params.set("details", input.details);
  if (input.location) params.set("location", input.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
