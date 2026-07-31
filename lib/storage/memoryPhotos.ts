/*
 * Фотографии воспоминаний в Supabase Storage.
 *
 * Без SDK, обычным fetch — по той же причине, что и Telegram Bot API:
 * нужны три запроса, ради них тянуть зависимость незачем.
 *
 * Бакет приватный. Файл никогда не лежит по публичному адресу: наружу
 * отдаётся только подписанная ссылка с коротким сроком жизни. Это личные
 * фотографии человека, и «неугадываемый URL» — не защита.
 *
 * Без SUPABASE_SERVICE_ROLE_KEY модуль молча выключается, как и аналитика:
 * отсутствие хранилища не должно ломать сохранение впечатления. Человек
 * просто не увидит кнопку загрузки.
 */

const BUCKET = "memories";

/** Час — с запасом на медленную сеть, но ссылка не живёт вечно. */
const SIGNED_URL_TTL_SECONDS = 3600;

/** 8 МБ: снимок с телефона проходит, видео и сканы — нет. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;

function config(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

/** Есть ли куда складывать — от этого зависит, показывать ли загрузку. */
export function isPhotoStorageConfigured(): boolean {
  return config() !== null;
}

/**
 * Заводит приватный бакет, если его ещё нет. Вызывается перед первой
 * загрузкой, чтобы поднятие хранилища не требовало ручных шагов в панели:
 * достаточно вписать ключ.
 */
async function ensureBucket(cfg: { url: string; key: string }): Promise<boolean> {
  const headers = { authorization: `Bearer ${cfg.key}`, apikey: cfg.key };

  const existing = await fetch(`${cfg.url}/storage/v1/bucket/${BUCKET}`, { headers });
  if (existing.ok) return true;

  const created = await fetch(`${cfg.url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: false,
      file_size_limit: MAX_PHOTO_BYTES,
      allowed_mime_types: [...ALLOWED_PHOTO_TYPES],
    }),
  });
  // Гонка двух одновременных загрузок: бакет уже создан соседним запросом.
  if (created.status === 409) return true;
  return created.ok;
}

export type UploadResult = { ok: true; path: string } | { ok: false; reason: string };

/**
 * Кладёт файл и возвращает путь внутри бакета (не ссылку — она протухает).
 * Путь начинается с userId: по нему видно владельца, и его же удобно
 * вычищать целиком при удалении аккаунта.
 */
export async function uploadMemoryPhoto(
  userId: string,
  memoryId: string,
  file: { bytes: ArrayBuffer; type: string },
): Promise<UploadResult> {
  const cfg = config();
  if (!cfg) return { ok: false, reason: "storage_not_configured" };

  if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    return { ok: false, reason: "bad_type" };
  }
  if (file.bytes.byteLength > MAX_PHOTO_BYTES) return { ok: false, reason: "too_large" };

  if (!(await ensureBucket(cfg))) return { ok: false, reason: "bucket_error" };

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${userId}/${memoryId}/${crypto.randomUUID()}.${ext}`;

  const res = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.key}`,
      apikey: cfg.key,
      "content-type": file.type,
    },
    body: file.bytes,
  });
  if (!res.ok) return { ok: false, reason: "upload_failed" };

  return { ok: true, path };
}

/**
 * Подписанная ссылка на просмотр. null — если хранилище не настроено,
 * файл удалён или строка вообще не путь (например, старое значение).
 */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const cfg = config();
  if (!cfg) return null;
  // Готовые http-ссылки (афиши, демо-данные) подписывать не нужно.
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;

  const res = await fetch(`${cfg.url}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.key}`,
      apikey: cfg.key,
      "content-type": "application/json",
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { signedURL?: string };
  return data.signedURL ? `${cfg.url}/storage/v1${data.signedURL}` : null;
}

/** Удаляет файл. Тихо: не удалившееся фото не должно ломать сценарий. */
export async function deleteMemoryPhoto(path: string): Promise<void> {
  const cfg = config();
  if (!cfg || /^https?:\/\//i.test(path)) return;
  await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${cfg.key}`, apikey: cfg.key },
  }).catch(() => undefined);
}
