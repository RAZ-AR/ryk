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
import { YearSection } from "@/components/year/YearSection";
import { Wishlist, type WishView } from "@/components/wishlist/Wishlist";
import type { DeckCard } from "@/lib/engine/discover";
import type { UpcomingItem } from "@/lib/engine/upcoming";
import type { MemoryView, WeeklyView } from "@/lib/engine/weekly";
import type { YearView } from "@/lib/engine/year";
import { AppHeader } from "./AppHeader";
import { Dock, type DockLabels, type DockTarget } from "./Dock";
import styles from "./AppShell.module.css";

/*
 * Каркас Mini App: контент + плавающий dock (§7) + логотип-возврат,
 * личный кабинет и приглашения. Все пять разделов живые.
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
}) {
  const nav = useTranslations("nav");
  const app = useTranslations("app");
  const tProfile = useTranslations("profile");
  const tInvites = useTranslations("invites");
  const tDiscover = useTranslations("discover");
  const [section, setSection] = useState<DockTarget>("week");
  const [profileOpen, setProfileOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  /** Полный недельный цикл — оверлей поверх главного, а не отдельная секция. */
  const [weekOpen, setWeekOpen] = useState(false);

  // Пришли по ссылке — открываем приглашения сразу: человек за этим и пришёл,
  // прятать их за значком было бы издевательством.
  const openInvites = useCallback(() => setInvitesOpen(true), []);

  const labels: DockLabels = {
    week: nav("week"),
    memory: nav("memory"),
    wishes: nav("wishes"),
    year: nav("year"),
  };

  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        {section === "week" ? (
          <HomeSection
            upcoming={upcoming}
            weekly={weekly}
            deck={deck}
            onOpenWeek={() => setWeekOpen(true)}
          />
        ) : section === "discover" ? (
          <DiscoverSection deck={deck} />
        ) : section === "wishes" ? (
          <Wishlist wishes={wishes} />
        ) : section === "memory" ? (
          <MemorySection memories={memories} canAttachPhoto={canAttachPhoto} />
        ) : (
          <YearSection year={year} />
        )}
      </div>
      <Dock
        active={section}
        onNavigate={setSection}
        labels={labels}
        // Имя навигации, а не состояние недели: скринридер читает его вместо
        // «Week active», которое сюда попало по недосмотру и ничего не значило.
        ariaLabel={nav("aria")}
        discoverLabel={tDiscover("title")}
      />
      <AppHeader label={app("home")} onHome={() => setSection("week")} />
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
    </div>
  );
}
