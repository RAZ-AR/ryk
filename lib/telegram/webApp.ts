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
   * Разобранный initData. Подпись здесь НЕ проверена — доверять содержимому
   * нельзя, но `start_param` безопасен: это лишь идентификатор, который мы
   * всё равно перепроверяем в БД по сессии.
   */
  initDataUnsafe?: {
    /** Значение `startapp` из ссылки-приглашения (t.me/bot?startapp=…). */
    start_param?: string;
  };
  /**
   * Открывает пикер чатов Telegram с предзаполненным инлайн-запросом.
   * Единственный доступный Mini App способ «пригласить» кого-то: платформа
   * принципиально не даёт читать контакты/друзей пользователя — человек
   * сам выбирает получателя из своих чатов.
   */
  switchInlineQuery?: (query: string, chatTypes?: TelegramChatType[]) => void;
  isVersionAtLeast?: (version: string) => boolean;
  /** Цвета рамки Mini App: шапка (6.1+, свой hex — 6.9+), фон (6.1+), нижняя панель (7.10+). */
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  /** Тактильный отклик (6.1+). */
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  };
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
  /**
   * Датчик ориентации (Bot API 8.0). Углы — в радианах. В Telegram на iOS
   * это единственный путь к наклону без системного запроса разрешения.
   */
  DeviceOrientation?: {
    start: (params: { refresh_rate?: number; need_absolute?: boolean }) => void;
    stop: () => void;
    isStarted: boolean;
    beta: number | null;
    gamma: number | null;
  };
};

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return (globalThis as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

/** Параметр из ссылки-приглашения, если приложение открыли по ней. */
export function getStartParam(): string | null {
  return getTelegramWebApp()?.initDataUnsafe?.start_param ?? null;
}

/**
 * Лёгкий тактильный отклик на действие. Вне Telegram и в старых версиях
 * молча ничего не делает: это подтверждение, а не обязательная часть.
 */
export function haptic(style: "light" | "medium" = "light"): void {
  const tg = getTelegramWebApp();
  if (!tg?.isVersionAtLeast?.("6.1")) return;
  tg.HapticFeedback?.impactOccurred(style);
}
