import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/*
 * Prisma 7 убрал нативный движок: SQL идёт через driver adapter (`pg`).
 *
 * Синглтон: в dev Next перезагружает модули на каждом изменении,
 * и без кеша в globalThis накапливаются подключения к Postgres.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const adapter = new PrismaPg({
    // Пул Supabase (pgbouncer). Прямое подключение нужно только миграциям.
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
