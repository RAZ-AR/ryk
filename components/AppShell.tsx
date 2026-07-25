"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MemorySection } from "@/components/memory/MemorySection";
import { WeekSection } from "@/components/week/WeekSection";
import { Wishlist, type WishView } from "@/components/wishlist/Wishlist";
import type { MemoryView, WeeklyView } from "@/lib/engine/weekly";
import { Dock, type DockLabels, type DockSection } from "./Dock";
import { SvcLabel } from "./SvcLabel";
import styles from "./AppShell.module.css";

/*
 * Каркас Mini App: контент + плавающий dock (§7).
 * Неделя / Желания / Память — живые; Баланс — заглушка (Фаза 10).
 */
export function AppShell({
  wishes,
  weekly,
  memories,
}: {
  wishes: WishView[];
  weekly: WeeklyView;
  memories: MemoryView[];
}) {
  const nav = useTranslations("nav");
  const app = useTranslations("app");
  const [section, setSection] = useState<DockSection>("week");

  const labels: DockLabels = {
    week: nav("week"),
    memory: nav("memory"),
    wishes: nav("wishes"),
    balance: nav("balance"),
  };

  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        {section === "week" ? (
          <WeekSection view={weekly} />
        ) : section === "wishes" ? (
          <Wishlist wishes={wishes} />
        ) : section === "memory" ? (
          <MemorySection memories={memories} />
        ) : (
          <>
            <header className={styles.header}>
              <SvcLabel tone="pink">{app("weekActive")}</SvcLabel>
              <h1 className={styles.title}>{labels[section]}</h1>
            </header>
            <p className={styles.placeholder}>{app("lead")}</p>
          </>
        )}
      </div>
      <Dock
        active={section}
        onNavigate={setSection}
        labels={labels}
        ariaLabel={app("weekActive")}
      />
    </div>
  );
}
