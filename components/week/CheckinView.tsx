"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { completeStory, deferStory } from "@/app/actions/completion";
import type { Emotion } from "@/generated/prisma/enums";
import type { SelectedStory } from "@/lib/engine/weekly";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Input } from "@/components/Input";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./WeekSection.module.css";

/*
 * Check-in (Flow G): максимум три вопроса — получилось? какое чувство?
 * одна фраза. Кнопка «Перенесено» равноправна с «Сделано»: перенос —
 * нормальный исход, а не провал.
 */

const EMOTIONS: readonly Emotion[] = ["DELIGHT", "CALM", "PRIDE", "CLOSENESS"];

export function CheckinView({ story }: { story: SelectedStory }) {
  const t = useTranslations("week");
  const router = useRouter();

  const [done, setDone] = useState<boolean | null>(null);
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [note, setNote] = useState("");
  const [saving, startSave] = useTransition();
  const [moving, startMove] = useTransition();

  const save = () =>
    startSave(async () => {
      const res = await completeStory({ emotion, note: note || null });
      if (res.ok) router.refresh();
    });

  const move = () =>
    startMove(async () => {
      const res = await deferStory();
      if (res.ok) router.refresh();
    });

  return (
    <div className={styles.wrap}>
      <SvcLabel tone="pink">{t("checkinKicker")}</SvcLabel>
      <h1 className={styles.commitTitle}>{t("checkinTitle")}</h1>
      <div className={styles.storyName}>{t("checkinQuestion", { story: story.title })}</div>

      <div className={styles.actions}>
        <Button
          variant={done === true ? "grey" : "secondary"}
          className={styles.grow}
          onClick={() => setDone(true)}
        >
          {t("done")}
        </Button>
        <Button variant="secondary" className={styles.grow} disabled={moving} onClick={move}>
          {t("moved")}
        </Button>
      </div>

      {done ? (
        <>
          <div style={{ marginTop: 24 }}>
            <SvcLabel tone="muted">{t("emotionQuestion")}</SvcLabel>
            <div className={styles.chips} style={{ marginTop: 11 }}>
              {EMOTIONS.map((e) => (
                <Chip key={e} tone="pink" selected={emotion === e} onClick={() => setEmotion(e)}>
                  {t(`emotion.${e}`)}
                </Chip>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <Input
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              placeholder={t("phrasePlaceholder")}
              maxLength={280}
            />
          </div>

          <div className={styles.footerCol}>
            <Button variant="primary" disabled={saving} onClick={save}>
              {saving ? t("savingMemory") : t("saveMemory")}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
