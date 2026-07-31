"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setExperienceArchived } from "@/app/actions/concierge";
import { Button } from "@/components/Button";
import { SvcLabel } from "@/components/SvcLabel";
import { intlTag } from "@/lib/i18n/locale";
import styles from "./Concierge.module.css";

export type ExperienceRow = {
  id: string;
  title: string;
  category: string;
  city: string | null;
  location: string | null;
  startTime: string | null;
  price: number | null;
  currency: string;
  bookingUrl: string | null;
  sponsored: boolean;
  archived: boolean;
  /** Сколько раз событие уже становилось чьей-то историей недели. */
  timesChosen: number;
  /** Дата прошла — в кандидатах его больше нет. */
  expired: boolean;
};

export function ExperienceList({ items }: { items: ExperienceRow[] }) {
  const t = useTranslations("concierge");
  const tCat = useTranslations("categories");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  // Порядок дня и месяца у языков разный — формат берём у Intl, не руками.
  const formatDate = (iso: string | null): string =>
    iso
      ? new Date(iso).toLocaleString(intlTag(locale), {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : t("noDate");

  const toggle = (id: string, archived: boolean) =>
    start(async () => {
      const res = await setExperienceArchived(id, archived);
      // Молча проглоченная ошибка здесь опаснее всего: куратор уверен,
      // что снял событие, а оно продолжает уходить людям.
      setFailed(!res.ok);
      if (res.ok) router.refresh();
    });

  if (items.length === 0) {
    return <p className={styles.empty}>{t("listEmpty")}</p>;
  }

  return (
    <>
      {failed && <p className={styles.error}>{t("toggleFailed")}</p>}
      <ul className={styles.list}>
        {items.map((it) => (
          <li key={it.id} className={it.archived ? styles.rowArchived : styles.row2}>
            <div className={styles.rowMain}>
              <div className={styles.rowTitle}>{it.title}</div>
              <div className={styles.rowMeta}>
                {[
                  // Категория подписывается тем же словом, что увидит человек
                  // в приложении: иначе куратор выбирает вслепую.
                  tCat(it.category),
                  it.city,
                  it.location,
                  formatDate(it.startTime),
                  it.price == null
                    ? null
                    : it.price === 0
                      ? t("free")
                      : `${it.price} ${it.currency}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div className={styles.rowFlags}>
                {it.sponsored && <SvcLabel tone="pink">{t("flagSponsored")}</SvcLabel>}
                {it.expired && !it.archived && <SvcLabel tone="faint">{t("flagExpired")}</SvcLabel>}
                {it.archived && <SvcLabel tone="faint">{t("flagArchived")}</SvcLabel>}
                {it.timesChosen > 0 && (
                  <SvcLabel tone="deep">{t("flagChosen", { count: it.timesChosen })}</SvcLabel>
                )}
                {it.bookingUrl && (
                  <a
                    className={styles.link}
                    href={it.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("tickets")}
                  </a>
                )}
              </div>
            </div>
            {/* Ширину задаёт обёртка: примитив на call-site не переопределяем. */}
            <div className={styles.rowAction}>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => toggle(it.id, !it.archived)}
              >
                {it.archived ? t("restore") : t("archive")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
