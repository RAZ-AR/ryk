"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dock, type DockLabels, type DockSection } from "./Dock";
import { SvcLabel } from "./SvcLabel";
import styles from "./AppShell.module.css";

/*
 * Каркас Mini App: контент + плавающий dock (§7).
 * Пока разделы — заглушки; экраны придут в Фазах 4–9.
 */
export function AppShell() {
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
        <header className={styles.header}>
          <SvcLabel tone="pink">{app("weekActive")}</SvcLabel>
          <h1 className={styles.title}>{labels[section]}</h1>
        </header>
        <p className={styles.placeholder}>{app("lead")}</p>
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
