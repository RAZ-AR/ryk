"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { trackOnboardingInspirationSeen } from "@/app/actions/analytics";
import { completeOnboarding } from "@/app/actions/onboarding";
import type { FreeWindow, LifeBarrier, LifeCategory, SocialMode } from "@/generated/prisma/enums";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { HandNote } from "@/components/HandNote";
import { Input } from "@/components/Input";
import { SvcLabel } from "@/components/SvcLabel";
import { Textarea } from "@/components/Textarea";
import { Ticket } from "@/components/Ticket";
import {
  ONBOARDING_BARRIERS,
  ONBOARDING_BUDGET,
  ONBOARDING_CATEGORIES,
  ONBOARDING_PROBES,
  ONBOARDING_WINDOWS,
} from "./constants";
import { PrintArt } from "@/components/PrintArt";
import styles from "./OnboardingFlow.module.css";
import { CITIES, findCity, nearestCity, type CurrencyCode } from "@/lib/cities";
import { DEFAULT_LOCALE, isAppLocale } from "@/lib/i18n/locale";
import { requestLocation } from "@/lib/telegram/location";
import { haptic } from "@/lib/telegram/webApp";
import type { JoyTrait } from "@/lib/engine/dailyJoy";
import { INSPIRE_JOYS } from "@/lib/engine/joyTraits";
import { clearFreshWelcome, markFreshWelcome } from "@/lib/ui/freshWelcome";

type Step =
  | "welcome"
  | "place"
  | "inspire"
  | "categories"
  | "swipe"
  | "moment"
  | "postponed"
  | "rhythm"
  | "params";

type BudgetKey = "low" | "mid" | "any";
type NoveltyKey = "calm" | "balance" | "bold";

const NOVELTY_VALUE: Record<NoveltyKey, number> = { calm: 20, balance: 40, bold: 70 };
const SOCIAL_VALUE: Record<"solo" | "close" | "new", SocialMode> = {
  solo: "SOLO",
  close: "CLOSE_ONES",
  new: "NEW_PEOPLE",
};

