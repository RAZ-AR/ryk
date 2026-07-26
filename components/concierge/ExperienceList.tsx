"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setExperienceArchived } from "@/app/actions/concierge";
import { Button } from "@/components/Button";
import { SvcLabel } from "@/components/SvcLabel";
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

function formatDate(iso: string | null): string {
  if (!iso) return "без даты";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExperienceList({ items }: { items: ExperienceRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const toggle = (id: string, archived: boolean) =>
    start(async () => {
      const res = await setExperienceArchived(id, archived);
      // Молча проглоченная ошибка здесь опаснее всего: куратор уверен,
      // что снял событие, а оно продолжает уходить людям.
      setFailed(!res.ok);
      if (res.ok) router.refresh();
    });

  if (items.length === 0) {
    return <p className={styles.empty}>Пока ни одного события. Заведите первое.</p>;
  }

  return (
    <>
      {failed && (
        <p className={styles.error}>Не удалось изменить. Обновите страницу и войдите заново.</p>
      )}
      <ul className={styles.list}>
        {items.map((it) => (
          <li key={it.id} className={it.archived ? styles.rowArchived : styles.row2}>
            <div className={styles.rowMain}>
              <div className={styles.rowTitle}>{it.title}</div>
              <div className={styles.rowMeta}>
                {[
                  it.category,
                  it.city,
                  it.location,
                  formatDate(it.startTime),
                  it.price == null
                    ? null
                    : it.price === 0
                      ? "бесплатно"
                      : `${it.price} ${it.currency}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div className={styles.rowFlags}>
                {it.sponsored && <SvcLabel tone="pink">СПОНСОРСКОЕ</SvcLabel>}
                {it.expired && !it.archived && <SvcLabel tone="faint">ДАТА ПРОШЛА</SvcLabel>}
                {it.archived && <SvcLabel tone="faint">СНЯТО С ПОКАЗА</SvcLabel>}
                {it.timesChosen > 0 && <SvcLabel tone="deep">ВЫБРАНО {it.timesChosen}</SvcLabel>}
                {it.bookingUrl && (
                  <a
                    className={styles.link}
                    href={it.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    билеты ↗
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
                {it.archived ? "Вернуть" : "Снять"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
