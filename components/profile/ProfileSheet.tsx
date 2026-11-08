"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteAccount, deletePreference, updateProfile } from "@/app/actions/profile";
import type { Locale, PreferenceSentiment, SocialMode } from "@/generated/prisma/enums";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { JOY_TRAITS, type JoyTrait } from "@/lib/engine/dailyJoy";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import styles from "./ProfileSheet.module.css";
import { CityPicker } from "@/components/CityPicker";

export type ProfileView = {
  city: string | null;
  radiusKm: number;
  budgetMax: number | null;
  socialMode: SocialMode | null;
  locale: Locale;
  noveltyRatio: number;
  /** Разрешено ли боту писать первым. */
  nudges: boolean;
  /** Маленькие радости «про меня» — питают радость дня на листе. */
  joyTraits: readonly string[];
  /** Имя из Telegram — подсказка в пустом поле имени. */
  firstName: string | null;
  /** Выбранное имя; null — обращаемся по Telegram. */
  displayName: string | null;
};

export type PreferenceRow = {
  id: string;
  category: string;
  entity: string | null;
  sentiment: PreferenceSentiment;
};

const SOCIAL_KEYS = ["SOLO", "CLOSE_ONES", "NEW_PEOPLE"] as const;
const SOCIAL_I18N_SUFFIX: Record<(typeof SOCIAL_KEYS)[number], string> = {
  SOLO: "Solo",
  CLOSE_ONES: "Close",
  NEW_PEOPLE: "New",
};
const LOCALE_LABELS: Record<Locale, string> = { RU: "Русский", EN: "English", ES: "Español" };

