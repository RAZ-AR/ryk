"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/i18n/locale";
import type { DeckCard } from "@/lib/engine/discover";
import { EmptyMark } from "@/components/EmptyMark";
import { ExperienceVisual } from "@/components/ExperiencePattern";
import { Ticket } from "@/components/Ticket";
import { TicketAction } from "@/components/TicketAction";
import styles from "./EventFeed.module.css";

/*
 * Лента билетов на главном: спокойный вертикальный поток, а не колода.
 * Быстрые решения живут в свайп-режиме («По одной →» в шапке ленты) —
 * здесь можно неспешно листать и заходить внутрь.
 */
export function EventFeed({
  deck,
  stamped,
  onOpen,
  onReact,
}: {
  deck: DeckCard[];
  /** Карточки, на которых сейчас растекается оттиск «Интересно». */
  stamped?: ReadonlySet<string>;
  onOpen: (card: DeckCard) => void;
  /** Карточка уходит из ленты сразу — ответ не блокирует остальные. */
  onReact: (card: DeckCard, liked: boolean) => void;
}) {
  const t = useTranslations("home");
  const tDiscover = useTranslations("discover");
  const tCat = useTranslations("categories");
  const tKind = useTranslations("kinds");
  const tWeek = useTranslations("week");
  // Разделитель разрядов свой у каждого языка: 2 200 / 2,200 / 2.200.
  const locale = useLocale();

  if (deck.length === 0) {
    return (
      <div className={styles.empty}>
        <EmptyMark />
        <p>{t("feedEmpty")}</p>
      </div>
    );
  }

  const priceLabel = (price: number | null, currency: string) => {
    if (price == null) return "";
    if (price === 0) return tWeek("priceFree");
    const unit = currency === "RSD" ? tWeek("currencyRSD") : currency;
    return `${formatNumber(price, locale)} ${unit}`;
  };

  const durationLabel = (min: number | null) =>
    min == null
      ? "—"
      : min >= 60
        ? `${formatNumber(min / 60, locale)} ${tWeek("hours")}`
        : `${min} ${tWeek("minutes")}`;

  return (
    <ul className={styles.feed}>
      {deck.map((card) => (
        <li key={card.id}>
          <Ticket
            size="compact"
            photo={
              card.imageUrl ? (
                <ExperienceVisual id={card.id} category={card.category} imageUrl={card.imageUrl} />
              ) : undefined
            }
            metaLeft={durationLabel(card.durationMin)}
            metaRight={priceLabel(card.price, card.currency)}
            // Тип, а не категория: категория и так стоит на корешке,
            // а «вызов себе» против «события» — это разные обещания.
            metaRightSub={tKind(card.kind)}
            title={card.title}
            stubTone="neutral"
            stubLabel={card.sponsored ? tWeek("sponsored") : tCat(card.category)}
            stamped={stamped?.has(card.id)}
            onOpen={() => onOpen(card)}
            openLabel={t("open")}
            actions={
              <>
                <TicketAction
                  tone="no"
                  label={tDiscover("no")}
                  onClick={() => onReact(card, false)}
                />
                <TicketAction
                  tone="yes"
                  label={tDiscover("yes")}
                  onClick={() => onReact(card, true)}
                />
              </>
            }
          >
            {card.location ?? card.description}
          </Ticket>
        </li>
      ))}
    </ul>
  );
}
