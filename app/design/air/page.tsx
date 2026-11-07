"use client";

import { useState } from "react";
import type { LifeCategory } from "@/generated/prisma/enums";
import { AirButton } from "@/components/air/AirButton";
import { AirChip } from "@/components/air/AirChip";
import { AirDock } from "@/components/air/AirDock";
import { Bubble } from "@/components/air/Bubble";
import { DayLeaf } from "@/components/air/DayLeaf";
import { Fog, MOOD_BY_CATEGORY, type FogMood } from "@/components/air/Fog";
import { Glass, GlassButton } from "@/components/air/Glass";
import { HoloTicket } from "@/components/air/HoloTicket";
import { Orb } from "@/components/air/Orb";
import { CategoryIcon } from "@/components/CategoryIcon";
import { DockIcon } from "@/components/DockIcon";
import type { DockSection } from "@/components/Dock";
import styles from "./page.module.css";

/**
 * Витрина «Воздуха» — v1.0, черновик (ADR-013).
 * Показывает новый вид до того, как им перерисуют продукт.
 * Внутренняя страница, тексты — образцы, не переводятся.
 */

const MOODS: ReadonlyArray<{ id: FogMood; note: string }> = [
  { id: "dawn", note: "утро · движение · отдых" },
  { id: "sky", note: "день · открытия · небо" },
  { id: "rose", note: "вечер · близкие" },
  { id: "mint", note: "природа · вклад" },
  { id: "dusk", note: "ночь · культура" },
  { id: "holo", note: "радость · праздник" },
  { id: "ocean", note: "вызов · глубокий, текст белый" },
];

const CATEGORY_NAMES: Record<LifeCategory, string> = {
  NATURE: "Природа",
  CULTURE: "Культура",
  DISCOVERY: "Открытия",
  MOVEMENT: "Движение",
  CONNECTION: "Близкие",
  JOY: "Радость",
  CHALLENGE: "Вызов",
  REST: "Отдых",
  CONTRIBUTION: "Вклад",
};

const LITTLE_JOYS = [
  "Кофе на улице, где ещё не был",
  "Досмотреть закат до конца",
  "Позвонить тому, о ком думал",
  "Первая черешня сезона",
  "Пройти пешком одну остановку",
  "Потанцевать на кухне",
  "Книга в парке на час",
];

const DOCK: ReadonlyArray<{ id: DockSection; label: string; icon: React.ReactNode }> = [
  { id: "now", label: "Сейчас", icon: <DockIcon section="now" /> },
  { id: "wish", label: "Хочу", icon: <DockIcon section="wish" /> },
  { id: "past", label: "Было", icon: <DockIcon section="past" /> },
];

const BackIcon = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M16 10 H4 M9 5 L4 10 L9 15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ProfileIcon = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <circle cx="10" cy="7" r="3.2" />
    <path d="M3.5 17 C4.5 13.5 7 12 10 12 C13 12 15.5 13.5 16.5 17" strokeLinecap="round" />
  </svg>
);
const HeartIcon = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path
      d="M10 16.5 C10 16.5 3 12.2 3 7.4 A3.6 3.6 0 0 1 10 5.6 A3.6 3.6 0 0 1 17 7.4 C17 12.2 10 16.5 10 16.5 Z"
      strokeLinejoin="round"
    />
  </svg>
);