export function ProfileSheet({
  profile,
  preferences,
  onClose,
}: {
  profile: ProfileView;
  preferences: PreferenceRow[];
  onClose: () => void;
}) {
  const t = useTranslations("profile");
  const tCat = useTranslations("categories");
  const router = useRouter();

  const [name, setName] = useState(profile.displayName ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [radiusKm, setRadiusKm] = useState(String(profile.radiusKm));
  const [budgetMax, setBudgetMax] = useState(
    profile.budgetMax != null ? String(profile.budgetMax) : "",
  );
  const [socialMode, setSocialMode] = useState<SocialMode | "">(profile.socialMode ?? "");
  const [locale, setLocale] = useState<Locale>(profile.locale);
  const [noveltyRatio, setNoveltyRatio] = useState(String(profile.noveltyRatio));
  const [nudges, setNudges] = useState(profile.nudges);
  const [traits, setTraits] = useState<ReadonlySet<string>>(() => new Set(profile.joyTraits));
  const toggleTrait = (trait: JoyTrait) =>
    setTraits((prev) => {
      const next = new Set(prev);
      if (next.has(trait)) next.delete(trait);
      else next.add(trait);
      return next;
    });

  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [removing, startRemove] = useTransition();
  const [rows, setRows] = useState(preferences);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  const save = () => {
    setSaved(false);
    setSaveError(false);
    startSave(async () => {
      const res = await updateProfile({
        city: city.trim() || null,
        radiusKm: Number(radiusKm),
        budgetMax: budgetMax.trim() ? Number(budgetMax) : null,
        socialMode: socialMode || null,
        locale,
        noveltyRatio: Number(noveltyRatio),
        nudges,
        joyTraits: [...traits],
        displayName: name,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setSaveError(true);
      }
    });
  };

  const removePreference = (id: string) =>
    startRemove(async () => {
      const res = await deletePreference(id);
      if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
    });

  const runDeleteAccount = () =>
    startDelete(async () => {
      const res = await deleteAccount();
      if (res.ok) router.refresh();
    });

  return (
    <div className={styles.sheet}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <button type="button" className={styles.close} onClick={onClose}>
          {t("close")}
        </button>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("profileTitle")}</h2>

        <label className={styles.field}>
          <span className={styles.label}>{t("nameLabel")}</span>
          <Input
            value={name}
            placeholder={profile.firstName ?? t("namePlaceholder")}
            maxLength={60}
            autoComplete="given-name"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {/* div, а не label: внутри несколько кнопок-чипов, и label передавал бы
            клик по подписи первому из них — Белград выбирался бы сам. */}
        <div className={styles.field}>
          <span className={styles.label}>{t("cityLabel")}</span>
          <CityPicker
            value={city}
            onChange={setCity}
            otherLabel={t("cityOther")}
            placeholder={t("cityPlaceholder")}
            maxLength={80}
          />
        </div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>{t("radiusLabel")}</span>
            <Input
              inputMode="numeric"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("budgetLabel")}</span>
            <Input
              inputMode="numeric"
              placeholder={t("budgetAny")}
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>{t("socialLabel")}</span>
            <Select
              value={socialMode}
              onChange={(e) => setSocialMode(e.target.value as SocialMode | "")}
            >
              <option value="">{t("socialAny")}</option>
              {SOCIAL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`social${SOCIAL_I18N_SUFFIX[key]}`)}
                </option>
              ))}
            </Select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("localeLabel")}</span>
            <Select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
              {(Object.keys(LOCALE_LABELS) as Locale[]).map((key) => (
                <option key={key} value={key}>
                  {LOCALE_LABELS[key]}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>{t("noveltyLabel")}</span>
          <Input
            inputMode="numeric"
            value={noveltyRatio}
            onChange={(e) => setNoveltyRatio(e.target.value.replace(/[^\d]/g, ""))}
          />
        </label>

        {/* Те же радости, что на экране-вдохновении: выбор не должен застывать
            после онбординга. Ничего не выбрано — радость дня из всего каталога. */}
        <div className={styles.field}>
          <span className={styles.label}>{t("joyLabel")}</span>
          <div className={styles.chips}>
            {JOY_TRAITS.map((trait) => (
              <Chip
                key={trait}
                tone="pink"
                selected={traits.has(trait)}
                onClick={() => toggleTrait(trait)}
              >
                {t(`joyTraits.${trait}`)}
              </Chip>
            ))}
          </div>
          <span className={styles.toggleHint}>{t("joyHint")}</span>
        </div>

        <label className={styles.toggle}>
          <input type="checkbox" checked={nudges} onChange={(e) => setNudges(e.target.checked)} />
          <span>
            <span className={styles.toggleLabel}>{t("nudgesLabel")}</span>
            <span className={styles.toggleHint}>{t("nudgesHint")}</span>
          </span>
        </label>

        {saveError && <p className={styles.error}>{t("saveError")}</p>}
        {saved && !saving && <p className={styles.status}>{t("saved")}</p>}
        <Button onClick={save} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("preferencesTitle")}</h2>
        {rows.length === 0 ? (
          <p className={styles.empty}>{t("preferencesEmpty")}</p>
        ) : (
          <ul className={styles.prefList}>
            {rows.map((row) => (
              <li key={row.id} className={styles.prefRow}>
                <div className={styles.prefMain}>
                  <span className={styles.prefEntity}>{row.entity ?? tCat(row.category)}</span>
                  <span className={styles.prefMeta}>
                    {tCat(row.category)} · {t(`sentiment${row.sentiment}`)}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.prefRemove}
                  disabled={removing}
                  onClick={() => removePreference(row.id)}
                >
                  {t("preferenceRemove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("dataTitle")}</h2>
        <Button variant="secondary" onClick={() => window.location.assign("/api/profile/export")}>
          {t("export")}
        </Button>

        <div className={styles.dangerZone}>
          {!confirmingDelete ? (
            <Button variant="secondary" onClick={() => setConfirmingDelete(true)}>
              {t("deleteAccount")}
            </Button>
          ) : (
            <>
              <p className={styles.dangerBody}>{t("deleteConfirmBody")}</p>
              <div className={styles.confirmRow}>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  {t("deleteConfirmCancel")}
                </Button>
                <Button onClick={runDeleteAccount} disabled={deleting}>
                  {deleting ? t("deleting") : t("deleteConfirmYes")}
                </Button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
