import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/*
 * Prisma 7 больше не подхватывает .env сам — загружаем явно.
 * Один источник секретов: `.env.local` (конвенция Next), `.env` — запасной.
 * Реальные значения в репозиторий не попадают: см. .gitignore и .env.example.
 */
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI выполняет миграции, а их нельзя гонять через пул Supabase (pgbouncer) —
    // поэтому здесь предпочитаем прямое подключение DIRECT_URL.
    // Читаем мягко, а не через env(): тот бросает исключение, если переменной нет,
    // и тогда даже `prisma validate`/`generate` не работают без БД — в том числе в CI.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
  },
});
