"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { attachMemoryPhoto, removeMemoryPhoto } from "@/app/actions/memoryPhoto";
import { MAX_PHOTO_BYTES } from "@/lib/storage/memoryPhotos";
import styles from "./PhotoButton.module.css";

/*
 * Прикрепить своё фото к прожитой истории.
 *
 * Живёт прямо в кадре «Плёнки», а не отдельным экраном: фото относится
 * к конкретному воспоминанию, и добавлять его логично там, где оно потом
 * и окажется.
 *
 * Кнопки нет вовсе, если хранилище не настроено, — пустой элемент,
 * который всегда возвращает ошибку, хуже, чем его отсутствие.
 */
export function PhotoButton({
  memoryId,
  hasPhoto,
  enabled,
}: {
  memoryId: string;
  hasPhoto: boolean;
  enabled: boolean;
}) {
  const t = useTranslations("memory");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return null;

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Сбрасываем сразу: иначе повторный выбор того же файла не вызовет change.
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      setError(t("photoTooLarge"));
      return;
    }

    setError(null);
    const form = new FormData();
    form.set("memoryId", memoryId);
    form.set("photo", file);

    start(async () => {
      const res = await attachMemoryPhoto(form);
      if (res.ok) router.refresh();
      else setError(t("photoFailed"));
    });
  };

  const remove = () =>
    start(async () => {
      const res = await removeMemoryPhoto(memoryId);
      if (res.ok) router.refresh();
      else setError(t("photoFailed"));
    });

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className={styles.input}
        onChange={pick}
        disabled={pending}
      />
      <button
        type="button"
        className={styles.action}
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? t("photoSaving") : hasPhoto ? t("photoReplace") : t("photoAdd")}
      </button>
      {hasPhoto && !pending && (
        <button type="button" className={styles.action} onClick={remove}>
          {t("photoRemove")}
        </button>
      )}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
