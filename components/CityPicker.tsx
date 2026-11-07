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
  const [otherChosen, setOtherChosen] = useState(false);
  // Незнакомый введённый город открывает поле всегда, а не только на первом
  // рендере: значение может прийти позже (профиль подгрузился), и человек
  // не должен решить, что его город потерялся. Поэтому режим вычисляем, а не
  // фиксируем в useState.
  const other = otherChosen || (value.trim() !== "" && known == null);
  // Собственный текст поля: если показывать value напрямую, набранный вручную
  // «Belgrade» стал бы известным городом и исчез из поля посреди ввода.
  const [draft, setDraft] = useState("");

  return (
    <div className={styles.picker}>
      <div className={styles.chips}>
        {CITIES.map((c) => (
          <Chip
            key={c.id}
            selected={!other && known?.id === c.id}
            onClick={() => {
              setOtherChosen(false);
              onChange(c.names.ru);
            }}
          >
            {c.names[locale]}
          </Chip>
        ))}
        <Chip
          selected={other}
          onClick={() => {
            // Значение не трогаем: если человек нажал «другой город» и сохранил,
            // ничего не набрав, пустая строка стёрла бы город в профиле
            // (canonicalCity → null). Прежний город живёт, пока не введут новый.
            setDraft(known ? "" : value);
            setOtherChosen(true);
          }}
        >
          {otherLabel}
        </Chip>
      </div>
      {other && (
        <Input
          // Пилотный город из чипа в поле не показываем: «другой» значит другой,
          // поле начинается пустым, а первая же буква заменит прежний город.
          value={otherChosen ? draft : value}
          onChange={(e) => {
            setDraft(e.target.value);
            setOtherChosen(true);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus
        />
      )}
    </div>
  );
}
