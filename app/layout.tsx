import type { Metadata } from "next";
import { Caveat, Cormorant, Golos_Text, IBM_Plex_Mono, PT_Serif } from "next/font/google";
import "./globals.css";

/*
 * Пять гарнитур из хендоффа (ryk_docs/17-design-system.md §4).
 * Кириллица обязательна: интерфейс en / ru / es.
 */

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ptSerif = PT_Serif({
  variable: "--font-pt-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const cormorant = Cormorant({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
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

export const metadata: Metadata = {
  title: "Ryk — одна настоящая история каждую неделю",
  description:
    "Персональный AI-компаньон по жизненному опыту: помогает не откладывать жизнь и проживать одно впечатление каждую неделю.",
};

const fontVariables = [
  golos.variable,
  ptSerif.variable,
  cormorant.variable,
  plexMono.variable,
  caveat.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
