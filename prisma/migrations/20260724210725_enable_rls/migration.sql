-- Включаем Row Level Security на всех таблицах приложения.
-- Prisma подключается как владелец БД (BYPASSRLS) → наш серверный доступ не меняется.
-- Эффект: авто-REST Supabase (anon/публичный ключ) больше не может читать/писать
-- эти таблицы без явных политик. Политик намеренно нет: доступ только через
-- серверный Prisma (ADR-002/003), клиент к этим таблицам напрямую не ходит.

ALTER TABLE "public"."users"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."preferences"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."wishes"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."experiences"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."weekly_stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."memories"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."interventions"  ENABLE ROW LEVEL SECURITY;
