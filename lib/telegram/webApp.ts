/*
 * Тип window.Telegram.WebApp — общий для всех мест, где нужен доступ к SDK.
 * Вынесено из TelegramBootstrap.tsx, когда понадобился второй метод
 * (switchInlineQuery) для приглашений.
 */

export type TelegramChatType = "users" | "bots" | "groups" | "channels";

export type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  initData?: string;
  /**
   * Открывает пикер чатов Telegram с предзаполненным инлайн-запросом.
   * Единственный доступный Mini App способ «пригласить» кого-то: платформа
   * принципиально не даёт читать контакты/друзей пользователя — человек
   * сам выбирает получателя из своих чатов.
   */
  switchInlineQuery?: (query: string, chatTypes?: TelegramChatType[]) => void;
};

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return (globalThis as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}
