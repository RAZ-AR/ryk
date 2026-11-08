"use client";

import { useState } from "react";
import type { LifeCategory } from "@/generated/prisma/enums";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Dock, type DockSection } from "@/components/Dock";
import { DockIcon } from "@/components/DockIcon";
import { CategoryIcon } from "@/components/CategoryIcon";
import { EmptyMark } from "@/components/EmptyMark";
import { ExperiencePattern } from "@/components/ExperiencePattern";
import { DayLeaf } from "@/components/home/DayLeaf";
import { YearSummary } from "@/components/year/YearSummary";
import type { Today } from "@/lib/engine/today";
import type { YearView } from "@/lib/engine/year";
import { HandNote } from "@/components/HandNote";
import { MemoryCard } from "@/components/MemoryCard";
import { RykNote } from "@/components/RykNote";
import { SvcLabel } from "@/components/SvcLabel";
import { AuraArt } from "@/components/AuraArt";
import type { AuraPalette, AuraShape } from "@/lib/ui/aura";
import { Ticket } from "@/components/Ticket";
import styles from "./page.module.css";

/**
 * Витрина дизайн-системы (ryk_docs/17-design-system.md v2.1 «Аура»).
 * Внутренняя страница для проверки примитивов — не часть продуктового флоу.
 */

/** Материалы v2.0: поле, бумага, чернила, бренд и четыре фольги. */
const SWATCHES: ReadonlyArray<{ token: string; varName: string }> = [
  { token: "поле", varName: "--ryk-paper" },
  { token: "бумага", varName: "--ryk-white" },
  { token: "бумага-2", varName: "--ryk-surface-muted" },
  { token: "ink", varName: "--ryk-ink" },
  { token: "text-muted", varName: "--ryk-text-muted" },
  { token: "pink", varName: "--ryk-pink" },
  { token: "pink-text", varName: "--ryk-pink-text" },
  { token: "success", varName: "--ryk-success" },
  { token: "фольга · роза", varName: "--foil-rose" },
  { token: "фольга · солнце", varName: "--foil-sun" },
  { token: "фольга · серебро", varName: "--foil-silver" },
  { token: "фольга · лента", varName: "--foil-strip" },
];

/** Все семь фигур — каждая на своей палитре, как на референсе. */
const AURA_DEMO: ReadonlyArray<{ shape: AuraShape; palette: AuraPalette; label: string }> = [
  { shape: "flower", palette: "peach", label: "цветок · персик" },
  { shape: "heart", palette: "rose", label: "сердце · роза" },
  { shape: "halo", palette: "butter", label: "ореол · масло" },
  { shape: "rings", palette: "mint", label: "кольца · мята" },
  { shape: "rays", palette: "sunrise", label: "лучи · рассвет" },
  { shape: "wave", palette: "dusk", label: "волна · сумерки" },
  { shape: "glow", palette: "sky", label: "свечение · небо" },
  { shape: "halo", palette: "citrus", label: "ореол · цитрус" },
  { shape: "flower", palette: "lilac", label: "цветок · сирень" },
];

/** Все девять мотивов на одном экране — так видно, что они не похожи друг на друга. */
const PATTERN_CATEGORIES: ReadonlyArray<LifeCategory> = [
  "NATURE",
  "CULTURE",
  "MOVEMENT",
  "CONNECTION",
  "JOY",
  "DISCOVERY",
  "CHALLENGE",
  "REST",
  "CONTRIBUTION",
];

/** Год с перекосом — так видно, что полосы читаются без шкалы и процентов. */
const YEAR_DEMO: YearView = {
  year: 2026,
  total: 11,
  rows: [
    { category: "NATURE", count: 5, share: 1 },
    { category: "CONNECTION", count: 3, share: 0.6 },
    { category: "CULTURE", count: 2, share: 0.4 },
    { category: "REST", count: 1, share: 0.2 },
  ],
  top: "NATURE",
};

/**
 * Лист дня со всеми строками сразу: погода, свет, «Скоро» из двух строк —
 * праздник днём недели и событие датой. Так видно самый длинный лист, какой
 * бывает: если он дышит, короткие тоже.
 */
const TODAY_DEMO: Today = {
  dateIso: "2026-04-09",
  weekday: 4,
  dayOfYear: 99,
  cityName: "Белград",
  countryName: "Сербия",
  name: "Аня",
  weather: { kind: "CLEAR", tempMax: 19, sunrise: "06:24", sunset: "19:41" },
  joyKey: "sunsetToEnd",
  joyParams: { time: "19:41" },
  soon: [
    { type: "moment", date: "2026-04-12", kind: "holiday", key: "rs.easter" },
    { type: "experience", date: "2026-04-18", id: "demo", title: "Ночной поход к маяку" },
  ],
};

const EMOTIONS = ["Восторг", "Спокойствие", "Гордость", "Близость"];
const BUDGETS = ["до 500 ₽", "до 2 000 ₽", "не важно"];

