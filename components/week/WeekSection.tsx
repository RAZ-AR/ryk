"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { trackCalendarAdded, trackCandidatesViewed } from "@/app/actions/analytics";
import { commitStory, uncommitStory } from "@/app/actions/commitment";
import { selectStory } from "@/app/actions/weekly";
import type { SocialMode } from "@/generated/prisma/enums";
import { buildGoogleCalendarUrl } from "@/lib/calendar/googleCalendarLink";
import type { Candidate, SelectedStory, WeeklyView, WhyCode } from "@/lib/engine/weekly";
import type { DayWeather } from "@/lib/weather/openMeteo";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { HandNote } from "@/components/HandNote";
import { Input } from "@/components/Input";
import { RykNote } from "@/components/RykNote";
import { SvcLabel } from "@/components/SvcLabel";
import { Ticket } from "@/components/Ticket";
import { CheckinView } from "./CheckinView";
import { RescueView } from "./RescueView";
import styles from "./WeekSection.module.css";

const SOCIAL_KEYS = ["SOLO", "CLOSE_ONES", "NEW_PEOPLE"] as const;

export function WeekSection({ view }: { view: WeeklyView }) {
  const t = useTranslations("week");
  const tCat = useTranslations("categories");
  const router = useRouter();

  const [idx, setIdx] = useState(0);
  const [choosing, startChoose] = useTransition();
  const [showRescue, setShowRescue] = useState(false);

  // Состояние формы подтверждения.
  const [day, setDay] = useState<string | null>(null);
  const [social, setSocial] = useState<SocialMode | null>(null);
  const [companion, setCompanion] = useState("");
  const [witness, setWitness] = useState("");
  const [committing, startCommit] = useTransition();
  const [changing, startChange] = useTransition();

  // Первый шаг воронки: кандидатов показали. Ref-guard, чтобы повторные
  // рендеры не раздували метрику.
  const viewedRef = useRef(false);
  const candidateCount = view.kind === "choose" ? view.candidates.length : 0;
  useEffect(() => {
    if (candidateCount === 0 || viewedRef.current) return;
    viewedRef.current = true;
    void trackCandidatesViewed(candidateCount);
  }, [candidateCount]);

  const priceLabel = (price: number | null, currency: string) => {
    if (price == null) return "";
    if (price === 0) return t("priceFree");
    const unit = currency === "RSD" ? t("currencyRSD") : currency;
    return `${price.toLocaleString("ru-RU")} ${unit}`;
  };

  const durationLabel = (min: number | null) => {
    if (min == null) return "—";
    return min >= 60
      ? `${(min / 60).toLocaleString("ru-RU")} ${t("hours")}`
      : `${min} ${t("minutes")}`;
  };

  const whyText = (code: WhyCode, category: string | null) =>
    t(`why.${code}`, { category: category ?? "" });

  const weatherText = (w: DayWeather | null) =>
    w ? `${t(`weather.${w.kind}`)}, ${w.tempMax > 0 ? "+" : ""}${w.tempMax}°` : null;

  const socialLabel = (mode: SocialMode) =>
    mode === "SOLO" ? t("socialSolo") : mode === "CLOSE_ONES" ? t("socialClose") : t("socialNew");

  /** Билет истории — общий для commit и committed. */
  const storyTicket = (story: SelectedStory, stubLabel: string, extra?: React.ReactNode) => (
    <Ticket
      photoPlaceholder="Ryk"
      metaLeft={durationLabel(null)}
      metaRight={priceLabel(story.price, story.currency)}
      metaRightSub={tCat(story.category)}
      title={story.title}
      stubTone="pink"
      stubLabel={stubLabel}
    >
      <b>{t("whyLabel")}:</b>{" "}
      {whyText(story.whyCode, story.whyCategory ? tCat(story.whyCategory) : null)}
      {story.location ? (
        <>
          <br />
          {story.location}
        </>
      ) : null}
      {extra}
    </Ticket>
  );

  // ─────────────── Check-in: день истории наступил ───────────────
  if (view.kind === "checkin") {
    return <CheckinView story={view.story} />;
  }

  // ─────────────── Completed: история прожита ───────────────
  if (view.kind === "completed") {
    const { story, memory } = view;
    return (
      <div className={styles.wrap}>
        <SvcLabel tone="pink">{t("completedKicker")}</SvcLabel>
        <div className={styles.ticketWrap}>
          {storyTicket(
            story,
            t("completedStub"),
            <>
              {memory.emotion ? (
                <>
                  <br />
                  <b>{t(`emotion.${memory.emotion}`)}</b>
                </>
              ) : null}
            </>,
          )}
        </div>
        {memory.note ? (
          <div className={styles.note}>
            <HandNote size="large">«{memory.note}»</HandNote>
          </div>
        ) : null}
        <div className={styles.note}>
          <HandNote>{t("completedNote")}</HandNote>
        </div>
      </div>
    );
  }

  // ─────────────── Deferred: неделя перенесена без вины ───────────────
  if (view.kind === "deferred") {
    return (
      <div className={styles.wrap}>
        <SvcLabel tone="muted">{t("deferredKicker")}</SvcLabel>
        <h1 className={styles.deferredTitle}>{t("deferredTitle")}</h1>
        <p className={styles.deferredBody}>{t("deferredBody")}</p>
        <div className={styles.note}>
          <HandNote>{t("deferredNote")}</HandNote>
        </div>
      </div>
    );
  }

  // ─────────────── Committed: план недели ───────────────
  if (view.kind === "committed") {
    const { story, commitment, weather, nudge } = view;

    if (showRescue) return <RescueView onBack={() => setShowRescue(false)} />;

    // Русская форма «день / дня / дней» — иначе счётчик читается коряво.
    const daysLabel = (n: number) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return t("daysLeftOne", { count: n });
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
        return t("daysLeftFew", { count: n });
      return t("daysLeftMany", { count: n });
    };

    // Для WEATHER_SWAP подставляем предложенный день и его погоду.
    const suggested = nudge.suggestedDate ? new Date(`${nudge.suggestedDate}T12:00:00.000Z`) : null;
    const nudgeText = t(`nudge.${nudge.code}`, {
      day: suggested ? t(`days.${suggested.getUTCDay() === 0 ? 7 : suggested.getUTCDay()}`) : "",
      weather: nudge.suggestedWeather ? t(`weather.${nudge.suggestedWeather.kind}`) : "",
    });
    const plannedDay = commitment.plannedFor
      ? new Date(`${commitment.plannedFor}T12:00:00.000Z`)
      : null;
    // Короткая дата «ВС · 26.07» — билет не место для ISO-строки.
    const plannedLabel = plannedDay
      ? `${t(`days.${plannedDay.getUTCDay() === 0 ? 7 : plannedDay.getUTCDay()}`)} · ` +
        `${String(plannedDay.getUTCDate()).padStart(2, "0")}.${String(plannedDay.getUTCMonth() + 1).padStart(2, "0")}`
      : t("notPlanned");

    const change = () =>
      startChange(async () => {
        const res = await uncommitStory();
        if (res.ok) router.refresh();
      });

    return (
      <div className={styles.wrap}>
        <SvcLabel tone="pink">{t("planKicker")}</SvcLabel>

        {nudge.daysLeft != null && nudge.daysLeft > 0 ? (
          <div className={styles.countdown}>
            <span className={styles.countdownNum}>{nudge.daysLeft}</span>
            <div>
              <div className={styles.countdownUnit}>{daysLabel(nudge.daysLeft)}</div>
              <SvcLabel tone="muted">{t("untilStory")}</SvcLabel>
            </div>
          </div>
        ) : null}

        <div className={styles.nudge}>
          <RykNote label={t("nudgeLabel")}>{nudgeText}</RykNote>
        </div>

        <div className={styles.ticketWrap}>
          {storyTicket(
            story,
            t("planStub"),
            <>
              <br />
              <b>{plannedLabel}</b>
              {weather ? ` · ${weatherText(weather)}` : ""}
            </>,
          )}
        </div>

        <div className={styles.rows}>
          {commitment.budget != null ? (
            <div className={styles.rowInline}>
              <SvcLabel tone="muted">{t("budgetLabel")}</SvcLabel>
              <span className={styles.value}>{priceLabel(commitment.budget, story.currency)}</span>
            </div>
          ) : null}
          {commitment.socialMode ? (
            <div className={styles.rowInline}>
              <SvcLabel tone="muted">{t("companyLabel")}</SvcLabel>
              <span className={styles.value}>
                {commitment.companionName || socialLabel(commitment.socialMode)}
              </span>
            </div>
          ) : null}
          {commitment.witnessName ? (
            <div className={styles.rowInline}>
              <SvcLabel tone="muted">{t("witnessLabel")}</SvcLabel>
              <span className={styles.value}>{commitment.witnessName}</span>
            </div>
          ) : null}
        </div>

        {commitment.plannedFor && (
          <div className={styles.calendarRow}>
            <a href="/api/calendar/ics" className={styles.calendarLink}>
              {t("calendarLabel")}
            </a>
            <a
              href={buildGoogleCalendarUrl({
                title: story.title,
                dateISO: commitment.plannedFor,
                location: story.location,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.calendarLink}
              onClick={() => void trackCalendarAdded("google")}
            >
              {t("calendarGoogle")}
            </a>
          </div>
        )}

        <div className={styles.note}>
          <HandNote>{t("selectedNote")}</HandNote>
        </div>

        <div className={styles.footerCol}>
          <Button variant="secondary" onClick={() => setShowRescue(true)}>
            {t("notWorking")}
          </Button>
          <Button variant="ghost" disabled={changing} onClick={change}>
            {changing ? t("changing") : t("change")}
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────── Commit: подтверждение ───────────────
  if (view.kind === "commit") {
    const { story, days } = view;

    const confirm = () =>
      startCommit(async () => {
        if (!day) return;
        const res = await commitStory({
          plannedFor: day,
          budget: story.price,
          socialMode: social,
          companionName: companion || null,
          witnessName: witness || null,
        });
        if (res.ok) router.refresh();
      });

    return (
      <div className={styles.wrap}>
        <SvcLabel tone="pink">{t("commitKicker")}</SvcLabel>
        <h1 className={styles.commitTitle}>{t("commitTitle")}</h1>
        <div className={styles.storyName}>{story.title}</div>

        <div className={styles.rows}>
          <div className={styles.row}>
            <SvcLabel tone="muted" className={styles.rowLabel}>
              {t("whenLabel")}
            </SvcLabel>
            <div className={styles.chips}>
              {days.map((d) => {
                const on = day === d.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    aria-pressed={on}
                    className={[styles.day, on && styles.dayOn].filter(Boolean).join(" ")}
                    onClick={() => setDay(d.date)}
                  >
                    <SvcLabel tone="ink">{t(`days.${d.weekday}`)}</SvcLabel>
                    <span className={styles.dayWeather}>{weatherText(d.weather) ?? "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.row}>
            <SvcLabel tone="muted" className={styles.rowLabel}>
              {t("companyLabel")}
            </SvcLabel>
            <div className={styles.chips}>
              {SOCIAL_KEYS.map((k) => (
                <Chip key={k} tone="pink" selected={social === k} onClick={() => setSocial(k)}>
                  {socialLabel(k)}
                </Chip>
              ))}
            </div>
            {social !== "SOLO" ? (
              <div style={{ marginTop: 11 }}>
                <Input
                  value={companion}
                  onChange={(e) => setCompanion(e.target.value)}
                  placeholder={t("companyPlaceholder")}
                  maxLength={80}
                />
              </div>
            ) : null}
          </div>

          <div className={styles.row}>
            <SvcLabel tone="muted" className={styles.rowLabel}>
              {t("witnessLabel")}
            </SvcLabel>
            <Input
              value={witness}
              onChange={(e) => setWitness(e.target.value)}
              placeholder={t("witnessPlaceholder")}
              maxLength={80}
            />
            <p className={styles.hint}>{t("witnessHint")}</p>
          </div>
        </div>

        <div className={styles.note}>
          <HandNote>{t("selectedNote")}</HandNote>
        </div>

        <div className={styles.footerCol}>
          <Button variant="primary" disabled={committing || !day} onClick={confirm}>
            {committing ? t("confirming") : t("confirm")}
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────── Choose: кандидаты ───────────────
  const candidates = view.candidates;
  if (candidates.length === 0) {
    return (
      <div className={styles.wrap}>
        <SvcLabel tone="pink">{t("kicker")}</SvcLabel>
        <p className={styles.empty}>{t("empty")}</p>
      </div>
    );
  }

  const c: Candidate = candidates[idx % candidates.length];
  const distance = c.distanceKm != null ? `${c.distanceKm} ${t("km")}` : null;

  const choose = () =>
    startChoose(async () => {
      const res = await selectStory(c.experienceId);
      if (res.ok) router.refresh();
    });

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <SvcLabel tone="pink">{t("kicker")}</SvcLabel>
          <div className={styles.heading}>{t("candidate")}</div>
        </div>
        <span className={styles.counter}>
          {idx + 1}
          <span className={styles.counterTotal}>/{candidates.length}</span>
        </span>
      </div>

      <div className={styles.ticketWrap}>
        <Ticket
          photoPlaceholder="Ryk"
          metaLeft={durationLabel(c.durationMin)}
          metaRight={priceLabel(c.price, c.currency)}
          metaRightSub={tCat(c.category)}
          title={c.title}
          stubTone="pink"
          stubLabel={c.sponsored ? `${t("stubLabel")} · ${t("sponsored")}` : t("stubLabel")}
        >
          <b>{t("whyLabel")}:</b> {whyText(c.whyCode, c.whyCategory ? tCat(c.whyCategory) : null)}
          {c.location || distance ? (
            <>
              <br />
              {[c.location, distance].filter(Boolean).join(" · ")}
            </>
          ) : null}
        </Ticket>
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          className={styles.grow}
          onClick={() => setIdx((i) => (i + 1) % candidates.length)}
        >
          {t("next")}
        </Button>
        <Button variant="primary" className={styles.grow} disabled={choosing} onClick={choose}>
          {choosing ? t("choosing") : t("choose")}
        </Button>
      </div>
    </div>
  );
}
