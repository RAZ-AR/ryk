"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
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
import type { MemoryView, WeeklyView } from "@/lib/engine/weekly";
import { Dock, type DockLabels, type DockSection } from "./Dock";
import { SvcLabel } from "./SvcLabel";
import styles from "./AppShell.module.css";

/*
 * Каркас Mini App: контент + плавающий dock (§7) + точка входа в личный
 * кабинет + приглашения. Неделя / Желания / Память — живые;
 * Баланс — заглушка (Фаза 10).
 */
export function AppShell({
  wishes,
  weekly,
  memories,
  profile,
  preferences,
  invites,
}: {
  wishes: WishView[];
  weekly: WeeklyView;
  memories: MemoryView[];
  profile: ProfileView;
  preferences: PreferenceRow[];
  invites: InviteView[];
}) {
  const nav = useTranslations("nav");
  const app = useTranslations("app");
  const tProfile = useTranslations("profile");
  const tInvites = useTranslations("invites");
  const [section, setSection] = useState<DockSection>("week");
  const [profileOpen, setProfileOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);

  // Пришли по ссылке — открываем приглашения сразу: человек за этим и пришёл,
  // прятать их за значком было бы издевательством.
  const openInvites = useCallback(() => setInvitesOpen(true), []);

  const labels: DockLabels = {
    week: nav("week"),
    memory: nav("memory"),
    wishes: nav("wishes"),
    balance: nav("balance"),
  };

  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        {section === "week" ? (
          <WeekSection view={weekly} />
        ) : section === "wishes" ? (
          <Wishlist wishes={wishes} />
        ) : section === "memory" ? (
          <MemorySection memories={memories} />
        ) : (
          <>
            <header className={styles.header}>
              <SvcLabel tone="pink">{app("weekActive")}</SvcLabel>
              <h1 className={styles.title}>{labels[section]}</h1>
            </header>
            <p className={styles.placeholder}>{app("lead")}</p>
          </>
        )}
      </div>
      <Dock
        active={section}
        onNavigate={setSection}
        labels={labels}
        ariaLabel={app("weekActive")}
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
    </div>
  );
}
