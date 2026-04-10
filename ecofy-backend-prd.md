# Ecofy — Backend PRD
**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL · BetterAuth · Stripe

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Models (Prisma Schema)](#3-database-models-prisma-schema)
4. [Authentication (BetterAuth)](#4-authentication-betterauth)
5. [API Reference](#5-api-reference)
6. [Stripe Integration](#6-stripe-integration)
7. [Error Handling & Validation](#7-error-handling--validation)
8. [Folder Structure](#8-folder-structure)
9. [Environment Variables](#9-environment-variables)

---

## 1. Project Overview

Ecofy is a community sustainability portal where members submit, vote on, and discuss eco-friendly ideas. The backend exposes a RESTful JSON API consumed by the Next.js frontend.

**Core responsibilities:**
- Auth & session management via BetterAuth (JWT)
- CRUD for Users, Ideas, Comments, Votes, Categories
- Admin moderation workflows (approve / reject with feedback)
- Paid-idea access gating via Stripe Checkout
- Nested comment threads
- Pagination, sorting, and filtering for idea listings

---

## 2. Architecture Overview

```
Client (Next.js)
      │  HTTPS / JSON
      ▼
Express Router  ──►  Middleware (auth guard, role guard, validate)
      │
      ├──► Controllers  ──►  Services  ──►  Prisma ORM  ──►  PostgreSQL
      │
      └──► Stripe Webhook Handler
```

**Key principles:**
- Controllers are thin — they only parse request/response
- Services hold all business logic
- Prisma is the single data-access layer
- BetterAuth middleware validates JWTs on protected routes
- All endpoints return `{ success, data?, error?, meta? }` envelope

---

## 3. Database Models (Prisma Schema)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum Role {
  MEMBER
  ADMIN
}

enum IdeaStatus {
  DRAFT
  UNDER_REVIEW
  APPROVED
  REJECTED
}

enum VoteType {
  UPVOTE
  DOWNVOTE
}

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String
  role          Role      @default(MEMBER)
  isActive      Boolean   @default(true)
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  ideas         Idea[]
  comments      Comment[]
  votes         Vote[]
  purchases     Purchase[]
  sessions      Session[]
  newsletter    Newsletter?

  @@map("users")
}

// BetterAuth session table
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// ─────────────────────────────────────────────
// CATEGORY
// ─────────────────────────────────────────────

model Category {
  id        String   @id @default(cuid())
  name      String   @unique   // e.g. "Energy", "Waste", "Transportation"
  slug      String   @unique
  createdAt DateTime @default(now())

  ideas     Idea[]

  @@map("categories")
}

// ─────────────────────────────────────────────
// IDEA
// ─────────────────────────────────────────────

model Idea {
  id               String     @id @default(cuid())
  title            String
  slug             String     @unique
  problemStatement String     @db.Text
  proposedSolution String     @db.Text
  description      String     @db.Text
  images           String[]   // Array of image URLs (Cloudinary / S3)
  isPaid           Boolean    @default(false)
  price            Decimal?   @db.Decimal(10, 2)   // null if free
  status           IdeaStatus @default(DRAFT)
  rejectionFeedback String?   @db.Text
  upvoteCount      Int        @default(0)          // Denormalized for fast sorting
  downvoteCount    Int        @default(0)
  commentCount     Int        @default(0)
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  // FK
  authorId         String
  categoryId       String

  // Relations
  author           User       @relation(fields: [authorId], references: [id], onDelete: Cascade)
  category         Category   @relation(fields: [categoryId], references: [id])
  votes            Vote[]
  comments         Comment[]
  purchases        Purchase[]

  @@index([status])
  @@index([categoryId])
  @@index([authorId])
  @@index([upvoteCount])
  @@map("ideas")
}

// ─────────────────────────────────────────────
// VOTE
// ─────────────────────────────────────────────

model Vote {
  id        String   @id @default(cuid())
  type      VoteType
  createdAt DateTime @default(now())

  userId    String
  ideaId    String

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)

  @@unique([userId, ideaId])   // One vote per member per idea
  @@map("votes")
}

// ─────────────────────────────────────────────
// COMMENT  (nested / threaded)
// ─────────────────────────────────────────────

model Comment {
  id        String    @id @default(cuid())
  content   String    @db.Text
  isDeleted Boolean   @default(false)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  authorId  String
  ideaId    String
  parentId  String?   // null = top-level comment

  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  idea      Idea      @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")

  @@index([ideaId])
  @@index([parentId])
  @@map("comments")
}

// ─────────────────────────────────────────────
// PURCHASE  (paid ideas)
// ─────────────────────────────────────────────

model Purchase {
  id                String   @id @default(cuid())
  amount            Decimal  @db.Decimal(10, 2)
  currency          String   @default("usd")
  stripeSessionId   String   @unique
  stripePaymentIntent String?
  status            String   // "pending" | "completed" | "refunded"
  createdAt         DateTime @default(now())

  userId            String
  ideaId            String

  user              User     @relation(fields: [userId], references: [id])
  idea              Idea     @relation(fields: [ideaId], references: [id])

  @@unique([userId, ideaId])   // A member buys a paid idea once
  @@map("purchases")
}

// ─────────────────────────────────────────────
// NEWSLETTER
// ─────────────────────────────────────────────

model Newsletter {
  id        String   @id @default(cuid())
  email     String   @unique
  userId    String?  @unique
  createdAt DateTime @default(now())

  user      User?    @relation(fields: [userId], references: [id])

  @@map("newsletter_subscribers")
}
```

---

## 4. Authentication (BetterAuth)

BetterAuth handles email/password signup, session creation, JWT issuance, and refresh. Integrate it as Express middleware.

### Setup (conceptual)

```typescript
// src/auth/betterAuth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge:  60 * 60 * 24,      // refresh if older than 1 day
  },
  secret: process.env.BETTER_AUTH_SECRET!,
});
```

### Middleware

```typescript
// src/middleware/auth.middleware.ts
export const requireAuth = async (req, res, next) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
  req.user = session.user;
  next();
};

