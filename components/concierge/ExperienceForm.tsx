"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExperience } from "@/app/actions/concierge";
import { CATEGORIES } from "@/lib/concierge/experienceInput";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./Concierge.module.css";

const CATEGORY_LABELS: Record<string, string> = {
  JOY: "Радость",
  CONNECTION: "Связь",
  DISCOVERY: "Открытие",
  MOVEMENT: "Движение",
  CULTURE: "Культура",
  NATURE: "Природа",
  CHALLENGE: "Вызов",
  REST: "Отдых",
  CONTRIBUTION: "Вклад",
};

/** Ошибки приходят кодами полей — здесь превращаем в человеческий текст. */
const ERROR_LABELS: Record<string, string> = {
  title: "название (минимум 3 символа)",
  category: "категория",
  startTime: "дата и время",
  bookingUrl: "ссылка на билеты",
  forbidden: "нет доступа — войдите заново",
  db_error: "не удалось сохранить",
};

export function ExperienceForm({ defaultCity }: { defaultCity: string }) {
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
      <SvcLabel tone="ink">НОВОЕ СОБЫТИЕ</SvcLabel>

      <label className={styles.field}>
        <span className={styles.label}>Название *</span>
        <Input name="title" required maxLength={140} placeholder="Органный вечер в Коларце" />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Описание</span>
        <Textarea
          name="description"
          maxLength={500}
          placeholder="Что человек получит. Одно-два предложения, без рекламы."
        />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Категория *</span>
          <Select name="category" defaultValue="CULTURE">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] ?? c}
              </option>
            ))}
          </Select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Город</span>
          <Input name="city" defaultValue={defaultCity} maxLength={80} />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Место</span>
        <Input name="location" maxLength={140} placeholder="Коларчева задужбина" />
      </label>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Дата и время</span>
          <Input type="datetime-local" name="startTime" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Длительность, мин</span>
          <Input name="durationMin" inputMode="numeric" placeholder="120" />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Цена</span>
          <Input name="price" inputMode="numeric" placeholder="0 — если бесплатно" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Валюта</span>
          <Input name="currency" defaultValue="RSD" maxLength={8} />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Ссылка на билеты</span>
        <Input name="bookingUrl" maxLength={500} placeholder="kolarac.rs/tickets" />
      </label>

      <label className={styles.checkbox}>
        <input type="checkbox" name="sponsored" />
        <span>Спонсорское — пользователь увидит эту отметку</span>
      </label>

      {errors.length > 0 && (
        <p className={styles.error}>
          Проверьте: {errors.map((e) => ERROR_LABELS[e] ?? e).join(", ")}
        </p>
      )}
      {saved && <p className={styles.ok}>Событие добавлено — оно уже в кандидатах.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем…" : "Добавить событие"}
      </Button>
    </form>
  );
}
