"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/i18n/locale";
import { reactToExperience } from "@/app/actions/discover";
import type { DeckCard } from "@/lib/engine/discover";
import { Button } from "@/components/Button";
import { ExperienceVisual } from "@/components/ExperiencePattern";
import { HandNote } from "@/components/HandNote";
import { SvcLabel } from "@/components/SvcLabel";
import { Ticket } from "@/components/Ticket";
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
  const router = useRouter();

  const [idx, setIdx] = useState(0);
  const [saving, startSave] = useTransition();

  const card = deck[idx];

  const decide = (direction: SwipeDirection) => {
    if (!card) return;
    const liked = direction === "right";
    // Карточку сдвигаем сразу: ждать сервер, глядя в застывший экран, незачем.
    setIdx((i) => i + 1);
    startSave(async () => {
      await reactToExperience(card.id, liked);
      router.refresh();
    });
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
            <SwipeCard
              onDecide={decide}
              labelYes={t("verdictYes")}
              labelNo={t("verdictNo")}
              disabled={saving}
            >
              <Ticket
                photo={
                  <ExperienceVisual
                    id={card.id}
                    category={card.category}
                    imageUrl={card.imageUrl}
                  />
                }
                metaLeft={durationLabel(card.durationMin)}
                metaRight={priceLabel(card.price, card.currency)}
                metaRightSub={tKind(card.kind)}
                title={card.title}
                stubTone="neutral"
                stubLabel={card.sponsored ? tWeek("sponsored") : tCat(card.category)}
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
                {t("counter", { current: idx + 1, total: deck.length })}
              </SvcLabel>
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => decide("left")}>
              {t("no")}
            </Button>
            <Button onClick={() => decide("right")}>{t("yes")}</Button>
          </div>
        </>
      )}
    </div>
  );
}
