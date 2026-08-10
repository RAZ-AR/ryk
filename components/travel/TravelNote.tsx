"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { answerTravel } from "@/app/actions/travel";
import type { TravelState } from "@/lib/engine/travel";
import { Button } from "@/components/Button";
import { RykNote } from "@/components/RykNote";
import styles from "./TravelNote.module.css";

/*
 * Реплика Ryk о том, что человек не дома (Flow J).
 *
 * Два вида, и они принципиально разные: город пилота — предложение сменить
 * подбор, город вне пилота — признание, что каталога здесь нет. Смешивать
 * нельзя: во втором случае вопрос «показывать ли Барселону?» был бы враньём.
 *
 * Названия городов стоят отдельной строкой в именительном. «Ты в {город}?»
 * потребовало бы предложного падежа, а город и в базе, и в lib/i18n/city.ts
 * лежит в именительном — склонять пришлось бы вручную и по-разному в трёх
 * языках.
 */
export function TravelNote({ travel }: { travel: TravelState }) {
  const t = useTranslations("travel");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const answer = (accept: boolean) =>
    startTransition(async () => {
      const res = await answerTravel(accept);
      if (res.ok) router.refresh();
    });

  if (travel.kind === "home" || travel.kind === "dismissed") return null;

  if (travel.kind === "away") {
    return (
      <div className={styles.wrap}>
        <RykNote>{t("awayTitle")}</RykNote>
        <p className={styles.body}>{t("awayBody")}</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <RykNote>
        {t("askTitle")}
        <span className={styles.city}>{travel.city}</span>
        {t("askQuestion")}
      </RykNote>
      <div className={styles.actions}>
        <Button variant="grey" disabled={pending} onClick={() => answer(true)}>
          {t("accept")}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => answer(false)}>
          {t("decline")}
        </Button>
      </div>
    </div>
  );
}
