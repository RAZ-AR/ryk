import { PostHog } from "posthog-node";
import type { RykEvent } from "./events";

/*
 * Отправка событий в PostHog (ADR-005) с серверной стороны.
 *
 * Почему сервер, а не клиент: события воронки происходят в server actions,
 * где мы уже валидируем данные. Серверная отправка не зависит от блокировщиков
 * и не расходится с тем, что реально записалось в БД.
 *
 * Без NEXT_PUBLIC_POSTHOG_KEY — тихий no-op: аналитика не должна быть
 * условием работы продукта.
 */

const DEFAULT_HOST = "https://eu.i.posthog.com";

export async function track(userId: string, event: RykEvent): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_HOST,
    // Serverless: функция может завершиться раньше фонового флаша,
    // поэтому отправляем сразу и ждём shutdown ниже.
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    client.capture({
      distinctId: userId,
      event: event.name,
      properties: {
        ...event.props,
        // Разделяем прод и превью, чтобы тестовый трафик не пачкал воронку.
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      },
    });
    await client.shutdown();
  } catch {
    // Аналитика никогда не ломает пользовательский сценарий.
  }
}
