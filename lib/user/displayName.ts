/**
 * Имя для обращения — короткое и одной строкой: оно встаёт в «{имя}, этот
 * день твой», а не в абзац. Пусто или совпадает с именем из Telegram —
 * null: тогда обращаемся по Telegram, и смена имени там доходит до нас,
 * а не замерзает сегодняшним.
 */
export function normalizeDisplayName(
  input: string | null | undefined,
  telegramName?: string | null,
): string | null {
  const name = input?.replace(/\s+/g, " ").trim().slice(0, 60) || null;
  if (!name) return null;
  if (telegramName && name === telegramName.replace(/\s+/g, " ").trim()) return null;
  return name;
}
