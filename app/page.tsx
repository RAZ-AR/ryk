import { AppShell } from "@/components/AppShell";
import { TelegramBootstrap } from "@/components/TelegramBootstrap";
import { getSession } from "@/lib/auth/session";

/*
 * Точка входа Mini App.
 * Есть сессия → каркас приложения. Нет → вход через Telegram initData
 * (или dev-вход локально).
 */
export default async function Home() {
  const session = await getSession();
  return session ? <AppShell /> : <TelegramBootstrap />;
}
