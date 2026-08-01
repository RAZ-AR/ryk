import type { Metadata } from "next";
import { Caveat, IBM_Plex_Mono, PT_Serif, Prata } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

/*
 * Гарнитуры (ryk_docs/17-design-system.md §4).
 * Кириллица обязательна: интерфейс en / ru / es.
 *
 * Prata заняла две роли сразу — интерфейс и билет, — поэтому Golos Text
 * и Cormorant больше не грузятся. У Prata единственный вес 400 и нет
 * курсива: иерархия держится на кегле, регистре и трекинге, а не на
 * насыщенности. Синтетический жирный отключён в globals.css — на
 * контрастной антикве он выглядит грязно.
 */

const prata = Prata({
  variable: "--font-prata",
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
  display: "swap",
});

const ptSerif = PT_Serif({
  variable: "--font-pt-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
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

const fontVariables = [prata.variable, ptSerif.variable, plexMono.variable, caveat.variable].join(
  " ",
);

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
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
