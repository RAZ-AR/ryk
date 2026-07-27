"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { reactToExperience } from "@/app/actions/discover";
import { selectStory } from "@/app/actions/weekly";
import type { DeckCard } from "@/lib/engine/discover";
import { Button } from "@/components/Button";
import { ExperienceVisual } from "@/components/ExperiencePattern";
import { HandNote } from "@/components/HandNote";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./EventSheet.module.css";

/*
 * Полная карточка события. Три действия: реакция в обе стороны и «сделать
 * историей недели» — последняя доступна, только если история ещё не выбрана,
 * иначе кнопка обманывала бы (selectStory молча вернёт ok и ничего не сделает).
 */
export function EventSheet({
  card,
  canPickAsWeek,
  onClose,
}: {
  card: DeckCard;
  canPickAsWeek: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("home");
  const tDiscover = useTranslations("discover");
  const tCat = useTranslations("categories");
  const tKind = useTranslations("kinds");
  const tWeek = useTranslations("week");
  const router = useRouter();

  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const react = (liked: boolean) =>
    start(async () => {
      const res = await reactToExperience(card.id, liked);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setFailed(true);
      }
    });

  const pickAsWeek = () =>
    start(async () => {
      const res = await selectStory(card.id);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setFailed(true);
      }
    });

  const priceLabel =
    card.price == null
      ? null
      : card.price === 0
        ? tWeek("priceFree")
        : `${card.price.toLocaleString("ru-RU")} ${card.currency === "RSD" ? tWeek("currencyRSD") : card.currency}`;

  const durationLabel =
    card.durationMin == null
      ? null
      : card.durationMin >= 60
        ? `${(card.durationMin / 60).toLocaleString("ru-RU")} ${tWeek("hours")}`
        : `${card.durationMin} ${tWeek("minutes")}`;

  return (
    <div className={styles.sheet}>
      <header className={styles.header}>
        <SvcLabel tone="pink">{card.sponsored ? tWeek("sponsored") : tCat(card.category)}</SvcLabel>
        <button type="button" className={styles.close} onClick={onClose}>
          {t("close")}
        </button>
      </header>

      <div className={styles.visual}>
        <ExperienceVisual id={card.id} category={card.category} imageUrl={card.imageUrl} />
      </div>

      <h1 className={styles.title}>{card.title}</h1>
      {card.description && <p className={styles.description}>{card.description}</p>}

      <div className={styles.rows}>
        <div className={styles.row}>
          <SvcLabel tone="muted">{t("kindLabel")}</SvcLabel>
          <span className={styles.value}>{tKind(card.kind)}</span>
        </div>
        {card.location && (
          <div className={styles.row}>
            <SvcLabel tone="muted">{t("placeLabel")}</SvcLabel>
            <span className={styles.value}>{card.location}</span>
          </div>
        )}
        {priceLabel && (
          <div className={styles.row}>
            <SvcLabel tone="muted">{tWeek("budgetLabel")}</SvcLabel>
            <span className={styles.value}>{priceLabel}</span>
          </div>
        )}
        {durationLabel && (
          <div className={styles.row}>
            <SvcLabel tone="muted">{t("durationLabel")}</SvcLabel>
            <span className={styles.value}>{durationLabel}</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {canPickAsWeek && (
          <Button disabled={pending} onClick={pickAsWeek}>
            {t("pickAsWeek")}
          </Button>
        )}
        <div className={styles.split}>
          <Button variant="secondary" disabled={pending} onClick={() => react(false)}>
            {tDiscover("no")}
          </Button>
          <Button
            variant={canPickAsWeek ? "secondary" : "primary"}
            disabled={pending}
            onClick={() => react(true)}
          >
            {tDiscover("yes")}
          </Button>
        </div>
      </div>

      {failed && (
        <div className={styles.note}>
          <HandNote>{t("actionFailed")}</HandNote>
        </div>
      )}
    </div>
  );
}
