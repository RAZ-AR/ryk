-- RLS for tables created after 20260724210725_enable_rls, plus Prisma's
-- migration ledger. Same contract as before: no policies — PostgREST
-- (anon/authenticated) cannot read/write; Prisma as table owner BYPASSRLS.

ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."experience_reactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
