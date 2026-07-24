<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ryk — правила проекта

**Конституция проекта — [`CLAUDE.md`](CLAUDE.md).** Читай её первой: контекст
продукта, правила работы агента, Definition of Done, стек.

Ключевое, что нельзя нарушать:

- Ветка + PR, никогда не в `main` напрямую.
- Verify before done: тесты/сборка зелёные, живой результат показан.
- Дизайн-система строго: токены и примитивы из [`ryk_docs/17-design-system.md`](ryk_docs/17-design-system.md), без хардкод-hex.
- Секреты — только в env (Vercel/Supabase/`.env.local`), не в коде и не в чат. В репо — только `.env.example`.
- План разработки пофазно — [`ryk_docs/19-build-plan.md`](ryk_docs/19-build-plan.md).
