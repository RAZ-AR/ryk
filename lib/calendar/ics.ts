/*
 * .ics для одной подтверждённой истории недели (RFC 5545).
 *
 * Событие на весь день, не на конкретный час: `WeeklyStory.plannedFor` в базе
 * всегда хранится как T12:00:00Z независимо от реального времени — это дата,
 * не момент. Собрать из этого событие с точным временем значило бы исказить
 * его под таймзону того, кто откроет календарь.
 */

export type IcsEventInput = {
  uid: string;
  title: string;
  /** YYYY-MM-DD. */
  dateISO: string;
  description?: string | null;
  location?: string | null;
};

/** Экранирование текстовых полей по RFC 5545 (§3.3.11). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsDate(dateISO: string): string {
  return dateISO.replaceAll("-", "");
}

/** Следующий день строкой YYYY-MM-DD — DTEND у all-day события не включает сам день. */
function nextDayISO(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildIcs(event: IcsEventInput): string {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ryk//story//RU",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${toIcsDate(event.dateISO)}`,
    `DTEND;VALUE=DATE:${toIcsDate(nextDayISO(event.dateISO))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);

  lines.push("END:VEVENT", "END:VCALENDAR");

  // CRLF — обязателен по спеке, часть клиентов (Outlook) с голым \n не справляется.
  return lines.join("\r\n");
}