export default function DesignSystemPage() {
  const [emotion, setEmotion] = useState(1);
  const [budget, setBudget] = useState(0);
  const [section, setSection] = useState<DockSection>("now");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <SvcLabel tone="pink">Design system · v2.1 «Аура»</SvcLabel>
        <div className={styles.logo}>RYK</div>
        <p className={styles.body}>
          Облачное поле, билеты с аурами вместо фольги. Референсы — голографические билеты Tokyo
          2020 и постеры «aura»: мягкие размытые фигуры на пастели (ADR-014, ADR-016).
        </p>
      </header>

      <section className={styles.section}>
        <SvcLabel tone="pink">01</SvcLabel>
        <h2 className={styles.sectionTitle}>Цвет</h2>
        <div className={styles.swatches}>
          {SWATCHES.map((s) => (
            <div key={s.token} className={styles.swatch}>
              <div className={styles.swatchChip} style={{ background: `var(${s.varName})` }} />
              <div className={styles.swatchMeta}>
                <SvcLabel tone="faint">{s.token}</SvcLabel>
                <div className={styles.swatchName}>{s.varName}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">02</SvcLabel>
        <h2 className={styles.sectionTitle}>Типографика</h2>
        <div className={styles.stack}>
          <div className={styles.display}>Этот момент теперь твой.</div>
          <div className={styles.h1}>Что делает тебя живым?</div>
          <div className={styles.serifLead}>Жизнь не должна ждать свободного времени.</div>
          <div className={styles.ticketTitle}>Ночной поход к маяку</div>
          <div className={styles.quote}>Ты просил «звёзды без города», и в субботу ясно.</div>
          <div className={styles.mono}>СБ · 19:30 · 1 500 ₽</div>
          <SvcLabel tone="muted">Неделя 30 / Выбор истории</SvcLabel>
          <div className={styles.body}>
            Каждую неделю Ryk помогает прожить одно впечатление —{" "}
            <span className={styles.highlight}>не задачу, а историю.</span>
          </div>
          <HandNote>это не провал — просто погода</HandNote>
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">03</SvcLabel>
        <h2 className={styles.sectionTitle}>Кнопки</h2>
        <div className={styles.buttons}>
          <Button variant="primary">Да, история недели</Button>
          <Button variant="secondary">Не складывается</Button>
          <Button variant="grey">Сохранить в желания</Button>
          <Button variant="ghost">Выбери за меня →</Button>
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">04</SvcLabel>
        <h2 className={styles.sectionTitle}>Чипы</h2>
        <div className={styles.stack}>
          <div>
            <SvcLabel tone="muted">Бюджет на историю</SvcLabel>
            <div className={styles.row} style={{ marginTop: 11 }}>
              {BUDGETS.map((label, i) => (
                <Chip key={label} selected={budget === i} onClick={() => setBudget(i)}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <SvcLabel tone="muted">Какое чувство осталось?</SvcLabel>
            <div className={styles.row} style={{ marginTop: 11 }}>
              {EMOTIONS.map((label, i) => (
                <Chip
                  key={label}
                  tone="pink"
                  selected={emotion === i}
                  onClick={() => setEmotion(i)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">05</SvcLabel>
        <h2 className={styles.sectionTitle}>Ауры</h2>
        <p className={styles.body}>
          Картинка карточки — мягкая размытая фигура на пастели. Фигура и палитра выбираются по
          заголовку: у каждой карточки своя, и она не меняется. Свет медленно дышит и сдвигается при
          наклоне телефона; вне экрана — пауза.
        </p>
        <div className={styles.artRow}>
          {AURA_DEMO.map(({ shape, palette, label }) => (
            <div key={label} className={styles.artCell}>
              <div className={styles.artBox}>
                <AuraArt shape={shape} palette={palette} seed={label} />
              </div>
              <SvcLabel tone="muted">{label}</SvcLabel>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">06</SvcLabel>
        <h2 className={styles.sectionTitle}>Билет</h2>
        <div className={styles.tickets}>
          <Ticket
            metaLeft="СБ"
            metaRight="19:30"
            metaRightSub="Природа"
            emblem={<CategoryIcon category="NATURE" />}
            title="Ночной поход к маяку"
            stubTone="pink"
            stubLabel="История недели · кандидат"
          >
            <b>Почему:</b> 3 сохранения «звёзды»
            <br />
            <b>Погода:</b> СБ — ясно, 8°
            <br />
            <b>3 часа · 12 км · 1 500 ₽</b>
          </Ticket>

          <Ticket
            photoPlaceholder="Фото идеи"
            metaLeft="07"
            metaRight="15"
            metaRightSub="Вызов"
            emblem={<CategoryIcon category="CHALLENGE" />}
            title="Скалодром для новичков"
            stubTone="neutral"
            stubLabel="VII · Вызов"
          >
            Инструктор и снаряжение включены. Можно прийти одному.
            <br />
            <b>800 ₽ · 1,5 ч</b>
          </Ticket>

          <Ticket
            photoPlaceholder="Фото маяка"
            metaLeft="СБ"
            metaRight="19:30"
            emblem={<CategoryIcon category="CONNECTION" />}
            title="Ночной поход к маяку"
            note="В субботу иду смотреть на звёзды к маяку. Пойдёшь со мной?"
            stubTone="grey"
            stubLabel="Приглашение · кому"
          >
            <b>Аня</b> · свободна в субботу
          </Ticket>
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">07</SvcLabel>
        <h2 className={styles.sectionTitle}>Реплика Ryk</h2>
        <div className={styles.stack}>
          <RykNote label="Ryk напоминает">
            План держится. Аня подтвердила субботу. Осталось одно:{" "}
            <span className={styles.highlight}>найти фонарик</span> — можно одолжить у Ани.
          </RykNote>
          <RykNote label="Что увидит Марк" quote>
            «На этой неделе я иду в ночной поход к маяку. Итог — в воскресенье.»
          </RykNote>
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">08</SvcLabel>
        <h2 className={styles.sectionTitle}>Память</h2>
        <div className={styles.memories}>
          <MemoryCard
            week="Неделя 30"
            title="Ночной поход к маяку"
            quote="звёзды — как в детстве"
            companion="с Аней"
            dot="pink"
          />
          <MemoryCard
            week="Неделя 29"
            title="Гончарная мастерская"
            quote="кружка кривая, но моя"
            companion="с Аней"
            dot="rose"
          />
          <MemoryCard
            week="Неделя 27"
            title="Рассвет на крыше"
            quote="в 4 утра город другой"
            companion="один"
            dot="gold"
          />
          <MemoryCard
            week="Неделя 28"
            title="Перенесено — без вины"
            companion="вернётся"
            dot="empty"
            deferred
          />
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">09</SvcLabel>
        <h2 className={styles.sectionTitle}>Dock</h2>
        <div className={styles.phone}>
          <div className={styles.phoneBody}>
            <SvcLabel tone="pink">Неделя 30 / Активна</SvcLabel>
            <div className={styles.h1} style={{ marginTop: 8 }}>
              Раздел: {section}
            </div>
          </div>
          {/* Витрина живёт без провайдера переводов, поэтому подписи здесь —
              русские литералы: /design внутренняя страница, а не продукт. */}
          <Dock
            active={section}
            onNavigate={setSection}
            labels={{ now: "Сейчас", wish: "Хочу", past: "Было" }}
            ariaLabel="Основная навигация"
          />
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">10</SvcLabel>
        <h2 className={styles.sectionTitle}>Узоры впечатлений</h2>
        <div className={styles.patterns}>
          {PATTERN_CATEGORIES.map((category) => (
            <figure key={category} className={styles.patternCell}>
              <div className={styles.patternBox}>
                <ExperiencePattern seed={`demo-${category}`} category={category} />
              </div>
              <figcaption className={styles.patternCaption}>{category}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">11</SvcLabel>
        <h2 className={styles.sectionTitle}>Знаки категорий</h2>
        <p className={styles.body}>
          Тот же мотив, что у узора выше, сжатый до 16px. Слева — как стоит рядом с подписью корешка
          (12px), справа — в кружке карусели (28px).
        </p>
        <div className={styles.patterns}>
          {PATTERN_CATEGORIES.map((category) => (
            <figure key={category} className={styles.patternCell}>
              <div className={styles.iconRow}>
                <SvcLabel tone="ink">
                  <CategoryIcon category={category} /> {category}
                </SvcLabel>
                <CategoryIcon category={category} size="m" />
              </div>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">12</SvcLabel>
        <h2 className={styles.sectionTitle}>Знаки дока</h2>
        <p className={styles.body}>
          Крупно — как нарисовано. В размере 16px они стоят в самом доке (раздел 08).
        </p>

        <div className={styles.dockIconRow}>
          {(["now", "wish", "past"] as const).map((section) => (
            <figure key={section} className={styles.dockIconCell}>
              <span className={styles.dockIconBig}>
                <DockIcon section={section} />
              </span>
              <figcaption className={styles.patternCaption}>
                {section === "now" ? "Сейчас" : section === "wish" ? "Хочу" : "Было"}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">13</SvcLabel>
        <h2 className={styles.sectionTitle}>Пусто</h2>
        <p className={styles.body}>
          Один знак на все пустые экраны: билет, которого ещё нет. Стоит над фразой, тише её.
        </p>
        <EmptyMark />
        <p className={styles.body}>Здесь появятся прожитые истории.</p>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">14</SvcLabel>
        <h2 className={styles.sectionTitle}>Год</h2>
        <YearSummary year={YEAR_DEMO} />
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">15</SvcLabel>
        <h2 className={styles.sectionTitle}>Лист дня</h2>
        <p className={styles.body}>
          Отрывной лист над главной: число, место, свет, одна радость и две строки «Скоро». Без
          метрик и обратного отсчёта. Тексты — на языке интерфейса.
        </p>
        {/* Без аналитики: просмотр витрины — не просмотр листа человеком. */}
        <DayLeaf today={TODAY_DEMO} trackView={false} />
      </section>
    </main>
  );
}
