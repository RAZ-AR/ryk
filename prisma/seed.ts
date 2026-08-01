import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { CATALOG } from "./catalog";
import { CATALOG_I18N } from "./catalogI18n";

loadEnv({ path: [".env.local", ".env"], quiet: true });

/*
 * Сиды для локальной разработки и пилота.
 * Каталог курируемый (ADR-006) и лежит в ./catalog.ts — там же объяснена
 * пропорция типов: событий меньшинство, большая часть — вызовы и ритуалы.
 * Переводы карточек — в ./catalogI18n.ts, по тому же slug.
 *
 * Скрипт идемпотентный: повторный запуск не плодит дубли, а обновляет
 * существующие строки по metadata.slug.
 */

const prisma = new PrismaClient({
  // Миграции и сиды идут по прямому подключению, минуя пул.
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

async function main() {
  // Курируемый каталог впечатлений.
  for (const item of CATALOG) {
    const { slug, ...rest } = item;
    const existing = await prisma.experience.findFirst({
      where: { metadata: { path: ["slug"], equals: slug } },
    });

    /*
     * Перевода не должно не быть: полноту стережёт catalogI18n.test.ts.
     * Но сид умеет запускаться и на ветке, где тест ещё не гоняли, — тогда
     * лучше остановиться здесь, чем залить в базу карточку, которая
     * у половины пользователей окажется на чужом языке.
     */
    const translations = CATALOG_I18N[slug];
    if (!translations)
      throw new Error(`Нет перевода для карточки «${slug}» (prisma/catalogI18n.ts)`);

    const data = {
      ...rest,
      source: "CURATED" as const,
      currency: "RSD",
      metadata: { slug },
      translations,
    };

    if (existing) {
      await prisma.experience.update({ where: { id: existing.id }, data });
    } else {
      await prisma.experience.create({ data });
    }
  }

  // Локальный пользователь для разработки — не для продакшена.
  if (process.env.NODE_ENV !== "production") {
    await prisma.user.upsert({
      where: { telegramId: "dev-local" },
      update: {},
      create: {
        telegramId: "dev-local",
        locale: "RU",
        city: "Белград",
        onboardingState: "DONE",
        budgetMax: 3000,
        socialMode: "CLOSE_ONES",
      },
    });
  }

  // Печатаем пропорцию: если событий стало больше трети, каталог поехал
  // не туда, и это должно быть видно сразу при запуске сида.
  const byKind = await prisma.experience.groupBy({
    by: ["kind"],
    where: { archivedAt: null },
    _count: true,
  });
  const total = byKind.reduce((sum, row) => sum + row._count, 0);
  const share = (n: number) => `${Math.round((n / total) * 100)}%`;

  console.log(`Сиды применены. Впечатлений в каталоге: ${total}`);
  for (const row of byKind.sort((a, b) => b._count - a._count)) {
    console.log(`  ${row.kind.padEnd(10)} ${String(row._count).padStart(3)}  ${share(row._count)}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
