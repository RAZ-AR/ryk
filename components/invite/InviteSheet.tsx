"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { respondInvite } from "@/app/actions/invites";
import { Button } from "@/components/Button";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./InviteSheet.module.css";

export type InviteView = {
  id: string;
  role: "COMPANION" | "WITNESS";
  inviterName: string;
  inviterUsername: string | null;
  storyTitle: string;
  /** YYYY-MM-DD или null. */
  plannedFor: string | null;
  /** Место показываем только спутнику — свидетель деталей не видит (Flow E). */
  location: string | null;
};

export function InviteSheet({ invites, onClose }: { invites: InviteView[]; onClose: () => void }) {
  const t = useTranslations("invites");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const respond = (id: string, accept: boolean) =>
    start(async () => {
      const res = await respondInvite(id, accept);
      setFailed(!res.ok);
      if (res.ok) router.refresh();
    });

  const dateLabel = (iso: string | null) => {
    if (!iso) return t("noDate");
    const d = new Date(`${iso}T12:00:00.000Z`);
    return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <div className={styles.sheet}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        <button type="button" className={styles.close} onClick={onClose}>
          {t("close")}
        </button>
      </header>

      {failed && <p className={styles.error}>{t("error")}</p>}

      {invites.length === 0 ? (
        <p className={styles.empty}>{t("empty")}</p>
      ) : (
        <ul className={styles.list}>
          {invites.map((invite) => (
            <li key={invite.id} className={styles.card}>
              <SvcLabel tone="pink">
                {invite.role === "COMPANION" ? t("roleCompanion") : t("roleWitness")}
              </SvcLabel>

              <p className={styles.from}>
                {t("from")}{" "}
                <span className={styles.who}>
                  {invite.inviterName}
                  {invite.inviterUsername ? ` (@${invite.inviterUsername})` : ""}
                </span>
              </p>

              <div className={styles.storyTitle}>{invite.storyTitle}</div>

              <div className={styles.meta}>
                {[
                  dateLabel(invite.plannedFor),
                  invite.role === "COMPANION" ? invite.location : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>

              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => respond(invite.id, false)}
                >
                  {t("decline")}
                </Button>
                <Button disabled={pending} onClick={() => respond(invite.id, true)}>
                  {pending ? t("responding") : t("accept")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
