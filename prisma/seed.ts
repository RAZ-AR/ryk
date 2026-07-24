import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../generated/prisma/client";

loadEnv({ path: [".env.local", ".env"], quiet: true });

/*
 * Сиды для локальной разработки и пилота.
 * События Белграда и Нови-Сада заводятся вручную куратором (ADR-006):
 * глобальные event-API по Сербии неполны, поэтому каталог — курируемый.
 *
 * Скрипт идемпотентный: повторный запуск не плодит дубли.
 */

const prisma = new PrismaClient({
  // Миграции и сиды идут по прямому подключению, минуя пул.
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

const CURATED_EXPERIENCES = [
  {
    slug: "bg-ada-sunrise-kayak",
    title: "Каякинг на Аде на рассвете",
    description: "Группа до 6 человек, опыт не нужен. Снаряжение включено.",
    category: "NATURE",
    city: "Белград",
    location: "Ада Циганлија",
    durationMin: 120,
    price: 2200,
    distanceKm: 7,
  },
  {
    slug: "bg-kalemegdan-night-walk",
    title: "Ночная прогулка по Калемегдану",
    description: "Крепость, слияние Савы и Дуная, город с высоты. Бесплатно.",
    category: "DISCOVERY",
    city: "Белград",
    location: "Калемегдан",
    durationMin: 90,
    price: 0,
    distanceKm: 3,
  },
  {
    slug: "bg-pottery-workshop",
    title: "Гончарная мастерская для новичков",
    description: "Мастер оставит работу на обжиг. Можно прийти вдвоём.",
    category: "JOY",
    city: "Белград",
    location: "Дорћол",
    durationMin: 150,
    price: 3500,
    distanceKm: 4,
  },
  {
    slug: "bg-kolarac-organ",
    title: "Органный вечер в Коларце",
    description: "Классическая программа при свечах. Билеты обычно есть.",
    category: "CULTURE",
    city: "Белград",
    location: "Задужбина Илије М. Коларца",
    durationMin: 120,
    price: 1800,
    distanceKm: 5,
  },
  {
    slug: "bg-climbing-intro",
    title: "Скалодром: первое занятие",
    description: "Инструктор и снаряжение включены. Можно одному.",
    category: "CHALLENGE",
    city: "Белград",
    location: "Вождовац",
    durationMin: 90,
    price: 1500,
    distanceKm: 8,
  },
  {
    slug: "ns-petrovaradin-sunrise",
    title: "Рассвет на Петроварадинской крепости",
    description: "Дунай в тумане и пустой город внизу. Нужен ранний подъём.",
    category: "NATURE",
    city: "Нови-Сад",
    location: "Петроварадинска тврђава",
    durationMin: 120,
    price: 0,
    distanceKm: 4,
  },
  {
    slug: "ns-danube-cycling",
    title: "Велодень вдоль Дуная",
    description: "Ровный маршрут по набережной, прокат рядом.",
    category: "MOVEMENT",
    city: "Нови-Сад",
    location: "Штранд",
    durationMin: 180,
    price: 900,
    distanceKm: 5,
  },
  {
    slug: "ns-shared-dinner",
    title: "Ужин за общим столом",
    description: "Формат знакомства: восемь человек, домашняя кухня Воеводины.",
    category: "CONNECTION",
    city: "Нови-Сад",
    location: "Центр",
    durationMin: 150,
    price: 2600,
    distanceKm: 2,
  },
] as const;

async function main() {
  // Курируемый каталог впечатлений.
  for (const item of CURATED_EXPERIENCES) {
    const { slug, ...rest } = item;
    const existing = await prisma.experience.findFirst({
      where: { metadata: { path: ["slug"], equals: slug } },
    });

    const data = {
      ...rest,
      source: "CURATED" as const,
      currency: "RSD",
      metadata: { slug },
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

  const total = await prisma.experience.count();
  console.log(`Сиды применены. Впечатлений в каталоге: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
