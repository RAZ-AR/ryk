"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { reactToExperience } from "@/app/actions/discover";
import type { DeckCard } from "@/lib/engine/discover";
import type { Today } from "@/lib/engine/today";
import type { UpcomingItem } from "@/lib/engine/upcoming";
import type { WeeklyView } from "@/lib/engine/weekly";
import { Button } from "@/components/Button";
import { SvcLabel } from "@/components/SvcLabel";
import { DayLeaf } from "./DayLeaf";
import { EventFeed } from "./EventFeed";
import { EventSheet } from "./EventSheet";
import { StoriesCarousel } from "./StoriesCarousel";
import { WeekBlock } from "./WeekBlock";
import styles from "./HomeSection.module.css";
import { HandNote } from "@/components/HandNote";
import { clearFreshWelcome, peekFreshWelcome } from "@/lib/ui/freshWelcome";

/*
 * Главный экран: лист дня → что впереди (карусель) → состояние недели →
 * лента событий. Лист заменил приветствие-слоган: обещание «одна неделя —
 * одна история» человек уже слышал, а сегодняшний день каждый раз новый.
 * Недельный цикл целиком живёт в WeekSection и открывается по тапу на блок —
 * здесь только его сжатая сводка.
 */
export function HomeSection({
  today,
  upcoming,
  weekly,
  deck,
  onOpenWeek,
  onOpenDeck,
}: {
  today: Today;
  upcoming: UpcomingItem[];
  weekly: WeeklyView;
  deck: DeckCard[];
  onOpenWeek: () => void;
  /** Открыть ту же ленту колодой — по одной карточке со свайпом. */
  onOpenDeck: () => void;
}) {
  const t = useTranslations("home");
  const router = useRouter();

  const [openCard, setOpenCard] = useState<DeckCard | null>(null);
  // Строка для только что прошедшего онбординг — один раз (см. lib/ui/freshWelcome.ts).
  // Читаем в инициализаторе: на сервере хранилища нет и выйдет false, а
  // после онбординга главная монтируется на клиенте без гидратации.
  const [freshWelcome] = useState(peekFreshWelcome);
  useEffect(() => {
    if (freshWelcome) clearFreshWelcome();
  }, [freshWelcome]);
  const [reacting, startReact] = useTransition();

  const react = (card: DeckCard, liked: boolean) =>
    startReact(async () => {
      await reactToExperience(card.id, liked);
      router.refresh();
    });

  return (
    <div className={styles.wrap}>
      <DayLeaf today={today} />

      {/* Первый лист дня и есть финал онбординга: день уже здесь, а неделю
          не торопим — только тихо зовём к ней. */}
      {freshWelcome && (
        <div className={styles.welcome}>
          <HandNote>{t("welcomeLine")}</HandNote>
          <Button variant="link" onClick={onOpenWeek}>
            {t("welcomeAction")}
          </Button>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <SvcLabel tone="muted">{t("upcomingTitle")}</SvcLabel>
          </div>
          <StoriesCarousel items={upcoming} />
        </section>
      )}

      <section className={styles.section}>
        <WeekBlock view={weekly} onOpen={onOpenWeek} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <SvcLabel tone="muted">{t("feedTitle")}</SvcLabel>
          {/* Колода — не отдельный раздел, а второй способ смотреть эту же
              ленту: те же карточки, те же «интересно / не интересно», просто
              по одной. Поэтому вход отсюда, а не из навигации. */}
          {deck.length > 0 && (
            <Button variant="link" onClick={onOpenDeck}>
              {t("oneByOne")}
            </Button>
          )}
        </div>
        <EventFeed deck={deck} onOpen={setOpenCard} onReact={react} busy={reacting} />
      </section>

      {openCard && (
        <EventSheet
          card={openCard}
          canPickAsWeek={weekly.kind === "choose"}
          onClose={() => setOpenCard(null)}
        />
      )}
    </div>
  );
}
