"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/i18n/locale";
import { applyRescue, deferWeek, startRescue } from "@/app/actions/rescue";
import type { BarrierType } from "@/generated/prisma/enums";
import type { RescueOption } from "@/lib/engine/rescue";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { HandNote } from "@/components/HandNote";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./WeekSection.module.css";

/*
 * Rescue Mission (Flow F): назвать барьер → получить варианты поменьше.
 * Ни одна ветка не заканчивается упрёком — включая «пропустить неделю».
 */

const BARRIERS: readonly BarrierType[] = [
  "WEATHER",
  "NO_ENERGY",
  "TOO_EXPENSIVE",
  "NOT_ALONE",
  "CHANGED_MIND",
];

const ROMAN = ["I", "II", "III"];

export function RescueView({ onBack }: { onBack: () => void }) {
  const t = useTranslations("week");
  const tCat = useTranslations("categories");
  // Разделитель разрядов свой у каждого языка: 2 200 / 2,200 / 2.200.
  const locale = useLocale();
  const router = useRouter();

  const [barrier, setBarrier] = useState<BarrierType | null>(null);
  const [options, setOptions] = useState<RescueOption[] | null>(null);
  const [loading, startLoad] = useTransition();
  const [applying, startApply] = useTransition();
  const [deferring, startDefer] = useTransition();

  const pickBarrier = (b: BarrierType) => {
    setBarrier(b);
    setOptions(null);
    startLoad(async () => {
      const res = await startRescue(b);
      if (res.ok) setOptions(res.options);
    });
  };

  const pick = (experienceId: string) =>
    startApply(async () => {
      const res = await applyRescue(experienceId);
      if (res.ok) router.refresh();
    });

  const defer = () =>
    startDefer(async () => {
      const res = await deferWeek();
      if (res.ok) router.refresh();
    });

  const priceLabel = (price: number | null, currency: string) => {
    if (price == null) return null;
    if (price === 0) return t("priceFree");
    const unit = currency === "RSD" ? t("currencyRSD") : currency;
    return `${formatNumber(price, locale)} ${unit}`;
  };

  const durationLabel = (min: number | null) =>
    min == null
      ? null
      : min >= 60
        ? `${formatNumber(min / 60, locale)} ${t("hours")}`
        : `${min} ${t("minutes")}`;

  return (
    <div className={styles.wrap}>
      <SvcLabel tone="deep">{t("rescueKicker")}</SvcLabel>
      <h1 className={styles.rescueTitle}>{t("rescueTitle")}</h1>

      <div style={{ marginTop: 20 }}>
        <SvcLabel tone="muted">{t("barrierQuestion")}</SvcLabel>
        <div className={styles.chips} style={{ marginTop: 11 }}>
          {BARRIERS.map((b) => (
            <Chip key={b} selected={barrier === b} onClick={() => pickBarrier(b)}>
              {t(`barrier.${b}`)}
            </Chip>
          ))}
        </div>
      </div>

      {loading ? <p className={styles.loading}>{t("rescueLoading")}</p> : null}

      {options && options.length > 0 ? (
        <div className={styles.options}>
          {options.map((o, i) => {
            const meta = [
              tCat(o.category),
              durationLabel(o.durationMin),
              priceLabel(o.price, o.currency),
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={o.experienceId}
                type="button"
                className={styles.option}
                disabled={applying}
                onClick={() => pick(o.experienceId)}
              >
                <span className={styles.optionNum}>{ROMAN[i] ?? i + 1}</span>
                <span>
                  <span className={styles.optionTitle}>{o.title}</span>
                  <span className={styles.optionMeta} style={{ display: "block" }}>
                    {meta}
                  </span>
                </span>
                <span className={styles.optionArrow}>→</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={styles.note}>
        <HandNote>{t("rescueNote")}</HandNote>
      </div>

      <div className={styles.footerCol}>
        <Button variant="secondary" onClick={onBack}>
          {t("backToPlan")}
        </Button>
        <Button variant="ghost" disabled={deferring} onClick={defer}>
          {deferring ? t("deferring") : t("deferWeek")}
        </Button>
      </div>
    </div>
  );
}
