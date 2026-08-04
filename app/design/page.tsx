"use client";

import { useState } from "react";
import type { LifeCategory } from "@/generated/prisma/enums";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Dock, type DockSection } from "@/components/Dock";
import { CategoryIcon } from "@/components/CategoryIcon";
import { EmptyMark } from "@/components/EmptyMark";
import { ExperiencePattern } from "@/components/ExperiencePattern";
import { YearSummary } from "@/components/year/YearSummary";
import type { YearView } from "@/lib/engine/year";
import { HandNote } from "@/components/HandNote";
import { MemoryCard } from "@/components/MemoryCard";
import { RykNote } from "@/components/RykNote";
import { SvcLabel } from "@/components/SvcLabel";
import { Ticket } from "@/components/Ticket";
import styles from "./page.module.css";

/**
 * Витрина дизайн-системы (ryk_docs/17-design-system.md v0.2).
 * Внутренняя страница для проверки примитивов — не часть продуктового флоу.
 */

const SWATCHES: ReadonlyArray<{ token: string; varName: string }> = [
  { token: "pink", varName: "--ryk-pink" },
  { token: "pink-deep", varName: "--ryk-pink-deep" },
  { token: "pink-text", varName: "--ryk-pink-text" },
  { token: "grey", varName: "--ryk-grey" },
  { token: "paper", varName: "--ryk-paper" },
  { token: "white", varName: "--ryk-white" },
  { token: "surface-card", varName: "--ryk-surface-card" },
  { token: "surface-stub", varName: "--ryk-surface-stub" },
  { token: "surface-muted", varName: "--ryk-surface-muted" },
  { token: "ink", varName: "--ryk-ink" },
  { token: "text-muted", varName: "--ryk-text-muted" },
  { token: "success", varName: "--ryk-success" },
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

const EMOTIONS = ["Восторг", "Спокойствие", "Гордость", "Близость"];
const BUDGETS = ["до 500 ₽", "до 2 000 ₽", "не важно"];

export default function DesignSystemPage() {
  const [emotion, setEmotion] = useState(1);
  const [budget, setBudget] = useState(0);
  const [section, setSection] = useState<DockSection>("now");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <SvcLabel tone="pink">Design system · v0.2</SvcLabel>
        <div className={styles.logo}>RYK</div>
        <p className={styles.body}>
          Бумага и билет. Источник — хендофф <code>design_handoff_ryk/</code>.
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
        <h2 className={styles.sectionTitle}>Билет</h2>
        <div className={styles.tickets}>
          <Ticket
            metaLeft="СБ"
            metaRight="19:30"
            metaRightSub="Природа"
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
        <SvcLabel tone="pink">06</SvcLabel>
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
        <SvcLabel tone="pink">07</SvcLabel>
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
        <SvcLabel tone="pink">08</SvcLabel>
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
        <SvcLabel tone="pink">09</SvcLabel>
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
        <SvcLabel tone="pink">10</SvcLabel>
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
        <SvcLabel tone="pink">11</SvcLabel>
        <h2 className={styles.sectionTitle}>Пусто</h2>
        <p className={styles.body}>
          Один знак на все пустые экраны: билет, которого ещё нет. Стоит над фразой, тише её.
        </p>
        <EmptyMark />
        <p className={styles.body}>Здесь появятся прожитые истории.</p>
      </section>

      <section className={styles.section}>
        <SvcLabel tone="pink">12</SvcLabel>
        <h2 className={styles.sectionTitle}>Год</h2>
        <YearSummary year={YEAR_DEMO} />
      </section>
    </main>
  );
}
