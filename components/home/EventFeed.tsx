"use client";

import { useTranslations } from "next-intl";
import type { DeckCard } from "@/lib/engine/discover";
import { Button } from "@/components/Button";
import { Ticket } from "@/components/Ticket";
import styles from "./EventFeed.module.css";

/*
 * Лента билетов на главном: спокойный вертикальный поток, а не колода.
 * Быстрые решения живут в свайп-режиме (кнопка в центре дока) — здесь
 * можно неспешно листать и заходить внутрь.
 */
export function EventFeed({
  deck,
  onOpen,
  onReact,
  busy,
}: {
  deck: DeckCard[];
  onOpen: (card: DeckCard) => void;
  onReact: (card: DeckCard, liked: boolean) => void;
  busy: boolean;
}) {
  const t = useTranslations("home");
  const tDiscover = useTranslations("discover");
  const tCat = useTranslations("categories");
  const tWeek = useTranslations("week");

  if (deck.length === 0) {
    return <p className={styles.empty}>{t("feedEmpty")}</p>;
  }

  const priceLabel = (price: number | null, currency: string) => {
    if (price == null) return "";
    if (price === 0) return tWeek("priceFree");
    const unit = currency === "RSD" ? tWeek("currencyRSD") : currency;
    return `${price.toLocaleString("ru-RU")} ${unit}`;
  };

  const durationLabel = (min: number | null) =>
    min == null
      ? "—"
      : min >= 60
        ? `${(min / 60).toLocaleString("ru-RU")} ${tWeek("hours")}`
        : `${min} ${tWeek("minutes")}`;

  return (
    <ul className={styles.feed}>
      {deck.map((card) => (
        <li key={card.id} className={styles.card}>
          <button type="button" className={styles.open} onClick={() => onOpen(card)}>
            <Ticket
              size="compact"
              photoPlaceholder="Ryk"
              metaLeft={durationLabel(card.durationMin)}
              metaRight={priceLabel(card.price, card.currency)}
              metaRightSub={tCat(card.category)}
              title={card.title}
              stubTone="neutral"
              stubLabel={card.sponsored ? tWeek("sponsored") : tCat(card.category)}
            >
              {card.location ?? card.description}
            </Ticket>
          </button>

          <div className={styles.actions}>
            <Button variant="secondary" disabled={busy} onClick={() => onReact(card, false)}>
              {tDiscover("no")}
            </Button>
            <Button disabled={busy} onClick={() => onReact(card, true)}>
              {tDiscover("yes")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
