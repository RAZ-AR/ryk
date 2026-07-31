"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createExperience } from "@/app/actions/concierge";
import { CATEGORIES, KINDS, TRANSLATION_LOCALES } from "@/lib/concierge/experienceInput";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./Concierge.module.css";

/** Коды ошибок с сервера → ключи сообщений. */
const ERROR_KEYS: Record<string, string> = {
  title: "errTitle",
  category: "errCategory",
  kind: "errKind",
  startTime: "errStartTime",
  bookingUrl: "errBookingUrl",
  imageUrl: "errImageUrl",
  forbidden: "errForbidden",
  db_error: "errDbError",
};

/** Подпись языка в блоке переводов. */
const LOCALE_KEYS = { en: "localeEn", es: "localeEs" } as const;

export function ExperienceForm({ defaultCity }: { defaultCity: string }) {
  const t = useTranslations("concierge");
  const tCat = useTranslations("categories");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createExperience(fd);
      if (res.ok) {
        setErrors([]);
        setSaved(true);
        formRef.current?.reset();
        router.refresh();
      } else {
        setSaved(false);
        setErrors(res.reason.split(","));
      }
    });
  };

  return (
    <form ref={formRef} className={styles.form} onSubmit={submit}>
      <SvcLabel tone="ink">{t("newExperience")}</SvcLabel>

      <label className={styles.field}>
        <span className={styles.label}>{t("titleLabel")}</span>
        <Input name="title" required maxLength={140} placeholder={t("titlePlaceholder")} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{t("kindLabel")}</span>
        <Select name="kind" defaultValue="EVENT">
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`kind${k}`)}
            </option>
          ))}
        </Select>
        <span className={styles.hint}>{t("kindHint")}</span>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{t("descriptionLabel")}</span>
        <Textarea name="description" maxLength={500} placeholder={t("descriptionPlaceholder")} />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>{t("categoryLabel")}</span>
          <Select name="category" defaultValue="CULTURE">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tCat(c)}
              </option>
            ))}
          </Select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("cityLabel")}</span>
          <Input name="city" defaultValue={defaultCity} maxLength={80} />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>{t("locationLabel")}</span>
        <Input name="location" maxLength={140} placeholder={t("locationPlaceholder")} />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>{t("startTimeLabel")}</span>
          <Input type="datetime-local" name="startTime" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("durationLabel")}</span>
          <Input name="durationMin" inputMode="numeric" placeholder={t("durationPlaceholder")} />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>{t("priceLabel")}</span>
          <Input name="price" inputMode="numeric" placeholder={t("pricePlaceholder")} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t("currencyLabel")}</span>
          <Input name="currency" defaultValue="RSD" maxLength={8} />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>{t("bookingUrlLabel")}</span>
        <Input name="bookingUrl" maxLength={500} placeholder={t("bookingUrlPlaceholder")} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{t("imageUrlLabel")}</span>
        <Input name="imageUrl" maxLength={500} placeholder={t("imageUrlPlaceholder")} />
        <span className={styles.hint}>{t("imageUrlHint")}</span>
      </label>

      <label className={styles.checkbox}>
        <input type="checkbox" name="sponsored" />
        <span>{t("sponsoredLabel")}</span>
      </label>

      {/*
       * Переводы карточки. Не обязательны: событие надо успеть завести, пока
       * оно не прошло, а текст дописать следующим заходом. Пустой язык —
       * откат на русский, а не пустая карточка (lib/i18n/experience.ts).
       */}
      <SvcLabel tone="ink">{t("translationsTitle")}</SvcLabel>
      <span className={styles.hint}>{t("translationsHint")}</span>

      {/*
       * div со span, а не fieldset с legend: у fieldset своя браузерная рамка,
       * которую сброс в globals.css не снимает (он обнуляет только отступы),
       * а на плоской бумаге она читалась бы как чужой элемент. Группу держит
       * подпись языка, а каждое поле подписано своим aria-label.
       */}
      {TRANSLATION_LOCALES.map((locale) => (
        <div key={locale} className={styles.field}>
          <span className={styles.label}>{t(LOCALE_KEYS[locale])}</span>
          <Input
            name={`title_${locale}`}
            maxLength={140}
            aria-label={`${t("trTitle")} — ${t(LOCALE_KEYS[locale])}`}
            placeholder={t("trTitle")}
          />
          <Textarea
            name={`description_${locale}`}
            maxLength={500}
            aria-label={`${t("trDescription")} — ${t(LOCALE_KEYS[locale])}`}
            placeholder={t("trDescription")}
          />
          <Input
            name={`location_${locale}`}
            maxLength={140}
            aria-label={`${t("trLocation")} — ${t(LOCALE_KEYS[locale])}`}
            placeholder={t("trLocation")}
          />
        </div>
      ))}

      {errors.length > 0 && (
        <p className={styles.error}>
          {t("checkFields", {
            fields: errors.map((e) => (ERROR_KEYS[e] ? t(ERROR_KEYS[e]) : e)).join(", "),
          })}
        </p>
      )}
      {saved && <p className={styles.ok}>{t("saved")}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("submit")}
      </Button>
    </form>
  );
}
