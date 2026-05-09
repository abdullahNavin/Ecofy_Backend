# Ecofy Backend

## Overview

Ecofy Backend is an Express 5 and Prisma API for the Ecofy sustainability idea platform. It manages authentication, idea workflows, moderation, payments, notifications, creator analytics, AI-assisted drafting, semantic search, and personalized recommendations.

## Current Feature Set

### Core Platform

- Session-based auth with member and admin roles
- Draft, submit, approve, reject, and delete idea workflows
- Category management
- Voting and threaded comments
- Premium idea purchases with Stripe
- Purchase verification and locked-content access control

### Dashboard and Operations

- Member dashboard summary
- Creator analytics for views, engagement, purchases, and revenue
- Admin overview metrics
- Moderation filters and pagination
- User management
- Moderation audit logs
- In-app notification APIs

### AI and Discovery

- AI Idea Assistant endpoint for improving idea drafts
- Gemini for text generation
- OpenAI for embeddings
- Stored embeddings for approved ideas
- Semantic search over approved ideas
- Personalized recommendation endpoint based on user interactions

## Tech Stack

- Node.js
- Express 5
- TypeScript
- Prisma ORM
- PostgreSQL
- Better Auth
- Stripe
- Zod
- TSX

## Project Structure

```txt
src/
  auth/                    auth setup
  common/                  middleware, helpers, shared types
  config/                  env and provider config
  lib/                     prisma client
  modules/
    admin/                 moderation, users, overview, audit logs
    ai/                    Gemini text generation and embedding orchestration
    analytics/             creator analytics and interaction events
    auth/                  login, signup, profile
    category/              category CRUD
    comment/               comments and replies
    idea/                  idea CRUD and lifecycle
    newsletter/            newsletter subscriptions
    notification/          in-app notifications
    payment/               Stripe checkout, webhook, verification
    search/                semantic search and recommendations
    vote/                  votes
  routes/                  route registration
  scripts/                 admin seeding
  app.ts                   Express app
  server.ts                server bootstrap
prisma/
  schema.prisma            database schema
```

## Main API Areas

- `auth`
  - login, signup, logout, current user, dashboard summary, profile updates
- `ideas`
  - public listing, details, create, update, submit, delete, my ideas
- `comments`
  - threaded comments and replies
- `votes`
  - cast and remove votes
- `payments`
  - checkout, verification, purchases, webhook
- `admin`
  - overview, moderation queue, audit logs, users, categories
- `notifications`
  - list, mark read, mark all read
- `analytics`
  - creator analytics
- `search`
  - semantic search and personalized recommendations
- `ai`
  - idea assistant

## Environment Variables

Create `C:\projects\Ecofy_server\.env`:

```env
DATABASE_URL=your_postgresql_connection_string
BETTER_AUTH_SECRET=your_auth_secret
BETTER_AUTH_URL=http://localhost:5000/api/v1/auth/better-auth

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_CURRENCY=usd

CLIENT_URL=http://localhost:3000
PORT=5000
NODE_ENV=development

GEMINI_API_KEY=your_gemini_api_key
GEMINI_TEXT_MODEL=gemini-2.5-flash

OPENAI_API_KEY=your_openai_api_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL-compatible database

### Install

```bash
pnpm install
```

### Generate Prisma Client

```bash
pnpm run db:generate
```

### Apply Schema

```bash
pnpm run db:push
```

If you prefer migrations:

```bash
pnpm run db:migrate
```

### Seed Admin

```bash
pnpm run seed:admin
```

### Run

```bash
pnpm run dev
```

The API runs at `http://localhost:5000`.

## Scripts

- `pnpm run dev` starts the backend in watch mode
- `pnpm run build` compiles TypeScript to `dist`
- `pnpm run start` starts the compiled server
- `pnpm run db:generate` regenerates the Prisma client
- `pnpm run db:migrate` runs Prisma dev migrations
- `pnpm run db:push` pushes the current schema
- `pnpm run db:studio` opens Prisma Studio
- `pnpm run seed:admin` seeds the initial admin account

## Integration Notes

- The frontend is expected at `http://localhost:3000`.
- Authentication relies on cookies, so local frontend and backend URLs must stay aligned.
- Stripe webhook handling is mounted before global JSON parsing.
- AI text generation uses Gemini.
- Embeddings, semantic search, and recommendations use OpenAI embeddings.
- After changing AI environment variables, restart the backend process so the new values are loaded.
