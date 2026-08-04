# Ryk — Product Documentation

> **Рабочее определение:** персональный AI-компаньон, который помогает человеку не откладывать жизнь и проживать хотя бы одно настоящее впечатление каждую неделю.

## Суть продукта

Ryk не пытается сделать человека более продуктивным. Он помогает человеку жить более насыщенно, замечать возможности вокруг себя и превращать желания в реальные воспоминания.

Основной ритуал продукта:

1. Понять текущее состояние и контекст пользователя.
2. Предложить несколько подходящих впечатлений.
3. Помочь выбрать одну «историю недели».
4. Убрать практические препятствия.
5. Мягко сопровождать до выполнения.
6. Сохранить воспоминание и обучиться на результате.

## Ключевое обещание

**Every week deserves one story.**

Альтернативные формулировки:

- Live more. Miss less.
- Don’t let life pass by.
- Create memories, not tasks.
- Живи жизнь, а не откладывай её.

## Карта документации

| Документ | Назначение |
|---|---|
| [01-vision-and-manifesto.md](01-vision-and-manifesto.md) | Видение, миссия и философия |
| [02-product-strategy.md](02-product-strategy.md) | Стратегия, рынок и позиционирование |
| [03-personas-and-jtbd.md](03-personas-and-jtbd.md) | Персоны и Jobs-to-be-Done |
| [04-product-prd.md](04-product-prd.md) | Полный PRD продукта |
| [05-user-flows.md](05-user-flows.md) | Пользовательские сценарии и флоу |
| [06-experience-engine.md](06-experience-engine.md) | Движок подбора впечатлений |
| [07-ai-companion.md](07-ai-companion.md) | Поведение AI-компаньона |
| [08-social-and-accountability.md](08-social-and-accountability.md) | Социальность и мягкая ответственность |
| [09-monetization.md](09-monetization.md) | Модель монетизации |
| [10-mvp-scope.md](10-mvp-scope.md) | MVP и критерии запуска |
| [11-analytics-and-kpis.md](11-analytics-and-kpis.md) | Метрики и аналитика |
| [12-technical-architecture.md](12-technical-architecture.md) | Техническая архитектура |
| [13-roadmap.md](13-roadmap.md) | Дорожная карта |
| [14-brand-and-copy.md](14-brand-and-copy.md) | Бренд, тон и тексты интерфейса |
| [15-investor-pitch.md](15-investor-pitch.md) | Инвесторский one-pager |
| [16-risks-and-guardrails.md](16-risks-and-guardrails.md) | Риски, этика и ограничения |
| [17-design-system.md](17-design-system.md) | Дизайн-система: токены, типографика, motion, banned patterns |
| [18-decisions-adr.md](18-decisions-adr.md) | Решения по архитектуре (ADR) |
| [19-build-plan.md](19-build-plan.md) | План разработки MVP (пофазно, для Claude Code) |
| [20-interview-guide.md](20-interview-guide.md) | Разговор с пользователем после недели (гайд куратора) |

> Правила работы агента и «конституция» проекта — в [`../CLAUDE.md`](../CLAUDE.md) (корень репозитория).

## Карта системы одной страницей

[`public/architecture.html`](../public/architecture.html) — вся архитектура на одном
развороте: два дерева (система от корня до листа и дерево решения крона), контекст,
слои, контуры доступа, движок, данные, действия, роуты, инварианты.

Собрана по коду, а не по докам: [12-technical-architecture.md](12-technical-architecture.md)
описывает, как задумано, эта страница — как сделано. Расходятся — значит, устарела
страница, и правим её.

Открывается по адресу `/architecture` на деплое или файлом прямо из репозитория.
Индексации нет: `app/robots.ts` закрывает домен целиком.

## Рабочее название

**Ryk** — утверждённое рабочее название продукта. В публичной коммуникации бренд должен всегда писаться одинаково: **Ryk**.
