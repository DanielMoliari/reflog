# DevPulse

**Developer analytics that make sense**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.8-blue.svg)
![pnpm](https://img.shields.io/badge/pnpm-10-orange.svg)

## What is DevPulse?

DevPulse is a developer productivity dashboard that connects to your GitHub account and transforms raw activity data into meaningful insights. Think commit streaks, PR throughput, code review patterns, and contribution heatmaps — all in one place. It's like Strava, but for your engineering output.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/devpulse.git
cd devpulse

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
cp packages/api/.env.example packages/api/.env.local

# Start development servers (web on :3000, api on :3001)
pnpm dev
```

---

## Architecture

```
devpulse/
├── packages/
│   ├── web/        # Next.js 15 frontend (App Router)
│   └── api/        # NestJS backend (Fastify adapter)
├── tsconfig.base.json
├── eslint.config.mjs
└── .prettierrc
```

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Frontend  | Next.js 15, React 19, TypeScript          |
| Backend   | NestJS 11, Fastify, TypeScript            |
| Auth      | GitHub OAuth 2.0, JWT                     |
| Database  | PostgreSQL (Prisma ORM)                   |
| Cache     | Redis                                     |
| Monorepo  | pnpm workspaces                           |

---

## API

API documentation is available at `http://localhost:3001/api/docs` when running in development mode.

Base URL: `/api/v1`

---

## License

MIT © DevPulse Contributors
