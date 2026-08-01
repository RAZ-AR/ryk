"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/i18n/locale";
import { addWish, analyzeWish } from "@/app/actions/wishes";
import type { LifeCategory, WishStatus } from "@/generated/prisma/enums";
import type { StructuredWish } from "@/lib/ai/structureWish";
import { Button } from "@/components/Button";
import { HandNote } from "@/components/HandNote";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./Wishlist.module.css";

export type WishView = {
  id: string;
  text: string;
  category: LifeCategory | null;
  budget: number | null;
  status: WishStatus;
};

type Timing = "SOON" | "THIS_MONTH" | "SOMEDAY";

export function Wishlist({ wishes }: { wishes: WishView[] }) {
  const t = useTranslations("wishes");
  const tCat = useTranslations("categories");
  // Разделитель разрядов свой у каждого языка: 2 200 / 2,200 / 2.200.
  const locale = useLocale();
  const router = useRouter();

  const [mode, setMode] = useState<"list" | "add">("list");
  const [text, setText] = useState("");
  const [structured, setStructured] = useState<StructuredWish | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [saving, startSave] = useTransition();

  const timingLabel = (timing: Timing) =>
    timing === "SOON"
      ? t("timingSOON")
      : timing === "THIS_MONTH"
        ? t("timingTHIS_MONTH")
        : t("timingSOMEDAY");

  const budgetLabel = (budget: number | null) =>
    budget ? `${formatNumber(budget, locale)} ${t("budgetUnit")}` : t("budgetUnknown");

  const resetAdd = () => {
    setMode("list");
    setText("");
    setStructured(null);
  };

  const runAnalyze = () =>
    startAnalyze(async () => {
      const res = await analyzeWish(text);
      if (res.ok) setStructured(res.structured);
    });

  const runSave = () =>
    startSave(async () => {
      if (!structured) return;
      const res = await addWish(text, structured);
      if (res.ok) {
        resetAdd();
        router.refresh();
      }
    });

  // ─────────────── Add view ───────────────
  if (mode === "add") {
    return (
      <div className={styles.wrap}>
        <SvcLabel tone="pink">{t("title")}</SvcLabel>
        <h1 className={styles.addTitle}>{t("addTitle")}</h1>

        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStructured(null);
          }}
          placeholder={t("placeholder")}
          maxLength={500}
        />

        {structured ? (
          <div className={styles.understood}>
            <SvcLabel tone="muted">{t("understood")}</SvcLabel>
            <div className={styles.rows}>
              <div className={styles.understoodRow}>
                <SvcLabel tone="muted">{t("categoryLabel")}</SvcLabel>
                <span className={styles.valuePink}>{tCat(structured.category)}</span>
              </div>
              <div className={styles.understoodRow}>
                <SvcLabel tone="muted">{t("budgetLabel")}</SvcLabel>
                <span className={styles.value}>{budgetLabel(structured.budget)}</span>
              </div>
              <div className={styles.understoodRow}>
                <SvcLabel tone="muted">{t("whenLabel")}</SvcLabel>
                <span className={styles.value}>{timingLabel(structured.timing)}</span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <HandNote>{t("goodMomentNote")}</HandNote>
            </div>
          </div>
        ) : null}

        <div className={styles.actions}>
          {structured ? (
            <Button variant="primary" disabled={saving} onClick={runSave}>
              {saving ? t("saving") : t("save")}
            </Button>
          ) : (
            <Button
              variant="grey"
              disabled={analyzing || text.trim().length < 3}
              onClick={runAnalyze}
            >
              {analyzing ? t("analyzing") : t("analyze")}
            </Button>
          )}
          <Button variant="ghost" onClick={resetAdd}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────── List view ───────────────
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <SvcLabel tone="pink">{t("title")}</SvcLabel>
          <div className={styles.heading}>Wishlist</div>
        </div>
        <span className={styles.count}>{wishes.length}</span>
      </div>

      {wishes.length === 0 ? (
        <p className={styles.empty}>{t("empty")}</p>
      ) : (
        <div className={styles.list}>
          {wishes.map((w) => (
            <div key={w.id} className={styles.row}>
              <div className={styles.rowTop}>
                <span className={styles.rowTitle}>{w.text}</span>
                <SvcLabel tone="muted" className={styles.tag}>
                  {timingLabel(
                    w.status === "THIS_MONTH" || w.status === "SOON" ? w.status : "SOMEDAY",
                  )}
                </SvcLabel>
              </div>
              <div className={styles.rowMeta}>
                <span className={styles.meta}>
                  {w.category ? tCat(w.category) : "—"}
                  {w.budget ? ` · ${budgetLabel(w.budget)}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.addBtn}>
        <Button variant="primary" onClick={() => setMode("add")}>
          {t("add")}
        </Button>
      </div>
    </div>
  );
}
