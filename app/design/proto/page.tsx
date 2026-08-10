"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Chip } from "@/components/Chip";
import { ExperiencePattern } from "@/components/ExperiencePattern";
import { HandNote } from "@/components/HandNote";
import { Input } from "@/components/Input";
import { SvcLabel } from "@/components/SvcLabel";
import { Textarea } from "@/components/Textarea";
import { Ticket } from "@/components/Ticket";
import styles from "./page.module.css";

/**
 * Прототип двух сцен из ryk_docs/21-onboarding-and-reward-concept.md.
 *
 * Внутренняя страница, как и /design: не часть продуктового флоу, в док её
 * не ведёт. Смысл — проверить метафору на настоящих токенах и шрифтах и на
 * настоящем телефоне, прежде чем трогать OnboardingFlow и CheckinView.
 *
 * Тексты здесь зашиты по-русски намеренно: это макет для решения «идём или
 * не идём», а не экран, который поедет в трёх языках. Появится в продукте —
 * поедет через messages, как всё остальное.
 */

/** Два направления арт-дирекшена: чем значение ложится на бланк. */
type Direction = "blank" | "stamp";
type Scene = "onboarding" | "redeem";

type FieldKey = "place" | "kind" | "time" | "price" | "who" | "what";

const ROWS: ReadonlyArray<{ key: FieldKey; label: string }> = [
  { key: "place", label: "Место" },
  { key: "kind", label: "Род" },
  { key: "time", label: "Время" },
  { key: "price", label: "Цена" },
  { key: "who", label: "Кто" },
  { key: "what", label: "Что" },
];

type Step = "place" | "kind" | "time" | "price" | "who" | "back" | "issue" | "done";

const STEP_FIELD: Partial<Record<Step, FieldKey>> = {
  place: "place",
  kind: "kind",
  time: "time",
  price: "price",
  who: "who",
  issue: "what",
};

const KINDS = ["Природа", "Культура", "Открытие", "Движение", "Близость", "Радость"];
const WINDOWS = ["Будни утром", "Будни вечером", "Суббота днём", "Выходные вечером"];
const PRICES = ["До 1500", "До 4000", "Не важно"];
const WHOS = ["Одному", "С близкими", "С новыми людьми"];

/** Строка, которую Ryk вписывает сам. */
const RYK_LINE = "Органный концерт в Соборе";

/*
 * Настройка «меньше движения» — внешнее состояние браузера, а не наше.
 * Поэтому подписка, а не useState в эффекте: иначе первый кадр всегда
 * врал бы «движение разрешено» и вызывал лишний рендер.
 */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    // На сервере медиазапроса нет; разметка совпадёт после гидратации.
    () => false,
  );
}

export default function ProtoPage() {
  const [direction, setDirection] = useState<Direction>("blank");
  const [scene, setScene] = useState<Scene>("onboarding");

  return (
    <main
      className={[styles.page, direction === "blank" ? styles.dirBlank : styles.dirStamp].join(" ")}
    >
      <header className={styles.head}>
        <SvcLabel tone="pink">Прототип · концепт 21</SvcLabel>
        <h1 className={styles.headTitle}>Бланк и погашение</h1>
        <p className={styles.headBody}>
          Две сцены из{" "}
          <a href="https://github.com/RAZ-AR/ryk/blob/main/ryk_docs/21-onboarding-and-reward-concept.md">
            концепта
          </a>{" "}
          на настоящих токенах и шрифтах. Переключатель направления меняет одно: чем значение
          ложится на бланк и чем помечается погашенный билет. Витрина примитивов —{" "}
          <Link href="/design">/design</Link>.
        </p>
      </header>

      <div className={styles.switches}>
        <div className={styles.switch}>
          <SvcLabel tone="muted">Сцена</SvcLabel>
          <div className={styles.switchRow}>
            <Chip selected={scene === "onboarding"} onClick={() => setScene("onboarding")}>
              Бланк выписывается
            </Chip>
            <Chip selected={scene === "redeem"} onClick={() => setScene("redeem")}>
              Билет гасится
            </Chip>
          </div>
        </div>

        <div className={styles.switch}>
          <SvcLabel tone="muted">Направление</SvcLabel>
          <div className={styles.switchRow}>
            <Chip
              tone="pink"
              selected={direction === "blank"}
              onClick={() => setDirection("blank")}
            >
              A · Бланк строгой отчётности
            </Chip>
            <Chip
              tone="pink"
              selected={direction === "stamp"}
              onClick={() => setDirection("stamp")}
            >
              B · Штемпельная книжка
            </Chip>
          </div>
        </div>
      </div>

      <div className={styles.column}>
        {scene === "onboarding" ? <OnboardingScene /> : <RedeemScene />}
      </div>
    </main>
  );
}

