"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { DiscoverSection } from "@/components/discover/DiscoverSection";
import { HomeSection } from "@/components/home/HomeSection";
import { InviteBadge } from "@/components/invite/InviteBadge";
import { InviteClaimer } from "@/components/invite/InviteClaimer";
import { InviteSheet, type InviteView } from "@/components/invite/InviteSheet";
import { MemorySection } from "@/components/memory/MemorySection";
import { ProfileEntry } from "@/components/profile/ProfileEntry";
import {
  ProfileSheet,
  type PreferenceRow,
  type ProfileView,
} from "@/components/profile/ProfileSheet";
import { WeekSection } from "@/components/week/WeekSection";
import { Wishlist, type WishView } from "@/components/wishlist/Wishlist";
import type { DeckCard } from "@/lib/engine/discover";
import type { UpcomingItem } from "@/lib/engine/upcoming";
import type { MemoryView, WeeklyView } from "@/lib/engine/weekly";
import type { YearView } from "@/lib/engine/year";
import { isAppLocale, DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { AppHeader } from "./AppHeader";
import { Dock, type DockLabels, type DockSection } from "./Dock";
import styles from "./AppShell.module.css";

/*
 * Каркас Mini App: контент + плавающий dock (§7) + логотип-возврат,
 * личный кабинет и приглашения.
 *
 * Три раздела по времени: «Сейчас» (неделя и лента), «Хочу» (желания),
 * «Было» (архив и год). Недельный цикл и колода — оверлеи поверх них,
 * а не собственные вершины навигации.
 */
export function AppShell({
  wishes,
  weekly,
  memories,
  profile,
  preferences,
  invites,
  deck,
  upcoming,
  year,
  canAttachPhoto,
  locale,
  city,
}: {
  wishes: WishView[];
  weekly: WeeklyView;
  memories: MemoryView[];
  profile: ProfileView;
  preferences: PreferenceRow[];
  invites: InviteView[];
  deck: DeckCard[];
  upcoming: UpcomingItem[];
  year: YearView;
  canAttachPhoto: boolean;
  /** Язык текущего рендера — из cookie, а не из профиля. */
  locale: string;
  /** Город на языке интерфейса; сырое значение живёт в profile.city. */
  city: string | null;
}) {
  const nav = useTranslations("nav");
  const app = useTranslations("app");
  const tProfile = useTranslations("profile");
  const tInvites = useTranslations("invites");
  const [section, setSection] = useState<DockSection>("now");
  const [profileOpen, setProfileOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  /** Полный недельный цикл — оверлей поверх главного, а не отдельная секция. */
  const [weekOpen, setWeekOpen] = useState(false);
  /*
   * Колода — тоже оверлей. Разделом она была дублем: та же `deck`, те же
   * «интересно / не интересно», что в ленте на главном, — отличалась только
   * подача. Две вершины навигации в одно содержимое.
   */
  const [deckOpen, setDeckOpen] = useState(false);

  // Пришли по ссылке — открываем приглашения сразу: человек за этим и пришёл,
  // прятать их за значком было бы издевательством.
  const openInvites = useCallback(() => setInvitesOpen(true), []);

  const labels: DockLabels = {
    now: nav("now"),
    wish: nav("wish"),
    past: nav("past"),
  };

  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        {section === "now" ? (
          <HomeSection
            upcoming={upcoming}
            weekly={weekly}
            deck={deck}
            onOpenWeek={() => setWeekOpen(true)}
            onOpenDeck={() => setDeckOpen(true)}
          />
        ) : section === "wish" ? (
          <Wishlist wishes={wishes} onOpenWeek={() => setWeekOpen(true)} />
        ) : (
          <MemorySection memories={memories} year={year} canAttachPhoto={canAttachPhoto} />
        )}
      </div>
      <Dock
        active={section}
        onNavigate={setSection}
        labels={labels}
        // Имя навигации, а не состояние недели: скринридер читает его вместо
        // «Week active», которое сюда попало по недосмотру и ничего не значило.
        ariaLabel={nav("aria")}
      />
      <AppHeader
        label={app("home")}
        city={city}
        hasBadge={invites.length > 0}
        locale={isAppLocale(locale) ? locale : DEFAULT_LOCALE}
        onHome={() => setSection("now")}
      />
      <ProfileEntry label={tProfile("entry")} onClick={() => setProfileOpen(true)} />
      <InviteBadge
        count={invites.length}
        label={tInvites("badge")}
        onClick={() => setInvitesOpen(true)}
      />

      <InviteClaimer onClaimed={openInvites} />

      {profileOpen && (
        <ProfileSheet
          profile={profile}
          preferences={preferences}
          onClose={() => setProfileOpen(false)}
        />
      )}
      {invitesOpen && <InviteSheet invites={invites} onClose={() => setInvitesOpen(false)} />}
      {weekOpen && (
        <div className={styles.overlay}>
          <button type="button" className={styles.overlayClose} onClick={() => setWeekOpen(false)}>
            {app("back")}
          </button>
          <WeekSection view={weekly} />
        </div>
      )}
      {deckOpen && (
        <div className={styles.overlay}>
          <button type="button" className={styles.overlayClose} onClick={() => setDeckOpen(false)}>
            {app("back")}
          </button>
          <DiscoverSection deck={deck} />
        </div>
      )}
    </div>
  );
}