export const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ success: false, error: "Forbidden" });
    next();
  });
};
```

---

## 5. API Reference

**Base URL:** `/api/v1`  
**Auth header:** `Authorization: Bearer <token>` (or cookie-based via BetterAuth)

All responses follow the envelope:
```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "totalPages": 5, "total": 48 }
}
```

---

### 5.1 Auth  `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | Public | Register new member |
| POST | `/login` | Public | Login, receive JWT |
| POST | `/logout` | Member | Invalidate session |
| GET | `/me` | Member | Current user profile |
| PATCH | `/me` | Member | Update name / avatar |
| PATCH | `/me/password` | Member | Change password |

**POST /signup — Request**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Str0ng!Pass"
}
```

**POST /login — Response**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "user": { "id": "...", "name": "Jane Doe", "role": "MEMBER" }
  }
}
```

---

### 5.2 Categories  `/api/v1/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List all categories |
| POST | `/` | Admin | Create category |
| PATCH | `/:id` | Admin | Update category |
| DELETE | `/:id` | Admin | Delete category |

**POST /categories — Request**
```json
{ "name": "Energy" }
```

---

### 5.3 Ideas  `/api/v1/ideas`

#### Public / Member Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List approved ideas (paginated, sortable, filterable) |
| GET | `/:id` | Public* | Get idea detail (*paid ideas require auth + purchase) |
| POST | `/` | Member | Create idea (defaults to DRAFT) |
| PATCH | `/:id` | Member (owner) | Edit idea (only DRAFT or REJECTED) |
| DELETE | `/:id` | Member (owner) | Delete idea (only if not APPROVED) |
| PATCH | `/:id/submit` | Member (owner) | Move DRAFT → UNDER_REVIEW |

#### Query Params for `GET /ideas`

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number (default 1) |
| `limit` | number | `10` | Items per page (max 20) |
| `sort` | string | `top_voted` | `recent` \| `top_voted` \| `most_commented` |
| `category` | string | `energy` | Category slug |
| `paid` | boolean | `false` | Filter by paid status |
| `minVotes` | number | `5` | Minimum upvote count |
| `author` | string | `cuid` | Filter by author ID |
| `q` | string | `solar` | Full-text search (title, description) |

