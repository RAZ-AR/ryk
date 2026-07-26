"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { conciergeSignIn } from "@/app/actions/concierge";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./Concierge.module.css";

/**
 * Вход куратора по общему токену.
 *
 * Интерфейс внутренний, поэтому текст здесь русский и не идёт в i18n:
 * переводить админку для двух кураторов пилота — работа впустую.
 */
export function ConciergeLogin() {
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
      <SvcLabel tone="ink">CONCIERGE</SvcLabel>
      <h1 className={styles.loginTitle}>Инструмент куратора</h1>
      <label className={styles.field}>
        <span className={styles.label}>Токен доступа</span>
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
      {failed && <p className={styles.error}>Токен не подошёл.</p>}
      <Button type="submit" disabled={pending || token.length === 0}>
        {pending ? "Проверяем…" : "Войти"}
      </Button>
    </form>
  );
}
