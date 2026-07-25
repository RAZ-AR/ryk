"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { selectStory } from "@/app/actions/weekly";
import type { Candidate, WeeklyView, WhyCode } from "@/lib/engine/weekly";
import { Button } from "@/components/Button";
import { HandNote } from "@/components/HandNote";
import { SvcLabel } from "@/components/SvcLabel";
import { Ticket } from "@/components/Ticket";
import styles from "./WeekSection.module.css";

export function WeekSection({ view }: { view: WeeklyView }) {
  const t = useTranslations("week");
  const tCat = useTranslations("categories");
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [choosing, startChoose] = useTransition();

  const priceLabel = (price: number | null, currency: string) => {
    if (price == null) return "";
    if (price === 0) return t("priceFree");
    const unit = currency === "RSD" ? t("currencyRSD") : currency;
    return `${price.toLocaleString("ru-RU")} ${unit}`;
  };

  const durationLabel = (min: number | null) => {
    if (min == null) return "—";
    return min >= 60
      ? `${(min / 60).toLocaleString("ru-RU")} ${t("hours")}`
      : `${min} ${t("minutes")}`;
  };

  const whyText = (code: WhyCode, category: string | null) =>
    t(`why.${code}`, { category: category ?? "" });

  // ─────────────── Selected ───────────────
  if (view.kind === "selected") {
    const s = view.story;
    return (
      <div className={styles.wrap}>
        <SvcLabel tone="pink">{t("selectedKicker")}</SvcLabel>
        <div className={styles.ticketWrap}>
          <Ticket
            photoPlaceholder="Ryk"
            metaLeft={durationLabel(null)}
            metaRight={priceLabel(s.price, s.currency)}
            metaRightSub={tCat(s.category)}
            title={s.title}
            stubTone="pink"
            stubLabel={t("selectedStub")}
          >
            <b>{t("whyLabel")}:</b> {whyText(s.whyCode, s.whyCategory ? tCat(s.whyCategory) : null)}
            {s.location ? (
              <>
                <br />
                {s.location}
              </>
            ) : null}
          </Ticket>
        </div>
        <div className={styles.note}>
          <HandNote>{t("selectedNote")}</HandNote>
        </div>
      </div>
    );
  }

  // ─────────────── Choose ───────────────
  const candidates = view.candidates;
  if (candidates.length === 0) {
    return (
      <div className={styles.wrap}>
        <SvcLabel tone="pink">{t("kicker")}</SvcLabel>
        <p className={styles.empty}>{t("empty")}</p>
      </div>
    );
  }

  const c: Candidate = candidates[idx % candidates.length];
  const distance = c.distanceKm != null ? `${c.distanceKm} ${t("km")}` : null;

  const choose = () =>
    startChoose(async () => {
      const res = await selectStory(c.experienceId);
      if (res.ok) router.refresh();
    });

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <SvcLabel tone="pink">{t("kicker")}</SvcLabel>
          <div className={styles.heading}>{t("candidate")}</div>
        </div>
        <span className={styles.counter}>
          {idx + 1}
          <span className={styles.counterTotal}>/{candidates.length}</span>
        </span>
      </div>

      <div className={styles.ticketWrap}>
        <Ticket
          photoPlaceholder="Ryk"
          metaLeft={durationLabel(c.durationMin)}
          metaRight={priceLabel(c.price, c.currency)}
          metaRightSub={tCat(c.category)}
          title={c.title}
          stubTone="pink"
          stubLabel={c.sponsored ? `${t("stubLabel")} · ${t("sponsored")}` : t("stubLabel")}
        >
          <b>{t("whyLabel")}:</b> {whyText(c.whyCode, c.whyCategory ? tCat(c.whyCategory) : null)}
          {c.location || distance ? (
            <>
              <br />
              {[c.location, distance].filter(Boolean).join(" · ")}
            </>
          ) : null}
        </Ticket>
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          className={styles.grow}
          onClick={() => setIdx((i) => (i + 1) % candidates.length)}
        >
          {t("next")}
        </Button>
        <Button variant="primary" className={styles.grow} disabled={choosing} onClick={choose}>
          {choosing ? t("choosing") : t("choose")}
        </Button>
      </div>
    </div>
  );
}
