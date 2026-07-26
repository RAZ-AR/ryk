"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SvcLabel } from "./SvcLabel";
import styles from "./TelegramBootstrap.module.css";

/*
 * Вход в Mini App. Берёт initData из Telegram и обменивает на сессию
 * через /api/auth. Вне Telegram (локальная разработка) — dev-вход.
 */

type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  initData?: string;
};

function getTelegram(): TelegramWebApp | undefined {
  return (globalThis as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

/*
 * telegram-web-app.js подключён как `<script async>` (app/layout.tsx), поэтому
 * эффект может отработать раньше, чем SDK объявит window.Telegram. Ждём его
 * появления, но не дольше таймаута: если сети нет, уходим в обычную ветку
 * «не Telegram» (dev-вход локально, ошибка входа в проде).
 */
const SDK_TIMEOUT_MS = 3000;
const SDK_POLL_MS = 25;

async function waitForTelegram(): Promise<TelegramWebApp | undefined> {
  const deadline = Date.now() + SDK_TIMEOUT_MS;
  let tg = getTelegram();
  while (!tg && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, SDK_POLL_MS));
    tg = getTelegram();
  }
  return tg;
}

export function TelegramBootstrap() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const authenticate = async (): Promise<boolean> => {
      const tg = await waitForTelegram();
      tg?.ready?.();
      tg?.expand?.();

      const initData = tg?.initData;
      const isDev = process.env.NODE_ENV === "development";
      const body = initData ? { initData } : isDev ? { dev: true } : null;
      if (!body) return false;

      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        return res.ok;
      } catch {
        return false;
      }
    };

    void authenticate().then((ok) => {
      if (ok) router.refresh();
      else setFailed(true);
    });
  }, [router]);

  return (
    <div className={styles.wrap}>
      <Image
        src="/ryk-logo-pink.svg"
        alt="Ryk"
        width={406}
        height={271}
        unoptimized
        className={styles.logo}
      />
      <SvcLabel tone={failed ? "deep" : "muted"}>{failed ? t("failed") : t("connecting")}</SvcLabel>
    </div>
  );
}
