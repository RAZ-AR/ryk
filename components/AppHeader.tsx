"use client";

import { useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { switchLocale } from "@/app/actions/locale";
import { LOCALES, type AppLocale } from "@/lib/i18n/locale";
import styles from "./AppHeader.module.css";

/*
 * Шапка: знак, город и язык.
 *
 * Все трое здесь не случайно — это ответ на «где я и на каком языке»,
 * за которым иначе пришлось бы идти в профиль. Справа место занято
 * профилем и значком приглашений, поэтому блок жмётся влево, а город
 * при нехватке ширины обрезается: язык нужно переключать, название
 * города — только читать.
 */
export function AppHeader({
  label,
  city,
  locale,
  hasBadge,
  onHome,
}: {
  label: string;
  /** Город из профиля. Не задан — строки нет вовсе. */
  city: string | null;
  locale: AppLocale;
  /** Горит ли значок приглашений: от этого зависит ширина шапки. */
  hasBadge: boolean;
  onHome: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const pick = (next: AppLocale) => {
    if (next === locale || pending) return;
    start(async () => {
      const res = await switchLocale(next);
      // Тексты приходят с сервера — без refresh страница осталась бы прежней.
      if (res.ok) router.refresh();
    });
  };

  return (
    <header className={[styles.bar, hasBadge && styles.withBadge].filter(Boolean).join(" ")}>
      <button type="button" className={styles.home} onClick={onHome} aria-label={label}>
        <Image
          src="/ryk-logo-pink.svg"
          alt=""
          width={406}
          height={271}
          unoptimized
          className={styles.mark}
        />
      </button>

      {city && <span className={styles.city}>{city}</span>}

      <div className={styles.locales} role="group" aria-label="Language">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={code === locale}
            disabled={pending}
            className={[styles.locale, code === locale && styles.localeOn]
              .filter(Boolean)
              .join(" ")}
            onClick={() => pick(code)}
          >
            {code}
          </button>
        ))}
      </div>
    </header>
  );
}