/* ─────────────────────── Сцена 1: бланк выписывается ─────────────────────── */

function OnboardingScene() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>("place");
  const [city, setCity] = useState("Белград");
  const [kinds, setKinds] = useState<string[]>([]);
  const [windows, setWindows] = useState<string[]>([]);
  const [price, setPrice] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [good, setGood] = useState("");
  const [postponed, setPostponed] = useState("");
  const [chars, setChars] = useState(0);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  /*
   * Единственная строка, которую пишет не человек. Печать по буквам —
   * не украшение: она показывает, что билет дописывает Ryk, а не форма
   * сама себя заполнила. Без движения строка появляется целиком.
   */
  const typed = reduced ? RYK_LINE : RYK_LINE.slice(0, chars);

  useEffect(() => {
    if (step !== "issue" || reduced) return;
    if (chars >= RYK_LINE.length) return;
    const id = window.setTimeout(() => setChars(chars + 1), 45);
    return () => window.clearTimeout(id);
  }, [step, reduced, chars]);

  const goIssue = () => {
    setChars(0);
    setStep("issue");
  };

  const restart = () => {
    setChars(0);
    setStep("place");
  };

  const values: Record<FieldKey, string | null> = useMemo(
    () => ({
      place: city.trim() || null,
      kind: kinds.length ? kinds.slice(0, 2).join(", ") + (kinds.length > 2 ? "…" : "") : null,
      time: windows.length
        ? windows[0] + (windows.length > 1 ? " +" + (windows.length - 1) : "")
        : null,
      price: price,
      who: who,
      what: step === "issue" || step === "done" ? typed || null : null,
    }),
    [city, kinds, windows, price, who, step, typed],
  );

  const currentField = STEP_FIELD[step] ?? null;

  if (step === "done") {
    return (
      <div className={styles.issued}>
        <div className={styles.issuedLead}>Билет выписан. Осталось прийти.</div>
        <Ticket
          photo={<ExperiencePattern seed="proto-organ" category="CULTURE" />}
          metaLeft="СБ"
          metaRight="19:00"
          title={RYK_LINE}
          stubLabel="История недели"
          stubIcon={<CategoryIcon category="CULTURE" />}
        >
          <b>Почему:</b> ты отметил культуру и вечера выходных.
          <br />
          {city} · до 4000
        </Ticket>
        <Button variant="ghost" onClick={restart}>
          Ещё раз с начала
        </Button>
        <p className={styles.gloss}>
          Setup закончился выдачей предмета: последнюю строку вписал Ryk, билет оторвался и стал
          первой неделей. Служебного счётчика «шаг 6 из 7» во флоу не было ни разу — прогресс всё
          время показывал сам бланк.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.blankWrap}>
        <div className={[styles.flip, step === "back" && styles.flipped].filter(Boolean).join(" ")}>
          <div className={styles.blank}>
            <div className={styles.blankHead}>
              <SvcLabel tone="ink">Ryk · билет</SvcLabel>
              <SvcLabel tone="faint">№ 001</SvcLabel>
            </div>

            {ROWS.map((row) => {
              const value = values[row.key];
              return (
                <div
                  key={row.key}
                  className={[
                    styles.row,
                    value ? styles.rowFilled : styles.rowEmpty,
                    currentField === row.key && styles.rowCurrent,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={styles.rowLabel}>{row.label}</span>
                  <span className={styles.leader} aria-hidden="true" />
                  <span className={styles.rowValue}>
                    {value ?? "—"}
                    {row.key === "what" && step === "issue" && typed !== RYK_LINE ? (
                      <span className={styles.caret} aria-hidden="true" />
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Оборот: две строки, которые видит только Ryk. */}
          <div className={styles.blankBack} aria-hidden={step !== "back"}>
            <SvcLabel tone="ink">Оборот</SvcLabel>
            <div className={styles.stubText}>
              Здесь то, что не влезает в графу: чем была хороша та неделя и что всё откладывается.
            </div>
          </div>
        </div>
      </div>

      <div className={styles.ask}>
        {step === "place" && (
          <>
            <h2 className={styles.question}>Где сейчас твоя жизнь?</h2>
            <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
            <div className={styles.footer}>
              <Button variant="grey" disabled={!city.trim()} onClick={() => setStep("kind")}>
                Дальше
              </Button>
            </div>
          </>
        )}

        {step === "kind" && (
          <>
            <h2 className={styles.question}>Что делает неделю живой?</h2>
            <div className={styles.chips}>
              {KINDS.map((k) => (
                <Chip
                  key={k}
                  selected={kinds.includes(k)}
                  onClick={() => toggle(kinds, setKinds, k)}
                >
                  {k}
                </Chip>
              ))}
            </div>
            <div className={styles.footer}>
              <Button variant="grey" disabled={!kinds.length} onClick={() => setStep("time")}>
                Дальше
              </Button>
              <Button variant="ghost" onClick={() => setStep("time")}>
                Пропустить
              </Button>
            </div>
          </>
        )}

        {step === "time" && (
          <>
            <h2 className={styles.question}>Когда у тебя случается свободное время?</h2>
            <div className={styles.chips}>
              {WINDOWS.map((w) => (
                <Chip
                  key={w}
                  selected={windows.includes(w)}
                  onClick={() => toggle(windows, setWindows, w)}
                >
                  {w}
                </Chip>
              ))}
            </div>
            <div className={styles.footer}>
              <Button variant="grey" onClick={() => setStep("price")}>
                Дальше
              </Button>
              <Button variant="ghost" onClick={() => setStep("price")}>
                Пропустить
              </Button>
            </div>
          </>
        )}

        {step === "price" && (
          <>
            <h2 className={styles.question}>Сколько стоит хорошая история?</h2>
            <div className={styles.chips}>
              {PRICES.map((p) => (
                <Chip key={p} selected={price === p} onClick={() => setPrice(p)}>
                  {p}
                </Chip>
              ))}
            </div>
            <div className={styles.footer}>
              <Button variant="grey" onClick={() => setStep("who")}>
                Дальше
              </Button>
            </div>
          </>
        )}

        {step === "who" && (
          <>
            <h2 className={styles.question}>С кем ты чаще всего?</h2>
            <div className={styles.chips}>
              {WHOS.map((w) => (
                <Chip key={w} tone="pink" selected={who === w} onClick={() => setWho(w)}>
                  {w}
                </Chip>
              ))}
            </div>
            <div className={styles.footer}>
              <Button variant="grey" onClick={() => setStep("back")}>
                Дальше
              </Button>
            </div>
          </>
        )}

        {step === "back" && (
          <>
            <h2 className={styles.question}>Переверни билет.</h2>
            <p className={styles.hint}>
              На обороте — две строки, которые видит только Ryk. В графу они не влезают, и это
              единственное место во флоу, где мы просим написать словами.
            </p>
            <div className={styles.fields}>
              <Textarea
                value={good}
                onChange={(e) => setGood(e.target.value)}
                placeholder="Момент, когда тебе было по-настоящему хорошо"
                rows={3}
                maxLength={500}
              />
              <Textarea
                value={postponed}
                onChange={(e) => setPostponed(e.target.value)}
                placeholder="А что всё откладывается?"
                rows={3}
                maxLength={500}
              />
            </div>
            <div className={styles.footer}>
              <Button variant="grey" onClick={goIssue}>
                Дальше
              </Button>
              <Button variant="ghost" onClick={goIssue}>
                Пропустить
              </Button>
            </div>
          </>
        )}

        {step === "issue" && (
          <>
            <h2 className={styles.question}>Последнюю строку впишет Ryk.</h2>
            <div className={styles.note}>
              <HandNote>по тому, что ты рассказал</HandNote>
            </div>
            <div className={styles.footer}>
              <Button
                variant="primary"
                disabled={typed !== RYK_LINE}
                onClick={() => setStep("done")}
              >
                Оторвать билет
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─────────────────────── Сцена 2: билет гасится ─────────────────────── */

type Phase = "before" | "punched" | "tearing" | "redeemed";

const EMOTIONS = ["Восторг", "Спокойствие", "Гордость", "Близость"];

/** Длительность ухода верха. Совпадает с `topAway` в CSS. */
const TEAR_MS = 420;

function RedeemScene() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("before");
  const [emotion, setEmotion] = useState<string | null>(null);
  const [souvenir, setSouvenir] = useState("");
  const [withPhoto, setWithPhoto] = useState(false);

  /*
   * Отрыв — отдельная фаза, а не переход между экранами: весь смысл сцены в
   * том, что верх билета уходит, а корешок остаётся. Без движения фаза
   * проскакивается — конечное состояние то же самое.
   */
  const redeem = () => {
    if (reduced) {
      setPhase("redeemed");
      return;
    }
    setPhase("tearing");
    window.setTimeout(() => setPhase("redeemed"), TEAR_MS);
  };

  if (phase === "redeemed") {
    return (
      <div className={styles.redeem}>
        {/*
         * Корешок, оставшийся один. Прототип будущего варианта Ticket:
         * примется механика — переедет в примитив, а не останется здесь.
         */}
        <div className={styles.stubAloneWrap}>
          <div className={styles.stubAlone}>
            <div className={styles.stubTop}>
              <SvcLabel tone="ink" className={styles.stubTag}>
                <CategoryIcon category="CULTURE" /> Культура
              </SvcLabel>
              <SvcLabel tone="ink">14.08 · Белград</SvcLabel>
            </div>
            <div className={styles.stubBody}>
              <div className={styles.stubText}>
                <b>Органный концерт в Соборе</b>
                <br />
                {emotion ?? "без пометки"}
              </div>
              <div className={styles.barcode} aria-hidden="true" />
            </div>

            {souvenir.trim() || withPhoto ? (
              <div className={styles.souvenir}>
                {withPhoto ? <div className={styles.souvenirPhoto}>фото</div> : null}
                {souvenir.trim() ? (
                  <div className={styles.souvenirWord}>«{souvenir.trim()}»</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.closing}>
          <div className={styles.closingLead}>Этот момент теперь твой.</div>
          <Button variant="ghost" onClick={() => setPhase("before")}>
            Ещё раз с начала
          </Button>
        </div>

        <p className={styles.gloss}>
          Корешок остался пустым? Тоже корешок: дата, место и эмоция на нём есть всегда. Сувенир —
          то, чем корешок становится твоим, а не условие, при котором неделя засчитана.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.redeem}>
      <div
        className={[styles.ticketStage, phase === "tearing" && styles.leaving]
          .filter(Boolean)
          .join(" ")}
      >
        {phase === "punched" || phase === "tearing" ? (
          <div className={styles.punch} aria-hidden="true">
            <span className={styles.punchWord}>Погашено</span>
            <span className={styles.punchDate}>14.08</span>
            <span className={styles.punchHoles}>
              <span />
              <span />
              <span />
            </span>
          </div>
        ) : null}

        <Ticket
          photo={<ExperiencePattern seed="proto-organ" category="CULTURE" />}
          metaLeft="СБ"
          metaRight="19:00"
          title="Органный концерт в Соборе"
          stubLabel="История недели"
          stubIcon={<CategoryIcon category="CULTURE" />}
        >
          <b>Почему:</b> ты давно не был там, где громко и тихо одновременно.
          <br />
          <b>На корешок:</b> программка
        </Ticket>
      </div>

      {phase === "before" ? (
        <div className={styles.block}>
          <SvcLabel tone="pink">Как прошло</SvcLabel>
          <div className={styles.switchRow}>
            <Button variant="grey" onClick={() => setPhase("punched")}>
              Сделано
            </Button>
            <Button variant="secondary" onClick={() => setPhase("before")}>
              Перенесено
            </Button>
          </div>
        </div>
      ) : phase === "tearing" ? null : (
        <>
          <div className={styles.block}>
            <SvcLabel tone="muted">Что это было за чувство?</SvcLabel>
            <div className={styles.chips}>
              {EMOTIONS.map((e) => (
                <Chip key={e} tone="pink" selected={emotion === e} onClick={() => setEmotion(e)}>
                  {e}
                </Chip>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <SvcLabel tone="muted">Что осталось?</SvcLabel>
            <p className={[styles.hint, styles.hintTight].join(" ")}>
              Ryk просил программку. Подойдёт что угодно — или ничего.
            </p>
            <Input
              value={souvenir}
              onChange={(e) => setSouvenir(e.target.value)}
              placeholder="Строка, фраза, название"
              maxLength={120}
            />
            <div className={styles.chips}>
              <Chip selected={withPhoto} onClick={() => setWithPhoto((v) => !v)}>
                {withPhoto ? "Фото приложено" : "Приложить фото"}
              </Chip>
            </div>
          </div>

          <div className={styles.footer}>
            <Button variant="primary" onClick={redeem}>
              Погасить билет
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSouvenir("");
                setWithPhoto(false);
                redeem();
              }}
            >
              Ничего не осталось
            </Button>
          </div>
        </>
      )}

      <p className={styles.gloss}>
        Задание («на корешок: программка») выдано вместе с историей, а не после события — иначе
        программку уже не взять. Кнопка «Ничего не осталось» равноправна и не серая: неделя
        закрывается фактом события.
      </p>
    </div>
  );
}
