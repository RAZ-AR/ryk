# Technical Architecture

## Цели архитектуры

- быстро запустить MVP;
- безопасно хранить персональные данные;
- поддерживать AI-рекомендации;
- интегрировать внешние источники событий;
- сохранять объяснимость решений;
- масштабировать локальные рынки независимо.

## Компоненты

### Client

- Telegram Mini App или PWA;
- onboarding UI;
- weekly cards;
- wishlist;
- companion chat;
- memory timeline.

### Backend API

- authentication;
- profile service;
- wishlist service;
- weekly story service;
- memory service;
- notification service;
- partner link tracking.

### Recommendation Platform

- candidate ingestion;
- normalization;
- eligibility filters;
- scoring;
- diversification;
- explanation generation;
- feedback loop.

### AI Orchestrator

- prompt and policy layer;
- context assembly;
- tool calling;
- conversation state;
- safety checks;
- memory extraction;
- cost controls.

### Data Sources

- event providers;
- places APIs;
- weather;
- maps and routing;
- ticketing and booking partners;
- user calendars — только по согласию;
- social invites.

## Data Model

### users

`id, locale, city, timezone, onboarding_state, notification_preferences`

### preferences

`user_id, category, entity, sentiment, confidence, source`

### wishes

`id, user_id, text, category, budget, season, social_mode, status`

### experiences

`id, source, title, description, category, location, start_time, price, metadata`

### weekly_stories

`id, user_id, experience_id, week_start, status, commitment, barrier_state`

### memories

`id, weekly_story_id, rating, emotion, note, media, completed_at`

### interventions

`id, user_id, weekly_story_id, type, reason, content, sent_at, outcome`

## Privacy

- Минимизировать сбор геолокации.
- Разделять чувствительные данные и продуктовую аналитику.
- Шифровать персональные данные.
- Давать пользователю контроль над AI memory.
- Не продавать персональный профиль рекламодателям.
- Поддерживать экспорт и удаление данных.

## AI Cost Control

- шаблоны для простых nudges;
- embeddings для similarity;
- smaller models для классификации;
- caching внешних данных;
- batch generation weekly candidates;
- большие модели только для сложной персонализации.

## MVP Stack — пример

- Frontend: Next.js/PWA или Telegram Mini App.
- Backend: TypeScript/NestJS либо Python/FastAPI.
- Database: PostgreSQL.
- Queue: managed queue or Redis.
- Analytics: PostHog/Amplitude.
- Notifications: Telegram push / email / mobile push later.
- AI: tool-using LLM with structured outputs.
- Hosting: managed cloud platform.
