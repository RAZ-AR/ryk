# Build Plan — MVP (для разработки через Claude Code)

> Пошаговый план сборки MVP. Следуем [правилам агента](../CLAUDE.md): план перед
> делом, verify before done, ветка + PR (не в `main`), дизайн-система строго,
> skills actually fire. Каждая фаза заканчивается **✅ Gate** — не переходим
> дальше без зелёной проверки.
>
> Опора: [MVP-скоуп](10-mvp-scope.md) · [флоу](05-user-flows.md) ·
> [архитектура](12-technical-architecture.md) · [дизайн-система](17-design-system.md) ·
> [решения](18-decisions-adr.md) · [аналитика](11-analytics-and-kpis.md).
>
> **Цель MVP:** доказать, что пользователь каждую неделю выбирает историю,
> получает сопровождение и выполняет её чаще, чем без продукта. North Star —
> **Meaningful Weeks**.

## Стек (из ADR)

Next.js (TS strict) full-stack · Prisma · Supabase (Postgres, EU) · Telegram Mini App · Vercel · PostHog · Anthropic Claude API. Шрифты Sora + Inter. i18n en/ru/es.

## Конвенции разработки

- **Ветки:** `main` (prod) ← PR из `staging` ← PR из `feat/*`. Никогда не коммитим в `main` напрямую.
- **Окружения:** Vercel preview (= staging, с защитой) + production; секреты раздельно.
- **Секреты:** только в Vercel/Supabase env; в репо — `.env.example` с именами. Список ключей — [ADR чек-лист](18-decisions-adr.md).
- **Тесты:** Vitest (unit/логика скоринга, валидация), Playwright (тонкий e2e ключевых флоу).
- **Дизайн-линт:** после каждого UI-изменения — проверка диффа против [17 §9 banned patterns](17-design-system.md).
- **Definition of Done** — см. [CLAUDE.md](../CLAUDE.md): тесты/сборка зелёные, UI на 375/768/1280 в light+dark, нет хардкод-токенов, a11y, нет тёмных паттернов.

---

## Фаза 0 — Каркас и репозиторий

**Цель:** пустой, но запускаемый и деплоящийся скелет.

1. `create-next-app` (App Router, TS **strict**, ESLint). Пакетный менеджер — pnpm.
2. `.gitignore` (`.env*`, `node_modules`, `.next`), `.env.example` (пустые имена ключей), `README.md`.
3. Prettier + ESLint + `tsc --noEmit` в скриптах.
4. Первый коммит в `feat/scaffold` → PR → `main`. Подключить Vercel к репо.
5. GitHub Actions: lint + typecheck + build + test на PR.

**✅ Gate:** `pnpm dev` поднимается локально; Vercel preview-URL открывается; CI зелёный.

---

## Фаза 1 — Дизайн-фундамент

**Цель:** система до экранов. Вызвать дизайн-скилл, не верстать «на глаз».

1. **Токены** из [17-design-system](17-design-system.md): CSS-переменные (`:root` + `[data-theme=dark]`) — Aurora, нейтрали/поверхности, brand/action, статусы, радиусы, тени, motion, 4pt-отступы.
2. **Шрифты** локально через `next/font`: **Sora** (display/heading) + **Inter** (body), с latin + Cyrillic.
3. **Тема:** light по умолчанию + dark; `prefers-reduced-motion` фолбэки.
4. **Примитивы:** `Button` (`primary`/`ink`/`ghost`), `Heading`, `Text`, `Card`, `Chip`/`Badge`, `Input`/`TextArea`, `Sheet`/`Modal`, `AuroraHero`.
5. Зафиксировать в [CLAUDE.md](../CLAUDE.md): пути `tokens`/`components`, команды test/build.
6. _(Опц.)_ Storybook как витрина примитивов.

**✅ Gate:** примитивы рендерятся в обеих темах на 375/768/1280; grep по hex в компонентах — пусто; дизайн-линт чист.

---

## Фаза 2 — Данные (Supabase + Prisma)

**Цель:** схема БД из [12-technical-architecture](12-technical-architecture.md).

1. Проект Supabase (регион EU), `DATABASE_URL`/`DIRECT_URL` в env.
2. Prisma-модели: `users`, `preferences`, `wishes`, `experiences`, `weekly_stories`, `memories`, `interventions` (+ enums статусов/категорий из [PRD](04-product-prd.md) и [Life Balance Model](04-product-prd.md)).
3. Миграции; сиды: тестовый пользователь + курированные `experiences` для Белграда/Нови-Сада.
4. **RLS** и разделение чувствительных данных от продуктовой аналитики ([12 Privacy](12-technical-architecture.md)). Заложить экспорт/удаление профиля.

**✅ Gate:** миграция применяется; тестовый запрос через Prisma возвращает сид-данные; ключи не в git.

---

## Фаза 3 — Оболочка Mini App (auth + i18n)

**Цель:** авторизованный каркас Telegram Mini App.

1. Бот через @BotFather; Mini App указывает на Vercel-URL; `TELEGRAM_BOT_TOKEN` в env.
2. **Валидация `initData`** на сервере (HMAC по токену бота) → сессия пользователя. Пароли/токены агент не трогает.
3. i18n (`next-intl` или аналог): en/ru/es, словари, переключатель, дефолт по языку Telegram.
4. App-шелл: нижняя навигация (Неделя · Wishlist · Timeline · Профиль), геолокация с согласия.

**✅ Gate:** вход из Telegram создаёт/находит пользователя; интерфейс переключает 3 языка; сессия защищена.

---

## Фаза 4 — Онбординг ([Flow A](05-user-flows.md))

