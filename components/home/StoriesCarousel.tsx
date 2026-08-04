"use client";

import { useTranslations } from "next-intl";
import type { UpcomingItem } from "@/lib/engine/upcoming";
import { CategoryIcon } from "@/components/CategoryIcon";
import styles from "./StoriesCarousel.module.css";

/** Ряд предстоящего: своя история недели и события, куда позвали. */
export function StoriesCarousel({ items }: { items: UpcomingItem[] }) {
  const t = useTranslations("home");

  if (items.length === 0) return null;

  const dayLabel = (iso: string | null) => {
    if (!iso) return t("noDate");
    const d = new Date(`${iso}T12:00:00.000Z`);
    return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <ul className={styles.row}>
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className={styles.item}>
          <span
            className={[styles.circle, item.kind === "invited" && styles.invited]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            <CategoryIcon category={item.category} size="m" />
          </span>
          <span className={styles.title}>{item.title}</span>
          <span className={styles.meta}>
            {item.withWhom
              ? `${dayLabel(item.plannedFor)} · ${item.withWhom}`
              : dayLabel(item.plannedFor)}
          </span>
        </li>
      ))}
    </ul>
  );
}
