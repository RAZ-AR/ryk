"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Chip } from "@/components/Chip";
import { Input } from "@/components/Input";
import { CITIES, findCity } from "@/lib/cities";
import { DEFAULT_LOCALE, isAppLocale } from "@/lib/i18n/locale";
import styles from "./CityPicker.module.css";

/*
 * Выбор города: пилотные города чипами, остальное — «другой город» и поле.
 *
 * Раньше город был только свободной строкой, и одно место набиралось десятком
 * способов: «Belgrade», «белград », «Beograd». Подбор недели сравнивал их
 * со строкой каталога и молча промахивался. Чипы дают один ответ на пилотный
 * город, а поле остаётся: человек не из пилота не должен врать про Белград,
 * чтобы пройти онбординг.
 *
 * В value для чипа пишем русское имя — то же, что сервер всё равно сохранит
 * как каноническое (lib/cities.ts canonicalCity).
 */

export function CityPicker({
  value,
  onChange,
  otherLabel,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (city: string) => void;
  otherLabel: string;
  placeholder?: string;
  maxLength: number;
}) {
  const rawLocale = useLocale();
  const locale = isAppLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const known = findCity(value);
  // Незнакомый уже введённый город сразу открывает поле: иначе человек
  // не увидел бы своего значения и решил, что оно потерялось.
  const [other, setOther] = useState(() => value.trim() !== "" && known == null);

  return (
    <div className={styles.picker}>
      <div className={styles.chips}>
        {CITIES.map((c) => (
          <Chip
            key={c.id}
            selected={!other && known?.id === c.id}
            onClick={() => {
              setOther(false);
              onChange(c.names.ru);
            }}
          >
            {c.names[locale]}
          </Chip>
        ))}
        <Chip
          selected={other}
          onClick={() => {
            setOther(true);
            // Пилотный город из чипа в поле не переносим: «другой» значит другой.
            if (known) onChange("");
          }}
        >
          {otherLabel}
        </Chip>
      </div>
      {other && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus
        />
      )}
    </div>
  );
}
