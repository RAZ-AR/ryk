"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { conciergeSignIn } from "@/app/actions/concierge";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./Concierge.module.css";

/**
 * Вход куратора по общему токену.
 *
 * Инструмент внутренний, но переведён наравне с продуктом: кураторов
 * в пилоте несколько городов, и русский у них не обязательно первый.
 */
export function ConciergeLogin() {
  const t = useTranslations("concierge");
  const router = useRouter();
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const fd = new FormData();
      fd.set("token", token);
      const res = await conciergeSignIn(fd);
      if (res.ok) {
        setToken("");
        router.refresh();
      } else {
        setFailed(true);
      }
    });
  };

  return (
    <form className={styles.login} onSubmit={submit}>
      {/* Марка продукта, а не текст интерфейса — не переводится. */}
      <SvcLabel tone="ink">CONCIERGE</SvcLabel>
      <h1 className={styles.loginTitle}>{t("loginTitle")}</h1>
      <label className={styles.field}>
        <span className={styles.label}>{t("tokenLabel")}</span>
        <Input
          type="password"
          name="token"
          autoComplete="off"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setFailed(false);
          }}
        />
      </label>
      {failed && <p className={styles.error}>{t("tokenFailed")}</p>}
      <Button type="submit" disabled={pending || token.length === 0}>
        {pending ? t("checking") : t("signIn")}
      </Button>
    </form>
  );
}
