import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Аналитика не может быть условием работы продукта: без ключа — молчим,
 * при сбое отправки — не бросаем. Эти два свойства и проверяем.
 */

const capture = vi.fn();
const shutdown = vi.fn(async () => {});

vi.mock("posthog-node", () => ({
  // Именно класс: SDK вызывается через `new PostHog(...)`.
  PostHog: class {
    capture = capture;
    shutdown = shutdown;
  },
}));

const ORIGINAL_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

beforeEach(() => {
  capture.mockClear();
  shutdown.mockClear();
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  else process.env.NEXT_PUBLIC_POSTHOG_KEY = ORIGINAL_KEY;
});

describe("track", () => {
  it("без ключа не отправляет ничего", async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const { track } = await import("./track");

    await track("user-1", { name: "memory_saved", props: { deferred: false } });

    expect(capture).not.toHaveBeenCalled();
  });

  it("с ключом отправляет событие и дожидается флаша", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    const { track } = await import("./track");

    await track("user-1", { name: "barrier_named", props: { barrier: "NO_ENERGY" } });

    expect(capture).toHaveBeenCalledOnce();
    const arg = capture.mock.calls[0][0];
    expect(arg.distinctId).toBe("user-1");
    expect(arg.event).toBe("barrier_named");
    expect(arg.properties.barrier).toBe("NO_ENERGY");
    // Serverless: без флаша событие потерялось бы вместе с процессом.
    expect(shutdown).toHaveBeenCalledOnce();
  });

  it("не бросает, если отправка упала", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    capture.mockImplementationOnce(() => {
      throw new Error("network down");
    });
    const { track } = await import("./track");

    await expect(
      track("user-1", { name: "week_deferred", props: { stage: "plan" } }),
    ).resolves.toBeUndefined();
  });
});