**POST /ideas — Request**
```json
{
  "title": "Community Solar Panels",
  "categoryId": "cat_abc123",
  "problemStatement": "High energy costs in rural areas.",
  "proposedSolution": "Install shared solar arrays.",
  "description": "Full detailed write-up...",
  "images": ["https://cdn.ecofy.io/img1.jpg"],
  "isPaid": true,
  "price": 4.99
}
```

**GET /ideas — Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "idea_1",
      "title": "Community Solar Panels",
      "slug": "community-solar-panels",
      "category": { "id": "cat_1", "name": "Energy" },
      "author": { "id": "user_1", "name": "Jane Doe" },
      "isPaid": false,
      "upvoteCount": 42,
      "downvoteCount": 3,
      "commentCount": 14,
      "status": "APPROVED",
      "images": ["https://..."],
      "createdAt": "2025-06-01T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 85, "totalPages": 9 }
}
```

---

### 5.4 Admin — Ideas  `/api/v1/admin/ideas`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | List all ideas with any status |
| PATCH | `/:id/approve` | Admin | Approve idea → APPROVED |
| PATCH | `/:id/reject` | Admin | Reject idea with feedback |
| DELETE | `/:id` | Admin | Force-delete any idea |

**PATCH /admin/ideas/:id/reject — Request**
```json
{ "feedback": "Lacks a feasibility study. Please provide cost estimates." }
```

---

### 5.5 Admin — Users  `/api/v1/admin/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | List all members (paginated) |
| PATCH | `/:id/activate` | Admin | Activate member |
| PATCH | `/:id/deactivate` | Admin | Deactivate member |
| PATCH | `/:id/role` | Admin | Change member role |

**PATCH /admin/users/:id/role — Request**
```json
{ "role": "ADMIN" }
```

---

### 5.6 Votes  `/api/v1/ideas/:id/votes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Member | Cast or change vote |
| DELETE | `/` | Member | Remove own vote |

**POST /ideas/:id/votes — Request**
```json
{ "type": "UPVOTE" }
```

Calling POST again with a different `type` switches the vote. `upvoteCount` / `downvoteCount` on the idea are updated in the same transaction.

---

### 5.7 Comments  `/api/v1/ideas/:id/comments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List threaded comments for idea |
| POST | `/` | Member | Post top-level comment |
| POST | `/:commentId/replies` | Member | Reply to a comment |
| DELETE | `/:commentId` | Member (owner) / Admin | Delete comment |

**POST /ideas/:id/comments — Request**
```json
{ "content": "Great idea! We tried this in our village." }
```

**POST /ideas/:id/comments/:commentId/replies — Request**
```json
{ "content": "Which village? I'd love to hear more." }
```

**GET /ideas/:id/comments — Response** (tree structure)
```json
{
  "success": true,
  "data": [
    {
      "id": "cmt_1",
      "content": "Great idea!",
      "author": { "id": "user_1", "name": "Jane" },
      "createdAt": "2025-06-01T12:00:00Z",
      "replies": [
        {
          "id": "cmt_2",
          "content": "Which village?",
          "author": { "id": "user_2", "name": "Bob" },
          "replies": []
        }
      ]
    }
  ]
}
```

---

### 5.8 Payments  `/api/v1/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/checkout` | Member | Create Stripe Checkout session |
| GET | `/verify/:sessionId` | Member | Verify purchase after redirect |
| POST | `/webhook` | Internal | Stripe webhook handler |
| GET | `/purchases` | Member | List own purchases |

**POST /payments/checkout — Request**
```json
{ "ideaId": "idea_abc123" }
```

**POST /payments/checkout — Response**
```json
{
  "success": true,
  "data": { "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_..." }
}
```

**Webhook Events handled:**
- `checkout.session.completed` → mark Purchase as `completed`, grant access
- `charge.refunded` → mark Purchase as `refunded`, revoke access

