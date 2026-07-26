"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { claimInvite } from "@/app/actions/invites";
import { getStartParam } from "@/lib/telegram/webApp";

/*
 * Приложение открыли по ссылке-приглашению (t.me/bot?startapp=<id>).
 * Закрепляем приглашение за этим пользователем один раз за монтирование —
 * дальше оно живёт в списке и в значке, даже если человек сразу закрыл экран.
 *
 * Работает и для новичка: start_param держится всю сессию Telegram, поэтому
 * компонент подхватит его уже после онбординга, когда отрисуется AppShell.
 */
export function InviteClaimer({ onClaimed }: { onClaimed: () => void }) {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const param = getStartParam();
    if (!param) return;
    done.current = true;

    void claimInvite(param).then((res) => {
      if (res.ok) {
        onClaimed();
        router.refresh();
      }
    });
  }, [router, onClaimed]);

  return null;
}
