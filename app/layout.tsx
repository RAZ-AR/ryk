import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter_Tight, Source_Serif_4 } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { TelegramChrome } from "@/components/TelegramChrome";
import "./globals.css";

/*
 * Гарнитуры v3 «Одна краска» (ryk_docs/17-design-system.md §4, ADR-017).
 * Кириллица обязательна: интерфейс en / ru / es.
 *
 * Inter Tight — гротеск интерфейса и заголовков, переменная насыщенность.
 * Source Serif 4 — только курсив: вторая строка заголовка и «голос»
 * карточки; ось opsz даёт контрастный рисунок на крупном кегле.
 * IBM Plex Mono — подписи капсом, цены, время.
 */

const grotesk = Inter_Tight({
  variable: "--font-grotesk",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin", "cyrillic"],
  style: ["italic"],
  axes: ["opsz"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
});

/*
 * Заголовок и описание — тоже интерфейс: их видно во вкладке браузера и
 * в превью ссылки, которой человек делится. Поэтому не константа, а
 * generateMetadata: она выполняется в контексте запроса и знает язык.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("title"), description: t("description") };
}

const fontVariables = [grotesk.variable, serif.variable, plexMono.variable].join(" ");

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    // Telegram web-app.js дописывает --tg-viewport-* на <html> до гидрации —
    // это ожидаемо, гасим предупреждение о несовпадении именно для <html>.
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <body>
        {/*
         * SDK Telegram Mini App: даёт window.Telegram.WebApp (initData и т.п.).
         * Не `next/script`: тот рендерит настоящий <script> в дерево React, и React 19
         * ругается «Encountered a script tag while rendering React component», когда
         * этот узел приходится создавать на клиенте, а не гидрировать.
         * `<script async src>` React 19 считает hoistable-ресурсом: поднимает в <head>
         * серверной разметки (браузер находит его preload-сканером ещё раньше, чем
         * рантайм next/script успевал создать тег) и ведёт мимо реконсиляции.
         * Async-загрузка не гарантирует готовность к моменту эффекта — ожидание SDK
         * живёт в components/TelegramBootstrap.tsx.
         */}
        <script async src="https://telegram.org/js/telegram-web-app.js" />
        <TelegramChrome />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