---

### 5.9 Newsletter  `/api/v1/newsletter`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/subscribe` | Public | Subscribe email |
| DELETE | `/unsubscribe` | Public | Unsubscribe by token |

---

### 5.10 Search  `/api/v1/search`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | Global search across approved ideas |

**Query Params:** `q` (required), `category`, `page`, `limit`

Implemented using PostgreSQL `tsvector` / `to_tsquery` full-text search via Prisma raw query.

---

## 6. Stripe Integration

### Flow

```
Member clicks "Buy Idea"
       │
POST /api/v1/payments/checkout
       │  Creates Stripe Checkout Session
       │  Creates Purchase record (status: pending)
       │
Redirect → Stripe hosted checkout page
       │
User completes payment
       │
Stripe sends webhook → POST /api/v1/payments/webhook
       │  Validates Stripe signature
       │  Updates Purchase status → "completed"
       │
User redirected to /ideas/:id?session_id=...
       │
GET /api/v1/payments/verify/:sessionId
       │  Confirms access granted
       ▼
Idea content unlocked
```

### Key implementation notes

- Use `stripe.webhooks.constructEvent()` with raw body parser on the webhook route only
- `stripe.checkout.sessions.create()` with `mode: "payment"`, `success_url`, `cancel_url`
- Store `stripeSessionId` on Purchase immediately so webhook can look it up
- Access check: query `Purchase` where `userId + ideaId + status = completed`

---

## 7. Error Handling & Validation

### Global Error Handler

```typescript
// src/middleware/errorHandler.ts
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});
```

### Standard Error Codes

| HTTP | Scenario |
|------|----------|
| 400 | Validation failure |
| 401 | Not authenticated |
| 403 | Insufficient role / unpurchased paid idea |
| 404 | Resource not found |
| 409 | Conflict (duplicate vote, duplicate purchase) |
| 422 | Business rule violation |
| 500 | Unexpected server error |

### Validation

Use **Zod** schemas in a `validators/` layer. Each route attaches a `validate(schema)` middleware that parses `req.body` / `req.query` before the controller runs.

---

## 8. Folder Structure

```
ecofy-backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── src/
│   ├── modules/                # 🔥 Feature-based modules
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.validator.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── idea/
│   │   │   ├── idea.controller.ts
│   │   │   ├── idea.service.ts
│   │   │   ├── idea.routes.ts
│   │   │   ├── idea.validator.ts
│   │   │   └── idea.types.ts
│   │   │
│   │   ├── vote/
│   │   │   ├── vote.controller.ts
│   │   │   ├── vote.service.ts
│   │   │   ├── vote.routes.ts
│   │   │   └── vote.types.ts
│   │   │
│   │   ├── comment/
│   │   │   ├── comment.controller.ts
│   │   │   ├── comment.service.ts
│   │   │   ├── comment.routes.ts
│   │   │   └── comment.types.ts
│   │   │
│   │   ├── payment/
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── payment.routes.ts
│   │   │   ├── payment.validator.ts
│   │   │   └── stripe.service.ts   # 🔥 payment-specific logic
│   │   │
│   │   ├── admin/
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── admin.types.ts
│   │   │
│   │   └── newsletter/
│   │       ├── newsletter.controller.ts
│   │       ├── newsletter.service.ts
│   │       ├── newsletter.routes.ts
│   │       └── newsletter.validator.ts
│   │
│   ├── common/                 # 🔁 Shared reusable stuff
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   └── errorHandler.ts
│   │   │
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   │
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   │
│   │   └── constants/
│   │       └── roles.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   └── stripe.ts
│   │
│   ├── lib/
│   │   └── prisma.ts
│   │
│   ├── routes/                 # 🔗 Central route loader
│   │   └── index.ts
│   │
│   └── app.ts
│
├── .env
├── tsconfig.json
└── package.json
```

---

## 9. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecofy

# BetterAuth
BETTER_AUTH_SECRET=super_secret_key_here
BETTER_AUTH_URL=http://localhost:4000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd

# App
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Storage (for idea images)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```
