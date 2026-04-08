# JamiX (jamix.ai.kz)

AI-агентство — сайт с AI-квалификатором лидов.

## Stack
- Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, Framer Motion
- Prisma 7 + Neon PostgreSQL (PrismaNeon adapter)
- AI: OpenRouter (openai SDK), model `anthropic/claude-sonnet-4`
- Telegram notifications via bot API

## Commands
```bash
npm run dev        # Dev server
npm run build      # prisma generate + next build
npm run db:push    # Push schema to Neon
npm run db:seed    # Create admin user
```

## Architecture
- `src/app/` — Next.js App Router (landing, dashboard, API routes)
- `src/components/` — UI (chat widget, sections, dashboard, shadcn/ui)
- `src/lib/` — Business logic (openrouter, prisma, system-prompt, auth, telegram, lead-extractor)
- `src/hooks/` — Client hooks (use-live-chat SSE streaming)
- `src/generated/prisma/` — Generated Prisma client (**committed to repo**)
- `prisma/schema.prisma` — DB schema (ChatSession, AdminUser, AdminSession)
- Path alias: `@/*` → `./src/*`

## Key Features
- **AI Chat Widget** — плавающая кнопка, SSE streaming, quick replies, авто-открытие
- **Lead Qualifier** — AI извлекает данные лида из разговора (lead_data JSON block)
- **Dashboard** — `/dashboard` (auth: cookie-based, single admin user)
- **Telegram** — уведомление Нариману при новом лиде

## Key Rules
- **AI model**: менять только в `src/lib/openrouter.ts`
- **System prompt**: `src/lib/system-prompt.ts` — тут вся логика квалификации
- **Lead extraction**: AI добавляет ```lead_data``` блок, сервер парсит и стрипит перед отправкой клиенту
- **Prisma client**: generated в `src/generated/prisma` (закоммичен)
- **prisma.config.ts**: загружает `.env.local`

## Env vars
- DATABASE_URL, OPENROUTER_API_KEY
- ADMIN_USERNAME, ADMIN_PASSWORD_HASH (for seed)
- TELEGRAM_BOT_TOKEN, NARIMAN_TELEGRAM_CHAT_ID (optional)
- NEXT_PUBLIC_SITE_URL
