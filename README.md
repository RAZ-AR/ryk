# Ryk

> Персональный AI-компаньон по жизненному опыту. Помогает не откладывать жизнь
> и проживать **одну настоящую историю каждую неделю**.

**Every week deserves one story.**

## Документация

- **Конституция проекта:** [CLAUDE.md](CLAUDE.md) — правила, стек, Definition of Done.
- **Продукт и стратегия:** [ryk_docs/](ryk_docs/README.md).
- **Дизайн-система:** [ryk_docs/17-design-system.md](ryk_docs/17-design-system.md).
- **Решения (ADR):** [ryk_docs/18-decisions-adr.md](ryk_docs/18-decisions-adr.md).
- **План разработки:** [ryk_docs/19-build-plan.md](ryk_docs/19-build-plan.md).

## Стек

Next.js (TS strict) · CSS Modules + токены · Prisma · Supabase (Postgres, EU) · Telegram Mini App · Vercel · PostHog · Anthropic Claude API.

## Локальный запуск

```bash
pnpm install
cp .env.example .env.local   # заполнить значения (см. ryk_docs/18-decisions-adr.md)
pnpm dev
```

Открыть http://localhost:3000.

## Скрипты

| Команда | Что делает |
|---|---|
| `pnpm dev` | dev-сервер |
| `pnpm build` | production-сборка |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier (запись) |

## Правила

Ветка + PR (не в `main`). Секреты только в env, не в коде. Дизайн — из токенов и примитивов, без хардкода. Подробнее — [CLAUDE.md](CLAUDE.md).
