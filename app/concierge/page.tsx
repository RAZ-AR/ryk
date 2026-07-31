import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { conciergeSignOut } from "@/app/actions/concierge";
import { ConciergeLogin } from "@/components/concierge/ConciergeLogin";
import { ExperienceForm } from "@/components/concierge/ExperienceForm";
import { ExperienceList, type ExperienceRow } from "@/components/concierge/ExperienceList";
import { SvcLabel } from "@/components/SvcLabel";
import { isConciergeEnabled, isConciergeSignedIn } from "@/lib/concierge/auth";
import { prisma } from "@/lib/prisma";
import styles from "@/components/concierge/Concierge.module.css";

/*
 * Инструмент куратора (Фаза 11, ADR-006): каталог событий Белграда и
 * Нови-Сада ведётся руками, потому что событийные API по Сербии неполны.
 *
 * Внутренний раздел: не индексируется и не существует без CONCIERGE_TOKEN.
 */

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("concierge");
  return { title: t("pageTitle"), robots: { index: false, follow: false } };
}

// Список должен показывать то, что в БД прямо сейчас, а не прошлый рендер.
export const dynamic = "force-dynamic";

const DEFAULT_CITY = "Белград";

export default async function ConciergePage() {
  // Токен не задан — раздела нет вовсе: пустая админка приглашает её ломать.
  if (!isConciergeEnabled()) notFound();

  if (!(await isConciergeSignedIn())) return <ConciergeLogin />;

  const t = await getTranslations("concierge");

  const experiences = await prisma.experience.findMany({
    // Живые события сверху: Postgres по умолчанию кладёт NULL в конец,
    // а здесь NULL — это как раз «показывается».
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      location: true,
      startTime: true,
      price: true,
      currency: true,
      bookingUrl: true,
      sponsored: true,
      archivedAt: true,
      _count: { select: { weeklyStories: true } },
    },
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const items: ExperienceRow[] = experiences.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    city: e.city,
    location: e.location,
    startTime: e.startTime ? e.startTime.toISOString() : null,
    price: e.price,
    currency: e.currency,
    bookingUrl: e.bookingUrl,
    sponsored: e.sponsored,
    archived: e.archivedAt !== null,
    timesChosen: e._count.weeklyStories,
    expired: e.startTime ? e.startTime.toISOString().slice(0, 10) < todayIso : false,
  }));

  const live = items.filter((i) => !i.archived && !i.expired).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          {/* Марка продукта, а не текст интерфейса — не переводится. */}
          <SvcLabel tone="ink">CONCIERGE</SvcLabel>
          <h1 className={styles.title}>{t("catalogTitle")}</h1>
        </div>
        <form action={conciergeSignOut}>
          <button type="submit" className={styles.link}>
            {t("signOut")}
          </button>
        </form>
      </header>

      <SvcLabel tone="muted">{t("inCandidates", { live, total: items.length })}</SvcLabel>

      <ExperienceForm defaultCity={DEFAULT_CITY} />
      <ExperienceList items={items} />
    </main>
  );
}