export function OnboardingFlow({
  initialCity,
  detectedCity,
  initialName,
}: {
  initialCity: string | null;
  /** Догадка по IP (lib/geo/ipCity.ts) — каноническое имя пилотного города. */
  detectedCity: string | null;
  /** Имя из Telegram (или уже выбранное) — подставляем, чтобы не печатать заново. */
  initialName: string | null;
}) {
  const router = useRouter();
  const rawLocale = useLocale();
  const locale = isAppLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const tPlace = useTranslations("onboarding.place");
  const tCurrency = useTranslations("onboarding.currency");
  const tWelcome = useTranslations("onboarding.welcome");
  const tInspire = useTranslations("onboarding.inspire");
  const tJoy = useTranslations("joy");
  const tCat = useTranslations("onboarding.categories");
  const tCatLabel = useTranslations("categories");
  const tSwipe = useTranslations("onboarding.swipe");
  const tIdeas = useTranslations("onboarding.ideas");
  const tMoment = useTranslations("onboarding.moment");
  const tPostponed = useTranslations("onboarding.postponed");
  const tRhythm = useTranslations("onboarding.rhythm");
  const tParams = useTranslations("onboarding.params");

  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<Set<LifeCategory>>(new Set());
  const [probeIdx, setProbeIdx] = useState(0);
  const [swipes, setSwipes] = useState<{ category: LifeCategory; liked: boolean }[]>([]);
  const [goodMoment, setGoodMoment] = useState("");
  const [postponed, setPostponed] = useState("");
  const [barrier, setBarrier] = useState<LifeBarrier | null>(null);
  const [windows, setWindows] = useState<Set<FreeWindow>>(new Set());
  const [budgetKey, setBudgetKey] = useState<BudgetKey | null>(null);
  const [socialKey, setSocialKey] = useState<keyof typeof SOCIAL_VALUE | null>(null);
  const [noveltyKey, setNoveltyKey] = useState<NoveltyKey>("balance");
  const [city, setCity] = useState(initialCity ?? detectedCity ?? "");
  // «Другой город»: открыт сразу, если в профиле уже записан непилотный.
  const [otherCity, setOtherCity] = useState(Boolean(initialCity && !findCity(initialCity)));
  // Откуда взялся отмеченный город — экран говорит об этом рукописной пометкой.
  const [cityMark, setCityMark] = useState<"detected" | "located" | null>(
    !initialCity && detectedCity ? "detected" : null,
  );
  const [locateState, setLocateState] = useState<"idle" | "locating" | "failed" | "far">("idle");
  // «У меня уже есть профиль»: после места — сразу к рамкам, без анкеты.
  const [fastTrack, setFastTrack] = useState(false);
  const [traits, setTraits] = useState<Set<JoyTrait>>(new Set());
  const [name, setName] = useState(initialName ?? "");
  // Куда ведёт «Назад» с рамок: на них приходят и после ритма, и прямо с
  // обложки («У меня уже есть профиль») — и возвращать надо туда же.
  const [paramsBack, setParamsBack] = useState<Step>("rhythm");

  /*
   * Валюта — по городу: цены идей и бюджет человеку в Ереване в драмах.
   * Незнакомый город — динары, как было: каталог пока сербский.
   */
  const knownCity = otherCity ? null : findCity(city);
  const currency: CurrencyCode = knownCity?.country.currency ?? "RSD";
  const money = (amount: number) =>
    `${new Intl.NumberFormat(locale).format(amount)} ${tCurrency(currency)}`;
  const placeChosen = otherCity ? city.trim().length >= 2 : knownCity != null;

  const pickCity = (name: string) => {
    haptic();
    setOtherCity(false);
    setCity(name);
    setCityMark(null);
    setLocateState("idle");
  };

  const pickOther = () => {
    haptic();
    // Пилотный город в поле «другой» не переносим: другой значит другой.
    if (!otherCity) setCity("");
    setOtherCity(true);
    setCityMark(null);
  };

  const locate = async () => {
    setLocateState("locating");
    const coords = await requestLocation();
    if (!coords) {
      setLocateState("failed");
      return;
    }
    const found = nearestCity(coords.lat, coords.lng);
    if (!found) {
      // Рядом нет пилота — открываем поле, чтобы человек вписал свой город.
      setOtherCity(true);
      setCity("");
      setCityMark(null);
      setLocateState("far");
      return;
    }
    haptic("medium");
    setOtherCity(false);
    setCity(found.names.ru);
    setCityMark("located");
    setLocateState("idle");
  };

  const leavePlace = () => {
    if (fastTrack) {
      setParamsBack("place");
      setStep("params");
    } else {
      setStep("inspire");
    }
  };
  const [saveFailed, setSaveFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  // Экран-вдохновение считаем один раз: «Назад» и снова «Дальше» — это
  // всё ещё один показ для воронки, а не два.
  const inspireTracked = useRef(false);
  useEffect(() => {
    if (step !== "inspire" || inspireTracked.current) return;
    inspireTracked.current = true;
    void trackOnboardingInspirationSeen().catch(() => {});
  }, [step]);

  const toggleTrait = (t: JoyTrait) =>
    setTraits((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const toggleWindow = (w: FreeWindow) =>
    setWindows((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });

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
    if (probeIdx >= ONBOARDING_PROBES.length - 1) setStep("moment");
    else setProbeIdx((i) => i + 1);
  };

  /*
   * «Назад» в свайпах — к предыдущей идее, и её ответ снимаем: человек
   * вернулся, чтобы ответить иначе, и старый ответ не должен дожить до вкусов.
   * С первой идеи — к категориям.
   */
  const swipeBack = () => {
    if (probeIdx === 0) {
      setStep("categories");
      return;
    }
    setSwipes((prev) => prev.slice(0, -1));
    setProbeIdx((i) => i - 1);
  };

  /*
   * С «хорошего момента» — обратно к идеям. Если на все ответили, снимаем
   * последний ответ и показываем ту идею снова; если ушли по «хватит» —
   * просто возвращаемся к той, что не успели ответить.
   */
  const momentBack = () => {
    if (swipes.length >= ONBOARDING_PROBES.length) {
      setSwipes((prev) => prev.slice(0, -1));
      setProbeIdx(ONBOARDING_PROBES.length - 1);
    }
    setStep("swipe");
  };

  const finish = () => {
    setSaveFailed(false);
    // Метку ставим до запроса: ответ с revalidatePath может сменить экран
    // на главную раньше, чем выполнится код после await (lib/ui/freshWelcome.ts).
    markFreshWelcome();
    startTransition(async () => {
      const res = await completeOnboarding({
        categories: [...selected],
        swipes,
        budgetMax: budgetKey && budgetKey !== "any" ? ONBOARDING_BUDGET[currency][budgetKey] : null,
        socialMode: socialKey ? SOCIAL_VALUE[socialKey] : null,
        noveltyRatio: NOVELTY_VALUE[noveltyKey],
        city: placeChosen ? city.trim() : null,
        goodMoment: goodMoment.trim() || null,
        postponed: postponed.trim() || null,
        mainBarrier: barrier,
        freeWindows: [...windows],
        joyTraits: [...traits],
        // Имя как в Telegram не сохраняем отдельно: тогда смена имени там
        // продолжит доходить до приложения, а не замёрзнет сегодняшним.
        displayName: name.trim() && name.trim() !== initialName?.trim() ? name.trim() : null,
      }).catch(() => ({ ok: false as const, reason: "network" }));
      if (res.ok) {
        router.refresh();
        return;
      }
      // Раньше отказ был немым: кнопка просто снова становилась активной,
      // и человек не понимал, сохранилось ли что-нибудь.
      clearFreshWelcome();
      setSaveFailed(true);
    });
  };

  const screen = (() => {
    // ─────────────── Welcome ───────────────
    if (step === "welcome") {
      return (
        <main className={styles.welcome}>
          {/* Обложка — оттиск-цветок, как первая открытка в пачке. */}
          <div className={styles.welcomeArt}>
            <PrintArt seed="welcome" shape="flower" ratio={1} />
          </div>
          <SvcLabel tone="ink" className={styles.welcomeKicker}>
            <span>{tWelcome("kicker")}</span>
            <span>MMXXVI</span>
          </SvcLabel>
          <Image
            src="/ryk-logo-blue.svg"
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
          <button
            className={styles.welcomeStart}
            onClick={() => {
              setFastTrack(false);
              setStep("place");
            }}
          >
            {tWelcome("start")}
          </button>
          <button
            className={styles.welcomeSkip}
            onClick={() => {
              // Даже на коротком пути спрашиваем место: без города подборка
              // недели — белградская афиша, а праздники и погода — чужие.
              setFastTrack(true);
              setStep("place");
            }}
          >
            <SvcLabel tone="ink">{tWelcome("skip")}</SvcLabel>
          </button>
        </main>
      );
    }

    // ─────────────── Где ты ───────────────
    // Первым вопросом, а не строкой в конце: от города зависит всё, что Ryk
    // предложит, — афиша, погода, праздники, цены. Догадка по IP уже отмечена,
    // геопозиция — только по кнопке.
    if (step === "place") {
      const mark = (id: string) =>
        knownCity?.id === id && cityMark ? (
          <span className={styles.placeMark}>
            <HandNote>{cityMark === "detected" ? tPlace("detected") : tPlace("located")}</HandNote>
          </span>
        ) : null;
      return (
        <main key={step} className={styles.screen}>
          <div className={styles.header}>
            <SvcLabel tone="pink">{tPlace("step")}</SvcLabel>
            <SvcLabel tone="muted">{tCat("time")}</SvcLabel>
          </div>
          <h1 className={styles.title}>{tPlace("title")}</h1>
          <p className={styles.hint}>{tPlace("hint")}</p>

          <div className={styles.places} role="radiogroup" aria-label={tPlace("title")}>
            {CITIES.map((c) => {
              const on = knownCity?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={[styles.place, on && styles.cellOn].filter(Boolean).join(" ")}
                  onClick={() => pickCity(c.names.ru)}
                >
                  <SvcLabel tone="ink">{c.country.names[locale]}</SvcLabel>
                  <span className={styles.placeName}>{c.names[locale]}</span>
                  {mark(c.id)}
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={otherCity}
              className={[styles.place, otherCity && styles.cellOn].filter(Boolean).join(" ")}
              onClick={pickOther}
            >
              <SvcLabel tone="ink">{tPlace("otherHint")}</SvcLabel>
              <span className={styles.placeName}>{tPlace("other")}</span>
            </button>
          </div>

          {otherCity && (
            <Input
              className={styles.placeInput}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={tPlace("placeholder")}
              aria-label={tPlace("placeholder")}
              maxLength={120}
              autoComplete="address-level2"
              autoFocus
            />
          )}

          <button
            type="button"
            className={styles.locate}
            disabled={locateState === "locating"}
            onClick={locate}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle cx="8" cy="6.5" r="1.8" fill="currentColor" />
            </svg>
            {locateState === "locating" ? tPlace("locating") : tPlace("locate")}
          </button>
          {(locateState === "failed" || locateState === "far") && (
            <p role="status" className={styles.placeStatus}>
              {tPlace(locateState)}
            </p>
          )}

          <div className={styles.dock}>
            <div className={styles.footer}>
              <Button
                variant="secondary"
                className={styles.narrow}
                onClick={() => setStep("welcome")}
              >
                {tPlace("back")}
              </Button>
              <Button
                variant="grey"
                className={styles.grow}
                disabled={!placeChosen}
                onClick={leavePlace}
              >
                {tPlace("next")}
              </Button>
            </div>
            {!placeChosen && (
              <Button
                variant="ghost"
                onClick={() => {
                  setCity("");
                  setOtherCity(false);
                  leavePlace();
                }}
              >
                {tPlace("later")}
              </Button>
            )}
          </div>
        </main>
      );
    }

    // ─────────────── Вдохновение ───────────────
    // До всяких вопросов о неделе — про масштаб: радость бывает крошечной.
    // Без номера шага и счётчика выбранного: это продолжение обложки, а не
    // анкета, и «выбрано 3 из 8» звучало бы как оценка. Ничего не выбрать —
    // тоже ответ: радость дня будет просто из всего каталога.
    if (step === "inspire") {
      return (
        <main key={step} className={styles.screen}>
          <h1 className={styles.title}>{tInspire("title")}</h1>
          <p className={styles.hint}>{tInspire("line")}</p>

          <SvcLabel tone="muted" className={styles.inspireQuestion}>
            {tInspire("question")}
          </SvcLabel>
          <div className={styles.joyGrid}>
            {INSPIRE_JOYS.map(({ trait, joyKey }) => {
              const on = traits.has(trait);
              return (
                <button
                  key={trait}
                  type="button"
                  aria-pressed={on}
                  className={[styles.joyStub, on && styles.joyStubOn].filter(Boolean).join(" ")}
                  onClick={() => toggleTrait(trait)}
                >
                  <span className={styles.joyStubLabel}>{tInspire("stub")}</span>
                  {/* Текст — из каталога радостей дня: {time} есть только у заката,
                    которого здесь нет. */}
                  <span className={styles.joyStubText}>{tJoy(joyKey)}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.dock}>
            <div className={styles.footer}>
              <Button
                variant="secondary"
                className={styles.narrow}
                onClick={() => setStep("place")}
              >
                {tCat("back")}
              </Button>
              <Button variant="grey" className={styles.grow} onClick={() => setStep("categories")}>
                {tInspire("next")}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setTraits(new Set());
                setStep("categories");
              }}
            >
              {tInspire("skip")}
            </Button>
          </div>
        </main>
      );
    }

    // ─────────────── Categories ───────────────
    if (step === "categories") {
      const count = selected.size;
      return (
        <main key={step} className={styles.screen}>
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

          <div className={styles.dock}>
            <div className={styles.footer}>
              <Button
                variant="secondary"
                className={styles.narrow}
                onClick={() => setStep("inspire")}
              >
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
          </div>
        </main>
      );
    }

    // ─────────────── Swipe ───────────────
    if (step === "swipe") {
      const probe = ONBOARDING_PROBES[probeIdx];
      return (
        <main key={step} className={styles.screen}>
          <div className={styles.header}>
            <SvcLabel tone="pink">{tSwipe("step")}</SvcLabel>
            <SvcLabel tone="muted">
              {tSwipe("counter", { current: probeIdx + 1, total: ONBOARDING_PROBES.length })}
            </SvcLabel>
          </div>
          <h1 className={styles.title}>{tSwipe("title")}</h1>

          {/* Ключ по идее: каждая следующая въезжает заново, а не подменяет текст. */}
          <div key={probe.id} className={styles.ticketWrap}>
            <Ticket
              // Счётчик пробы — одной строкой спецификации: «01 / 08».
              metaLeft={`${String(probeIdx + 1).padStart(2, "0")} / ${String(ONBOARDING_PROBES.length).padStart(2, "0")}`}
              metaRight=""
              title={tIdeas(`${probe.id}.title`)}
              stubTone="neutral"
              stubLabel={tCatLabel(probe.category)}
            >
              {tIdeas(`${probe.id}.note`)}
              <br />
              <b>
                {probe.price[currency] === 0 ? tSwipe("free") : money(probe.price[currency])} ·{" "}
                {tIdeas(`${probe.id}.meta`)}
              </b>
            </Ticket>
          </div>

          <div className={styles.dock}>
            <div className={styles.footer}>
              <Button
                variant="secondary"
                className={styles.grow}
                onClick={() => recordSwipe(false)}
              >
                {tSwipe("no")}
              </Button>
              <Button variant="grey" className={styles.grow} onClick={() => recordSwipe(true)}>
                {tSwipe("yes")}
              </Button>
            </div>
            <div className={styles.footerSplit}>
              <Button variant="ghost" onClick={swipeBack}>
                {tSwipe("back")}
              </Button>
              <Button variant="ghost" onClick={() => setStep("moment")}>
                {tSwipe("enough")}
              </Button>
            </div>
          </div>
        </main>
      );
    }

    // ─────────────── Хороший момент ───────────────
    // Рассказанное своими словами точнее любой нашей сетки: человек вспоминает
    // то, что было на самом деле, а не выбирает из предложенного.
    if (step === "moment") {
      return (
        <main key={step} className={styles.screen}>
          <SvcLabel tone="pink">{tMoment("step")}</SvcLabel>
          <h1 className={styles.title}>{tMoment("title")}</h1>
          <p className={styles.hint}>{tMoment("hint")}</p>

          <Textarea
            value={goodMoment}
            onChange={(e) => setGoodMoment(e.target.value)}
            placeholder={tMoment("placeholder")}
            maxLength={500}
            rows={5}
            className={styles.textarea}
          />

          <div className={styles.dock}>
            <div className={styles.footerCol}>
              <Button
                variant="grey"
                disabled={goodMoment.trim().length < 3}
                onClick={() => setStep("postponed")}
              >
                {tMoment("next")}
              </Button>
            </div>
            <div className={styles.footerSplit}>
              <Button variant="ghost" onClick={momentBack}>
                {tCat("back")}
              </Button>
              <Button variant="ghost" onClick={() => setStep("postponed")}>
                {tMoment("skip")}
              </Button>
            </div>
          </div>
        </main>
      );
    }

    // ─────────────── Что откладывается ───────────────
    if (step === "postponed") {
      return (
        <main key={step} className={styles.screen}>
          <SvcLabel tone="pink">{tPostponed("step")}</SvcLabel>
          <h1 className={styles.title}>{tPostponed("title")}</h1>
          <p className={styles.hint}>{tPostponed("hint")}</p>

          <Textarea
            value={postponed}
            onChange={(e) => setPostponed(e.target.value)}
            placeholder={tPostponed("placeholder")}
            maxLength={500}
            rows={4}
            className={styles.textarea}
          />

          <div className={styles.dock}>
            <div className={styles.footerCol}>
              <Button
                variant="grey"
                disabled={postponed.trim().length < 3}
                onClick={() => setStep("rhythm")}
              >
                {tPostponed("next")}
              </Button>
            </div>
            <div className={styles.footerSplit}>
              <Button variant="ghost" onClick={() => setStep("moment")}>
                {tCat("back")}
              </Button>
              <Button variant="ghost" onClick={() => setStep("rhythm")}>
                {tPostponed("skip")}
              </Button>
            </div>
          </div>
        </main>
      );
    }

    // ─────────────── Что мешает и когда свободен ───────────────
    if (step === "rhythm") {
      return (
        <main key={step} className={styles.screen}>
          <SvcLabel tone="pink">{tRhythm("step")}</SvcLabel>
          <h1 className={styles.title}>{tRhythm("title")}</h1>
          <p className={styles.hint}>{tRhythm("hint")}</p>

          <div className={styles.chips}>
            {ONBOARDING_BARRIERS.map((b) => (
              <Chip
                key={b}
                tone="pink"
                selected={barrier === b}
                // Повторный тап снимает выбор: назвать препятствие — право, а не обязанность.
                onClick={() => setBarrier((prev) => (prev === b ? null : b))}
              >
                {tRhythm(`barrier${b}`)}
              </Chip>
            ))}
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <SvcLabel tone="muted" className={styles.rowLabel}>
                {tRhythm("windowsLabel")}
              </SvcLabel>
              <div className={styles.chips}>
                {ONBOARDING_WINDOWS.map((w) => (
                  <Chip key={w} selected={windows.has(w)} onClick={() => toggleWindow(w)}>
                    {tRhythm(`window${w}`)}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.dock}>
            <div className={styles.footerCol}>
              <Button
                variant="grey"
                onClick={() => {
                  setParamsBack("rhythm");
                  setStep("params");
                }}
              >
                {tRhythm("next")}
              </Button>
            </div>
            <div className={styles.footerSplit}>
              <Button variant="ghost" onClick={() => setStep("postponed")}>
                {tCat("back")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setBarrier(null);
                  setWindows(new Set());
                  setParamsBack("rhythm");
                  setStep("params");
                }}
              >
                {tRhythm("skip")}
              </Button>
            </div>
          </div>
        </main>
      );
    }

    // ─────────────── Params ───────────────
    return (
      <main key={step} className={styles.screen}>
        <SvcLabel tone="pink">{tParams("step")}</SvcLabel>
        <h1 className={styles.title}>{tParams("title")}</h1>

        <div className={styles.rows}>
          {/* Имя — строкой рамок, а не отдельным шагом: чаще всего имя из Telegram
            уже верное, и целый экран ради «да, так» удлинил бы онбординг. Идёт
            и на пути «У меня уже есть профиль» — рамки там единственный экран. */}
          <div className={styles.row}>
            <label htmlFor="onboarding-name">
              <SvcLabel tone="muted" className={styles.rowLabel}>
                {tParams("nameLabel")}
              </SvcLabel>
            </label>
            <Input
              id="onboarding-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tParams("namePlaceholder")}
              maxLength={60}
              autoComplete="given-name"
            />
          </div>

          <div className={styles.row}>
            <SvcLabel tone="muted" className={styles.rowLabel}>
              {tParams("budgetLabel")}
            </SvcLabel>
            <div className={styles.chips}>
              {(["low", "mid", "any"] as const).map((k) => (
                <Chip key={k} selected={budgetKey === k} onClick={() => setBudgetKey(k)}>
                  {k === "any"
                    ? tParams("budgetAny")
                    : tParams(k === "low" ? "budgetLow" : "budgetMid", {
                        amount: money(ONBOARDING_BUDGET[currency][k]),
                      })}
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
                <Chip
                  key={k}
                  tone="pink"
                  selected={socialKey === k}
                  onClick={() => setSocialKey(k)}
                >
                  {tParams(
                    k === "solo" ? "socialSolo" : k === "close" ? "socialClose" : "socialNew",
                  )}
                </Chip>
              ))}
            </div>
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
                    k === "calm"
                      ? "noveltyCalm"
                      : k === "balance"
                        ? "noveltyBalance"
                        : "noveltyBold",
                  )}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.note}>
          <HandNote>{tParams("note")}</HandNote>
        </div>

        {saveFailed && (
          <p role="alert" className={styles.error}>
            {tParams("error")}
          </p>
        )}

        <div className={styles.dock}>
          <div className={styles.footer}>
            <Button
              variant="secondary"
              className={styles.narrow}
              disabled={pending}
              onClick={() => setStep(paramsBack)}
            >
              {tParams("back")}
            </Button>
            <Button variant="primary" className={styles.grow} disabled={pending} onClick={finish}>
              {pending ? tParams("saving") : tParams("finish")}
            </Button>
          </div>
        </div>
      </main>
    );
  })();

  // Обложка — сама лист; остальные шаги — в общей сцене на бумаге.
  if (step === "welcome") return screen;
  return <div className={styles.stage}>{screen}</div>;
}
