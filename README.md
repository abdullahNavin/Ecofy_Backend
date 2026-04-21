# Ecofy Backend

Backend API for the Ecofy sustainability idea-sharing platform.

## Overview
Ecofy Backend powers the core business logic behind the Ecofy platform. It manages authentication, idea workflows, moderation, community engagement, premium idea purchases, and dashboard data for both members and admins.

The API is built with Express, TypeScript, Prisma, and PostgreSQL, with Stripe handling premium checkout flows and Better Auth supporting secure session-based authentication.

### Detailed Project Explanation
Ecofy is a comprehensive sustainability idea-sharing platform designed to foster innovation and collaboration in environmental solutions. The platform allows users to propose, discuss, and monetize ideas that address sustainability challenges, ranging from renewable energy solutions to waste reduction strategies and eco-friendly products.

#### Key Concepts and Workflows
- **User Roles**: The platform supports two primary user roles - `MEMBER` and `ADMIN`. Members can create, edit, and interact with ideas, while admins handle moderation and platform management.
- **Idea Lifecycle**: Ideas start as drafts, can be edited, submitted for review, approved or rejected by admins, and published. Premium ideas can be monetized through purchases.
- **Community Engagement**: Users can vote on ideas (upvote/downvote) and participate in threaded discussions via comments and replies.
- **Monetization**: Idea authors can mark their ideas as premium, set a price, and earn through Stripe-powered purchases. Buyers gain access to exclusive content.
- **Moderation**: Admins review submitted ideas, provide feedback on rejections, and maintain platform quality.
- **Categories**: Ideas are organized into categories for better discoverability.
- **Search and Discovery**: The platform includes search functionality to help users find relevant ideas.
- **Newsletter**: Users can subscribe to newsletters for updates.

#### Architecture Overview
The backend follows a modular architecture with feature-based modules:
- **Authentication Module**: Handles user registration, login, session management, and role-based access control using Better Auth.
- **Idea Module**: Manages CRUD operations for ideas, status transitions, and premium access control.
- **Comment Module**: Supports threaded comments with nested replies.
- **Vote Module**: Handles voting logic with unique constraints per user-idea pair.
- **Payment Module**: Integrates with Stripe for checkout sessions, webhooks, and purchase verification.
- **Admin Module**: Provides administrative endpoints for user management, idea moderation, and category administration.
- **Search Module**: Implements search functionality across ideas.
- **Newsletter Module**: Manages email subscriptions.

The application uses Express.js as the web framework, TypeScript for type safety, Prisma as the ORM for PostgreSQL database interactions, and Zod for request validation. Middleware handles authentication, error handling, and role-based permissions.

#### Database Schema Overview
The database is designed with the following key entities:
- **User**: Stores user information, roles, and relationships to ideas, comments, votes, and purchases.
- **Session**: Manages authentication sessions via Better Auth.
- **Category**: Organizes ideas into thematic groups.
- **Idea**: Core entity containing idea details, status, pricing, and engagement metrics.
- **Vote**: Tracks user votes on ideas with upvote/downvote types.
- **Comment**: Supports threaded discussions with parent-child relationships.
- **Purchase**: Records premium idea purchases with Stripe integration.
- **Newsletter**: Manages email subscriptions.

Relationships ensure data integrity, with cascading deletes and unique constraints where appropriate.

## Live URLs
- Local API server: `http://localhost:5000`
- API base URL: `http://localhost:5000/api/v1`
- Better Auth base URL: `http://localhost:5000/api/v1/auth/better-auth`

If you deploy the project, replace the local URLs above with your production domain.

## Core Features
- Session-based authentication with login, signup, logout, and current-user endpoints
- Role-aware access control for `MEMBER` and `ADMIN` users
- Idea lifecycle management:
  - create draft ideas
  - edit rejected or draft ideas
  - submit ideas for review
  - delete non-approved ideas
- Admin moderation workflow:
  - approve ideas
  - reject ideas with feedback
  - change idea status
  - remove ideas when necessary
- Category management for organizing sustainability ideas
- Community engagement with voting and threaded comments
- Premium idea purchase flow using Stripe Checkout
- Purchase verification and locked-content access control
- Member dashboard summary data and personal idea listing endpoints

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
  common/           shared middleware, helpers, and utilities
  lib/              reusable infrastructure such as Prisma client
  modules/          feature-based modules like auth, idea, payment, admin
  scripts/          utility scripts such as admin seeding
  server.ts         application entry point
prisma/
  schema.prisma     database schema
```

## Main API Areas
- `auth`
  - login, signup, logout, current user, profile updates
- `ideas`
  - public idea listing, details, create/update/delete, submit, member idea listing
- `comments`
  - idea comments and replies
- `votes`
  - cast and remove votes
- `payments`
  - Stripe checkout and verification
- `admin`
  - user management, moderation, category and idea administration

## API Documentation
The API endpoints are documented in the included Postman collection file: `Ecofy_Postman_Collection.json`. Import this file into Postman to explore and test the API endpoints interactively. The collection includes examples for all major API areas, authentication flows, and error handling scenarios.

## Environment Variables
Create a `.env` file in the backend root with values like the following:

```env
DATABASE_URL=your_postgresql_connection_string
BETTER_AUTH_SECRET=your_auth_secret
BETTER_AUTH_URL=http://localhost:5000/api/v1/auth/better-auth
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_CURRENCY=usd
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

## Getting Started
### 1. Clone the repository
```bash
git clone <your-repository-url>
cd Ecofy_server
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Configure the environment
Add the `.env` file shown above.

### 4. Generate Prisma client
```bash
pnpm run db:generate
```

### 5. Apply the database schema
```bash
pnpm run db:push
```

If you prefer migrations during development, you can also use:

```bash
pnpm run db:migrate
```

### 6. Seed the admin account
```bash
pnpm run seed:admin
```

### 7. Start the development server
```bash
pnpm run dev
```

The API will run at `http://localhost:5000`.

## Available Scripts
- `pnpm run dev`  
  Starts the backend in watch mode using `tsx`.

- `pnpm run build`  
  Compiles the TypeScript source into the `dist` output.

- `pnpm run start`  
  Runs the compiled production build from `dist/server.js`.

- `pnpm run db:generate`  
  Generates the Prisma client.

- `pnpm run db:migrate`  
  Runs Prisma development migrations.

- `pnpm run db:push`  
  Pushes the current Prisma schema to the database.

- `pnpm run db:studio`  
  Opens Prisma Studio for inspecting data.

- `pnpm run seed:admin`  
  Seeds the initial admin user.

## Development Notes
- The frontend is expected to run on `http://localhost:3000`.
- Authentication relies on cookies, so frontend and backend URLs should stay aligned with the configured environment variables.
- Premium idea access depends on successful Stripe checkout verification.
- Admin-only endpoints should be tested with an account seeded or promoted to the `ADMIN` role.

## Frontend Pairing
This backend is designed to work with the Ecofy Next.js frontend in the sibling client project:

- Frontend app: `http://localhost:3000`
- Backend API: `http://localhost:5000/api/v1`
- live url: `https://ecofy-backend-ij77.onrender.com`
- Frontend live url: `https://ecofy-pro.vercel.app/`

Run both applications together for full functionality.