function Section({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.num}>{num}</div>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export default function AirShowcasePage() {
  const [joys, setJoys] = useState<Set<number>>(new Set([1, 4]));
  const [section, setSection] = useState<DockSection>("now");
  const [phoneSection, setPhoneSection] = useState<DockSection>("now");
  const [onbJoys, setOnbJoys] = useState<Set<number>>(new Set([1]));

  const toggle = (set: Set<number>, i: number) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  };

  return (
    <main className={styles.page}>
      <Fog mood="dawn" className={styles.hero}>
        <div className={styles.heroKicker}>
          Ryk · Design system · v1.2 · туман, перелив, гигантизм
        </div>
        <h1 className={styles.heroTitle}>Каждый день может быть полным.</h1>
        <p className={styles.heroLead}>
          Светлое небо и цветной туман, который течёт и переливается. Шрифты исходного дизайна —
          Prata, PT Serif, Plex Mono — и гигантские цифры: одна большая мысль на экран.
        </p>
      </Fog>

      <Section num="01" title="Туман">
        <p className={styles.lead}>
          Цвет — это настроение, а не раскраска. Туман выбирается по контексту: время суток,
          категория, погода. Семь настроений, у каждого четыре токена <code>--fog-*</code>.
        </p>
        <div className={styles.moods}>
          {MOODS.map((m) => (
            <Fog key={m.id} mood={m.id} className={styles.mood}>
              <div className={styles.moodName}>{m.id}</div>
              <div className={styles.moodNote}>{m.note}</div>
            </Fog>
          ))}
        </div>
        <div className={styles.catMap}>
          {(Object.keys(CATEGORY_NAMES) as LifeCategory[]).map((c) => (
            <div key={c} className={styles.catRow}>
              <CategoryIcon category={c} />
              <span>{CATEGORY_NAMES[c]}</span>
              <span className={styles.catMood}>{MOOD_BY_CATEGORY[c]}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section num="02" title="Типографика">
        <p className={styles.lead}>
          Шрифты исходного дизайна. Prata — гигантские цифры и заголовки, PT Serif — текст и
          курсив-голос Ryk, Plex Mono — служебные строки. Иерархию держит кегль, а не жирность.
        </p>
        <div className={styles.typeStack}>
          <div className={styles.tDisplay}>14</div>
          <div className={styles.tH1}>Радость не измеряется размером.</div>
          <div className={styles.tH2}>Что сделает эту неделю живой?</div>
          <div className={styles.tQuote}>«Закат сегодня в 20:04 — досмотри его до конца.»</div>
          <div className={styles.tBody}>
            Каждую неделю Ryk помогает прожить одно впечатление — не задачу, а историю. А между
            историями — замечать маленькое.
          </div>
          <div className={styles.tCaption}>Подпись · 13 / 600 · вторичный текст</div>
          <div className={styles.tMono}>RYK · НЕДЕЛЯ 33 · СБ 19:30</div>
        </div>
      </Section>

      <Section num="03" title="Кнопки">
        <Fog mood="rose" className={styles.stage}>
          <div className={styles.row}>
            <GlassButton label="Назад">{BackIcon}</GlassButton>
            <Glass>Белград · Сербия</Glass>
            <GlassButton label="Профиль">{ProfileIcon}</GlassButton>
          </div>
          <div className={styles.col}>
            <AirButton variant="ink">Начать жить чуть больше</AirButton>
            <AirButton variant="pink">Сделать историей недели</AirButton>
            <AirButton variant="glass">Позже</AirButton>
            <AirButton variant="ink" disabled>
              Сохраняю…
            </AirButton>
          </div>
        </Fog>
        <p className={styles.note}>
          ink — главное действие, одно на экран. pink — перелив, действие бренда. glass — контур,
          второстепенное.
        </p>
      </Section>

      <Section num="04" title="Чипы">
        <div className={styles.chips}>
          {LITTLE_JOYS.map((j, i) => (
            <AirChip key={j} selected={joys.has(i)} onClick={() => setJoys((s) => toggle(s, i))}>
              {j}
            </AirChip>
          ))}
        </div>
      </Section>

      <Section num="05" title="Билет">
        <p className={styles.lead}>
          Верх — голографическая афиша: хочется прожить. Корешок — строгая сетка: понятно, как.
          Вырезы — вырубка формы; зерно — печать на плёнке.
        </p>
        <div className={styles.tickets}>
          <HoloTicket
            mood="holo"
            kicker="Ryk · неделя 33"
            title="Закат"
            subtitle="Природа"
            placeLabel="Место"
            place="Калемегдан, Белград"
            day="16"
            month="авг"
            rows={[
              { label: "День", value: "СБ" },
              { label: "Время", value: "19:40" },
              { label: "Цена", value: "0 ₽" },
              { label: "С кем", value: "Аня" },
            ]}
            footnote="История не передаётся · только твоя"
            stamp={<CategoryIcon category="NATURE" size="m" />}
          />
          <HoloTicket
            mood="rose"
            kicker="Ryk · неделя 33"
            title="Джаз"
            subtitle="Культура"
            placeLabel="Место"
            place="Дом омладине"
            day="21"
            month="авг"
            rows={[
              { label: "День", value: "ЧТ" },
              { label: "Время", value: "21:00" },
              { label: "Цена", value: "1 200" },
              { label: "С кем", value: "один" },
            ]}
            footnote="Свидетель: Миша · узнает только итог"
            stamp={<CategoryIcon category="CULTURE" size="m" />}
          />
        </div>
      </Section>

      <Section num="06" title="Свет и пузыри">
        <p className={styles.lead}>
          Орб — предмет из света: светится изнутри и тает в белом. Один живой на экран, остальные
          неподвижны. Пузырь — один факт в сфере: без шкал, сравнений и прогресса.
        </p>
        <div className={styles.orbs}>
          <Orb mood="rose" size={180} />
          <Orb mood="holo" size={140} still />
          <Orb mood="sky" size={110} still />
          <Orb mood="mint" size={90} still />
        </div>
        <div className={styles.bubbles}>
          <Bubble mood="sky" label="Небо" value="+27" unit="°" caption="ясно · закат 20:04" />
          <Bubble mood="holo" label="Скоро" value="4" unit="дня" caption="Велика Госпојина" />
          <Bubble mood="ocean" label="Неделя" value="СБ" caption="Закат на Калемегдане" />
        </div>
      </Section>

      <Section num="07" title="Док">
        <Fog mood="mint" className={styles.dockStage}>
          <AirDock items={DOCK} active={section} onNavigate={setSection} ariaLabel="Навигация" />
        </Fog>
      </Section>

      <Section num="08" title="Экраны">
        <div className={styles.phones}>
          <figure className={styles.figure}>
            <div className={styles.phone}>
              <div className={styles.screen}>
                <DayLeaf
                  mood="rose"
                  place="Белград · Сербия"
                  weekday="Пятница"
                  day="14"
                  dateLine="августа · 226-й день года"
                  joyKicker="Маленькое на сегодня"
                  joy="Закат в 20:04 — с Калемегдана его видно лучше всего."
                  sky={{ label: "Небо", value: "+27", unit: "°", caption: "ясно весь вечер" }}
                  soon={{ label: "Через 4 дня", value: "15", caption: "Велика Госпојина" }}
                  actions={<GlassButton label="Профиль">{ProfileIcon}</GlassButton>}
                />
                <div className={styles.weekCard}>
                  <span className={styles.weekKicker}>Твоя неделя</span>
                  <span className={styles.weekTitle}>Закат на Калемегдане</span>
                  <span className={styles.weekMeta}>суббота · с Аней</span>
                </div>
              </div>
              <div className={styles.phoneDock}>
                <AirDock
                  items={DOCK}
                  active={phoneSection}
                  onNavigate={setPhoneSection}
                  ariaLabel="Навигация"
                />
              </div>
            </div>
            <figcaption className={styles.caption}>Главная · «Лист дня»</figcaption>
          </figure>

          <figure className={styles.figure}>
            <div className={styles.phone}>
              <Fog mood="dawn" className={styles.onb}>
                <div className={styles.onbStep}>2 из 7</div>
                <h3 className={styles.onbTitle}>Радость не измеряется размером.</h3>
                <p className={styles.onbLead}>
                  Для полного дня не нужно большое событие. Нужно заметить одно маленькое. Что из
                  этого — про тебя?
                </p>
                <div className={styles.onbChips}>
                  {LITTLE_JOYS.slice(0, 6).map((j, i) => (
                    <AirChip
                      key={j}
                      selected={onbJoys.has(i)}
                      onClick={() => setOnbJoys((s) => toggle(s, i))}
                    >
                      {j}
                    </AirChip>
                  ))}
                </div>
                <div className={styles.onbFoot}>
                  <AirButton variant="ink">Дальше</AirButton>
                  <AirButton variant="glass">Пропустить</AirButton>
                </div>
              </Fog>
            </div>
            <figcaption className={styles.caption}>Онбординг · вдохновение</figcaption>
          </figure>

          <figure className={styles.figure}>
            <div className={styles.phone}>
              <div className={styles.screenPad}>
                <Fog mood="ocean" className={styles.moment}>
                  <div className={styles.momentKicker}>Суббота · 16 августа</div>
                  <p className={styles.momentQuote}>«Этот момент теперь твой.»</p>
                  <Orb mood="sky" size={170} className={styles.momentOrb} />
                </Fog>
                <div className={styles.momentActions}>
                  <GlassButton label="Добавить фото">{HeartIcon}</GlassButton>
                  <AirButton variant="pink" className={styles.grow}>
                    Сохранить
                  </AirButton>
                </div>
              </div>
            </div>
            <figcaption className={styles.caption}>Завершение · воспоминание</figcaption>
          </figure>
        </div>
      </Section>
    </main>
  );
}