1. Экран-обещание (Aurora hero, копия из [14-brand](14-brand-and-copy.md)).
2. Категории интересов → свайп 15–20 идей → бюджет → время → соц-формат → город/радиус → уровень спонтанности/новизны.
3. Запись в `preferences`; онбординг < 5 минут; сразу первая полезная рекомендация.

**✅ Gate:** профиль сохраняется; e2e проходит онбординг до первой карточки; a11y таргеты/контраст ок.

---

## Фаза 5 — Wishlist ([Flow B](05-user-flows.md))

1. Добавление желания текстом/ссылкой (голос — позже); AI структурирует в `wish` (категория, бюджет, период) через Claude structured outputs.
2. Список, статусы («когда-нибудь»/«в этом месяце»/«скоро»), скрытие, приоритет.

**✅ Gate:** желание создаётся и структурируется; отображается корректно в 3 языках/2 темах.

---

## Фаза 6 — Weekly Selection + Experience Engine v0 ([Flow C](05-user-flows.md), [движок](06-experience-engine.md))

**Цель:** ядро продукта — 3 кандидата в неделю.

1. **Candidate generation:** wishlist + курированные `experiences` (concierge) + пара AI-сценариев.
2. **Scoring v0** (упрощённая формула из [06](06-experience-engine.md)): Relevance × Timing × Feasibility × Novelty − Repetition. Портфель: safe / timely / easy-win (+соц-опция позже).
3. **Explainability:** у каждой карточки строка «почему это подходит» (обязательна — [17 §10.5](17-design-system.md)).
4. `StoryCard`: идея, «почему», цена, длительность, расстояние, новизна, даты. Спонсорское — маркер.
5. Режим «выбери за меня» ([Flow H](05-user-flows.md)) — опц.

**✅ Gate:** в понедельник ([ADR-004](18-decisions-adr.md)) пользователь видит 3 карточки с объяснениями; выбор ≤ 60 сек; ≤ 5 карточек на экране.

---

## Фаза 7 — Commitment + Planning assist ([Flow C/PRD 5.5](04-product-prd.md))

1. Подтверждение: день, бюджет, формат компании, уровень поддержки, кому сообщить.
2. Базовый planning: погода (**Open-Meteo**), время, ссылка на билет/место (deep link), запасной вариант. Создаётся `weekly_story`.

**✅ Gate:** история недели фиксируется со статусом и погодой; изменение/отмена без штрафа.

---

## Фаза 8 — Companion Nudges + Rescue Mission ([Flow F](05-user-flows.md), [AI 07](07-ai-companion.md))

1. `interventions`: контекстные подсказки (не фиксированные напоминания), одно действие на сообщение, тон из [07](07-ai-companion.md)/[14](14-brand-and-copy.md).
2. Barrier prompt («что мешает?») → упростить / перенести / заменить / rescue.
3. Rescue mission: 2–3 меньшие альтернативы под ту же потребность.
4. Уровни сопровождения (в т.ч. «замолчать»).

**✅ Gate:** при риске срыва приходит полезный nudge; rescue возвращает альтернативы; ноль языка вины (проверка копии).

---

## Фаза 9 — Completion + Memory + Timeline ([Flow G](05-user-flows.md))

1. Check-in после события: «Сделано» → эмоция → фото/фраза (≤ 3 вопроса). Запись `memory`.
2. Timeline: истории по неделям, незавершённые желания без вины; баланс категорий — позже.
3. Обучение: один вопрос для улучшения рекомендаций.

**✅ Gate:** memory сохраняется с медиа; timeline показывает завершённые истории; completion flow e2e зелёный.

---

## Фаза 10 — Аналитика и guardrails ([11-analytics](11-analytics-and-kpis.md))

1. PostHog: воронка из 8 шагов (recommendation → … → next week returned), событие активации (48ч).
2. Guardrail-метрики: mute rate, uninstall after nudges, reported pressure, % недель отдыха.
3. Feature flags для experiment backlog. Маркетинг-счётчики — только на prod-хостнейме.

**✅ Gate:** события летят в PostHog из preview и prod раздельно; воронка собирается.

---

## Фаза 11 — Concierge-инструменты (внутренние)

**Цель:** MVP опирается на ручную курацию ([10](10-mvp-scope.md), [ADR-006](18-decisions-adr.md)) — особенно события Белград/Нови-Сад/Ереван.

1. Простой admin: добавление/проверка `experiences`, ручной поиск билетов/мест.
2. Шаблоны AI-сообщений; лог интервью пользователей после недели.

**✅ Gate:** куратор заводит событие, оно попадает в кандидаты пользователю.

---

## Фаза 12 — Go-live ([playbook Фазы 5–7](../CLAUDE.md))

1. Окружения: preview (staging, `noindex` + защита) и production; раздельные секреты.
2. Smoke-тест после деплоя (curl ключевых роутов = 200); шаг отката при падении.
3. _(Опц.)_ свой домен + HTTPS; иначе — URL Vercel.
4. Пилот: 50–200 пользователей в Белграде/Нови-Саде.

**✅ Gate:** prod открывается по HTTPS; smoke зелёный; онбординг→выбор→completion проходит на живом стенде.

---

## Порядок и зависимости

`0 → 1 → 2 → 3` — фундамент (строго последовательно).
Дальше продуктовые фазы: `4 → 5 → 6 → 7 → 8 → 9`. `10` (аналитика) и `11` (concierge) идут параллельно с 6–9. `12` — финал.

**Критично не делать раньше времени** ([roadmap](13-roadmap.md)): публичную ленту, matching с незнакомцами, маркетплейс, автопокупки, сложную life-analytics, нативное приложение.

## Критерии успеха пилота (8 недель, из [MVP](10-mvp-scope.md))

≥60% выбирают первую историю · ≥35% выполняют · ≥30% возврат на 6-й неделе · ≥40% «без Ryk не сделал бы» · NPS > 30.
