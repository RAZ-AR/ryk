"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/i18n/locale";
import type { DeckCard } from "@/lib/engine/discover";
import { ExperienceVisual } from "@/components/ExperiencePattern";
import { HandNote } from "@/components/HandNote";
import { SvcLabel } from "@/components/SvcLabel";
import { Ticket } from "@/components/Ticket";
import { TicketAction } from "@/components/TicketAction";
import { useAnsweredDeck } from "@/lib/ui/answeredDeck";
import { SwipeCard, type SwipeDirection } from "./SwipeCard";
import styles from "./DiscoverSection.module.css";

/*
 * Лента впечатлений: по одной карточке, «интересно» / «не интересно»
 * кнопками или свайпом. Понравившееся оседает в вишлисте и поднимается
 * в кандидатах недели, «не интересно» — исчезает из предложений.
 */
export function DiscoverSection({ deck }: { deck: DeckCard[] }) {
  const t = useTranslations("discover");
  const tCat = useTranslations("categories");
  const tKind = useTranslations("kinds");
  const tWeek = useTranslations("week");
  // Разделитель разрядов свой у каждого языка: 2 200 / 2,200 / 2.200.
  const locale = useLocale();
  /*
   * Ответ — без ожидания сервера, по id, а не по номеру позиции
   * (lib/ui/answeredDeck.ts): по номеру колода перескакивала через карточку,
   * когда ответ действия приносил её уже без отвеченной.
   */
  const { visible, answeredCount, react } = useAnsweredDeck(deck);
  const [total] = useState(deck.length);
  const card = visible[0];

  const decide = (direction: SwipeDirection) => {
    if (card) react(card, direction === "right");
  };

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
    <div className={styles.wrap}>
      <header className={styles.header}>
        <SvcLabel tone="pink">{t("kicker")}</SvcLabel>
        <h1 className={styles.title}>{t("title")}</h1>
      </header>

      {!card ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>{t("emptyTitle")}</div>
          <p className={styles.emptyBody}>{t("emptyBody")}</p>
          <HandNote>{t("emptyNote")}</HandNote>
        </div>
      ) : (
        <>
          <p className={styles.hint}>{t("hint")}</p>

          <div className={styles.deck}>
            <SwipeCard onDecide={decide} labelYes={t("verdictYes")} labelNo={t("verdictNo")}>
              <Ticket
                photo={
                  card.imageUrl ? (
                    <ExperienceVisual
                      id={card.id}
                      category={card.category}
                      imageUrl={card.imageUrl}
                    />
                  ) : undefined
                }
                metaLeft={durationLabel(card.durationMin)}
                metaRight={priceLabel(card.price, card.currency)}
                metaRightSub={tKind(card.kind)}
                title={card.title}
                stubTone="neutral"
                stubLabel={card.sponsored ? tWeek("sponsored") : tCat(card.category)}
                /*
                 * Та же отрывная полоса, что в ленте на главном. Она внутри
                 * карточки, а значит едет вместе с ней при свайпе — жест
                 * и нажатие ведут к одному и тому же и выглядят одним целым.
                 */
                actions={
                  <>
                    <TicketAction tone="no" label={t("no")} onClick={() => decide("left")} />
                    <TicketAction tone="yes" label={t("yes")} onClick={() => decide("right")} />
                  </>
                }
              >
                {card.description}
                {card.location ? (
                  <>
                    <br />
                    <b>{card.location}</b>
                  </>
                ) : null}
              </Ticket>
            </SwipeCard>

            <div className={styles.counter}>
              <SvcLabel tone="muted">
                {t("counter", {
                  current: Math.min(answeredCount + 1, total),
                  total,
                })}
              </SvcLabel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
