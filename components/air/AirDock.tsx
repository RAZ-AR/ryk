"use client";

import type { ReactNode } from "react";
import styles from "./AirDock.module.css";

/*
 * Док «Воздуха»: стеклянная капсула из трёх кругов. Активный пункт —
 * тёмная пилюля со знаком и подписью, остальные — только знак
 * (подпись в aria-label). Те же три времени, что в ADR-010.
 */
export type AirDockItem<T extends string> = { id: T; label: string; icon: ReactNode };

export function AirDock<T extends string>({
  items,
  active,
  onNavigate,
  ariaLabel,
}: {
  items: ReadonlyArray<AirDockItem<T>>;
  active: T;
  onNavigate: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <nav className={styles.dock} aria-label={ariaLabel}>
      {items.map((it) => {
        const on = it.id === active;
        return (
          <button
            key={it.id}
            type="button"
            aria-current={on ? "page" : undefined}
            aria-label={it.label}
            className={[styles.item, on && styles.on].filter(Boolean).join(" ")}
            onClick={() => onNavigate(it.id)}
          >
            <span className={styles.icon}>{it.icon}</span>
            <span className={styles.label}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
