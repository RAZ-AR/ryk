-- Онбординг узнаёт человека (ryk_docs/22-daily-joy-plan.md, фаза 3):
-- как к нему обращаться, его хороший момент своими словами и маленькие
-- радости «про меня».
--
-- Только ADD COLUMN в существующую таблицу "users": RLS на ней уже включён
-- (20260724210725_enable_rls), политики не нужны — контракт тот же, что в
-- 20260915184400_enable_rls_remaining_tables: PostgREST (anon/authenticated)
-- не читает и не пишет, Prisma как владелец таблиц обходит RLS.
--
-- displayName не заполняем из firstName: null значит «обращаемся по имени
-- из Telegram», и смена имени там продолжит доходить до приложения.

ALTER TABLE "public"."users" ADD COLUMN "displayName" TEXT;
ALTER TABLE "public"."users" ADD COLUMN "goodMoment" TEXT;
ALTER TABLE "public"."users" ADD COLUMN "joyTraits" JSONB NOT NULL DEFAULT '[]';
