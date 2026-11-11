"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCardContextText } from "@/components/home/useCardContextText";
import { formatNumber } from "@/lib/i18n/locale";
import { selectStory } from "@/app/actions/weekly";
import type { DeckCard } from "@/lib/engine/discover";
import { Button } from "@/components/Button";
import { ExperienceVisual } from "@/components/ExperiencePattern";
import { PrintArt } from "@/components/PrintArt";
import { HandNote } from "@/components/HandNote";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./EventSheet.module.css";

/*
 * Полная карточка события. Три действия: реакция в обе стороны и «сделать
 * историей недели» — последняя доступна, только если история ещё не выбрана,
 * иначе кнопка обманывала бы (selectStory молча вернёт ok и ничего не сделает).
 *
 * Реакцию отдаём ленте (`onReact`): она прячет карточку сразу и закрывает
 * лист, не дожидаясь базы. Свежую главную приносит ответ действия
 * (revalidatePath), второй router.refresh() не нужен.
 */
export function EventSheet({
  card,
  canPickAsWeek,
  onReact,
  onClose,
}: {
  card: DeckCard;
  canPickAsWeek: boolean;
  onReact: (liked: boolean) => void;
  onClose: () => void;
}) {
  const t = useTranslations("home");
  const ctx = useCardContextText();
  const tDiscover = useTranslations("discover");
  const tCat = useTranslations("categories");
  const tKind = useTranslations("kinds");
  const tWeek = useTranslations("week");
  // Разделитель разрядов свой у каждого языка: 2 200 / 2,200 / 2.200.
  const locale = useLocale();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const pickAsWeek = () =>
    start(async () => {
      const res = await selectStory(card.id);
      if (res.ok) onClose();
      else setFailed(true);
    });

  const priceLabel =
    card.price == null
      ? null
      : card.price === 0
        ? tWeek("priceFree")
        : `${formatNumber(card.price, locale)} ${card.currency === "RSD" ? tWeek("currencyRSD") : card.currency}`;

  const durationLabel =
    card.durationMin == null
      ? null
      : card.durationMin >= 60
        ? `${formatNumber(card.durationMin / 60, locale)} ${tWeek("hours")}`
        : `${card.durationMin} ${tWeek("minutes")}`;

  return (
    <div className={styles.sheet}>
      <header className={styles.header}>
        <SvcLabel tone="pink">{card.sponsored ? tWeek("sponsored") : tCat(card.category)}</SvcLabel>
        <button type="button" className={styles.close} onClick={onClose}>
          {t("close")}
        </button>
      </header>

      {card.imageUrl ? (
        <div className={styles.visual}>
          <ExperienceVisual id={card.id} category={card.category} imageUrl={card.imageUrl} />
        </div>
      ) : (
        // Тот же оттиск, что на карточке в ленте: seed — заголовок.
        <div className={styles.print}>
          <PrintArt seed={card.title} ratio={0.62} />
        </div>
      )}

      {card.when ? <p className={styles.badge}>{ctx.when(card.when)}</p> : null}
      <h1 className={styles.title}>{card.title}</h1>
      {card.description && <p className={styles.description}>{card.description}</p>}
      {card.reason ? (
        <p className={styles.reason}>
          <span className={styles.reasonLabel}>{ctx.reasonLabel}</span>
          {ctx.reason(card.reason)}
        </p>
      ) : null}

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
          <Button variant="secondary" disabled={pending} onClick={() => onReact(false)}>
            {tDiscover("no")}
          </Button>
          <Button
            variant={canPickAsWeek ? "secondary" : "primary"}
            disabled={pending}
            onClick={() => onReact(true)}
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
