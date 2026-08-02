"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("app");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const pick = (next: AppLocale) => {
    if (next === locale || pending) return;
    setFailed(false);
    start(async () => {
      const res = await switchLocale(next);
      if (res.ok) {
        // Тексты приходят с сервера — без refresh страница осталась бы прежней.
        router.refresh();
      } else {
        // Молчаливый провал хуже видимого: человек нажал и вправе знать,
        // что ничего не произошло. Место занято, поэтому сообщение занимает
        // слот города — он единственный здесь только для чтения.
        setFailed(true);
      }
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

      {failed ? (
        <span className={styles.failed} role="status">
          {t("localeFailed")}
        </span>
      ) : (
        // title — полное название: на узких экранах строка обрезается.
        city && (
          <span className={styles.city} title={city}>
            {city}
          </span>
        )
      )}

      <div className={styles.locales} role="group" aria-label={t("languageGroup")}>
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
