"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { completeOnboarding } from "@/app/actions/onboarding";
import type { LifeCategory, SocialMode } from "@/generated/prisma/enums";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { HandNote } from "@/components/HandNote";
import { Input } from "@/components/Input";
import { SvcLabel } from "@/components/SvcLabel";
import { Ticket } from "@/components/Ticket";
import { ONBOARDING_CATEGORIES, ONBOARDING_PROBES } from "./constants";
import styles from "./OnboardingFlow.module.css";

type Step = "welcome" | "categories" | "swipe" | "params";
type BudgetKey = "low" | "mid" | "any";
type NoveltyKey = "calm" | "balance" | "bold";

const BUDGET_VALUE: Record<BudgetKey, number | null> = { low: 1500, mid: 4000, any: null };
const NOVELTY_VALUE: Record<NoveltyKey, number> = { calm: 20, balance: 40, bold: 70 };
const SOCIAL_VALUE: Record<"solo" | "close" | "new", SocialMode> = {
  solo: "SOLO",
  close: "CLOSE_ONES",
  new: "NEW_PEOPLE",
};

export function OnboardingFlow({ initialCity }: { initialCity: string | null }) {
  const router = useRouter();
  const tWelcome = useTranslations("onboarding.welcome");
  const tCat = useTranslations("onboarding.categories");
  const tCatLabel = useTranslations("categories");
  const tSwipe = useTranslations("onboarding.swipe");
  const tIdeas = useTranslations("onboarding.ideas");
  const tParams = useTranslations("onboarding.params");

  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<Set<LifeCategory>>(new Set());
  const [probeIdx, setProbeIdx] = useState(0);
  const [swipes, setSwipes] = useState<{ category: LifeCategory; liked: boolean }[]>([]);
  const [budgetKey, setBudgetKey] = useState<BudgetKey | null>(null);
  const [socialKey, setSocialKey] = useState<keyof typeof SOCIAL_VALUE | null>(null);
  const [noveltyKey, setNoveltyKey] = useState<NoveltyKey>("balance");
  const [city, setCity] = useState(initialCity ?? "");
  const [pending, startTransition] = useTransition();

  const toggleCategory = (id: LifeCategory) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const recordSwipe = (liked: boolean) => {
    const probe = ONBOARDING_PROBES[probeIdx];
    setSwipes((prev) => [...prev, { category: probe.category, liked }]);
    if (probeIdx >= ONBOARDING_PROBES.length - 1) setStep("params");
    else setProbeIdx((i) => i + 1);
  };

  const finish = () => {
    startTransition(async () => {
      const res = await completeOnboarding({
        categories: [...selected],
        swipes,
        budgetMax: budgetKey ? BUDGET_VALUE[budgetKey] : null,
        socialMode: socialKey ? SOCIAL_VALUE[socialKey] : null,
        noveltyRatio: NOVELTY_VALUE[noveltyKey],
        city: city || null,
      });
      if (res.ok) router.refresh();
    });
  };

  // ─────────────── Welcome ───────────────
  if (step === "welcome") {
    return (
      <main className={styles.welcome}>
        <SvcLabel tone="ink" className={styles.welcomeKicker}>
          <span>{tWelcome("kicker")}</span>
          <span>MMXXVI</span>
        </SvcLabel>
        <Image
          src="/ryk-logo-paper.svg"
          alt="Ryk"
          width={406}
          height={271}
          unoptimized
          className={styles.logo}
        />
        <SvcLabel tone="ink" className={styles.welcomePromise}>
          {tWelcome("promise")}
        </SvcLabel>
        <div className={styles.welcomeBody}>
          <div className={styles.welcomeLead}>{tWelcome("lead")}</div>
          <p className={styles.welcomeSub}>{tWelcome("sub")}</p>
        </div>
        <button className={styles.welcomeStart} onClick={() => setStep("categories")}>
          {tWelcome("start")}
        </button>
        <button className={styles.welcomeSkip} onClick={() => setStep("params")}>
          <SvcLabel tone="ink">{tWelcome("skip")}</SvcLabel>
        </button>
      </main>
    );
  }

  // ─────────────── Categories ───────────────
  if (step === "categories") {
    const count = selected.size;
    return (
      <main className={styles.screen}>
        <div className={styles.header}>
          <SvcLabel tone="pink">{tCat("step")}</SvcLabel>
          <SvcLabel tone="muted">{tCat("time")}</SvcLabel>
        </div>
        <h1 className={styles.title}>{tCat("title")}</h1>
        <p className={styles.hint}>{tCat("hint")}</p>

        <div className={styles.grid}>
          {ONBOARDING_CATEGORIES.map((c) => {
            const on = selected.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                className={[styles.cell, on && styles.cellOn].filter(Boolean).join(" ")}
                onClick={() => toggleCategory(c.id)}
              >
                <SvcLabel tone="ink">{c.num}</SvcLabel>
                <div className={styles.cellLabel}>{tCatLabel(c.id)}</div>
              </button>
            );
          })}
        </div>

        <div className={styles.note}>
          <HandNote>{count > 0 ? tCat("counter", { count }) : tCat("counterEmpty")}</HandNote>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" className={styles.narrow} onClick={() => setStep("welcome")}>
            {tCat("back")}
          </Button>
          <Button
            variant="grey"
            className={styles.grow}
            disabled={count === 0}
            onClick={() => setStep("swipe")}
          >
            {tCat("next")}
          </Button>
        </div>
      </main>
    );
  }

  // ─────────────── Swipe ───────────────
  if (step === "swipe") {
    const probe = ONBOARDING_PROBES[probeIdx];
    return (
      <main className={styles.screen}>
        <div className={styles.header}>
          <SvcLabel tone="pink">{tSwipe("step")}</SvcLabel>
          <SvcLabel tone="muted">
            {tSwipe("counter", { current: probeIdx + 1, total: ONBOARDING_PROBES.length })}
          </SvcLabel>
        </div>
        <h1 className={styles.title}>{tSwipe("title")}</h1>

        <div className={styles.ticketWrap}>
          <Ticket
            photoPlaceholder="Ryk"
            metaLeft={String(probeIdx + 1).padStart(2, "0")}
            metaRight={String(ONBOARDING_PROBES.length)}
            title={tIdeas(`${probe.id}.title`)}
            stubTone="neutral"
            stubLabel={tCatLabel(probe.category)}
          >
            {tIdeas(`${probe.id}.note`)}
            <br />
            <b>{tIdeas(`${probe.id}.meta`)}</b>
          </Ticket>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" className={styles.grow} onClick={() => recordSwipe(false)}>
            {tSwipe("no")}
          </Button>
          <Button variant="grey" className={styles.grow} onClick={() => recordSwipe(true)}>
            {tSwipe("yes")}
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setStep("params")}>
          {tSwipe("enough")}
        </Button>
      </main>
    );
  }

  // ─────────────── Params ───────────────
  return (
    <main className={styles.screen}>
      <SvcLabel tone="pink">{tParams("step")}</SvcLabel>
      <h1 className={styles.title}>{tParams("title")}</h1>

      <div className={styles.rows}>
        <div className={styles.row}>
          <SvcLabel tone="muted" className={styles.rowLabel}>
            {tParams("budgetLabel")}
          </SvcLabel>
          <div className={styles.chips}>
            {(["low", "mid", "any"] as const).map((k) => (
              <Chip key={k} selected={budgetKey === k} onClick={() => setBudgetKey(k)}>
                {tParams(k === "low" ? "budgetLow" : k === "mid" ? "budgetMid" : "budgetAny")}
              </Chip>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <SvcLabel tone="muted" className={styles.rowLabel}>
            {tParams("socialLabel")}
          </SvcLabel>
          <div className={styles.chips}>
            {(["solo", "close", "new"] as const).map((k) => (
              <Chip key={k} tone="pink" selected={socialKey === k} onClick={() => setSocialKey(k)}>
                {tParams(k === "solo" ? "socialSolo" : k === "close" ? "socialClose" : "socialNew")}
              </Chip>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <SvcLabel tone="muted" className={styles.rowLabel}>
            {tParams("cityLabel")}
          </SvcLabel>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={tParams("cityPlaceholder")}
            maxLength={120}
          />
        </div>

        <div className={styles.row}>
          <SvcLabel tone="muted" className={styles.rowLabel}>
            {tParams("noveltyLabel")}
          </SvcLabel>
          <div className={styles.chips}>
            {(["calm", "balance", "bold"] as const).map((k) => (
              <Chip
                key={k}
                tone="pink"
                selected={noveltyKey === k}
                onClick={() => setNoveltyKey(k)}
              >
                {tParams(
                  k === "calm" ? "noveltyCalm" : k === "balance" ? "noveltyBalance" : "noveltyBold",
                )}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.note}>
        <HandNote>{tParams("note")}</HandNote>
      </div>

      <div className={styles.footerCol}>
        <Button variant="primary" disabled={pending} onClick={finish}>
          {pending ? tParams("saving") : tParams("finish")}
        </Button>
      </div>
    </main>
  );
}
