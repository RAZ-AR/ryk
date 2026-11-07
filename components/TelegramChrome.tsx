"use client";

import { useEffect } from "react";
import { getTelegramWebApp } from "@/lib/telegram/webApp";

/*
 * Красит рамку Telegram (шапку над Mini App, фон под ним и нижнюю панель)
 * в цвет поля приложения — иначе сверху висела полоса цвета темы
 * Telegram, и приложение выглядело вставленным в чужое окно.
 *
 * Монтируется в корневом layout, а не в TelegramBootstrap: тот рисуется
 * только до входа, а с живой сессией страница сразу отдаёт приложение.
 *
 * Цвет берём из токена `--tk-page`, а не пишем литералом: палитра живёт
 * в одном месте (app/tokens.css). SDK грузится async — ждём его немного.
 */
export function TelegramChrome() {
  useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      const tg = getTelegramWebApp();
      tries += 1;
      if (!tg && tries < 25) return;
      window.clearInterval(timer);
      if (!tg?.isVersionAtLeast) return;

      const color = getComputedStyle(document.documentElement).getPropertyValue("--tk-page").trim();
      if (!color) return;
      if (tg.isVersionAtLeast("6.9")) tg.setHeaderColor?.(color);
      if (tg.isVersionAtLeast("6.1")) tg.setBackgroundColor?.(color);
      if (tg.isVersionAtLeast("7.10")) tg.setBottomBarColor?.(color);
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
