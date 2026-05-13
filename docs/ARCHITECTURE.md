# DevPulse — Architecture

## Overview

Monorepo (`pnpm workspaces`) with two packages:

| Package | Tech | Port |
|---|---|---|
| `packages/api` | NestJS 11 + Fastify | 17642 |
| `packages/web` | Next.js 15 App Router | 38929 |

The API follows **DDD + Hexagonal Architecture** (ports & adapters). The frontend is a pure client-side SPA for authenticated routes, with SSR only for the two public-facing pages (`/u/[username]`, `/r/[owner]/[repo]`).

---

## API: Bounded Contexts

```
packages/api/src/modules/
├── identity/       — User, GitHub OAuth, JWT, public profile management
├── analytics/      — Repos, metrics, streaks, tech graph, insights, sync pipeline
├── notifications/  — Weekly digest email (Resend), streak alerts
├── billing/        — Stripe checkout, portal, webhook handling
└── webhooks/       — GitHub webhook ingestion (schema + processor wired; registration not implemented)
```

Each module follows the same internal layout:

```
<module>/
├── <module>.module.ts
├── application/
│   ├── services/          — orchestration, caching, business logic
│   └── jobs/              — BullMQ processors
├── domain/
│   └── services/          — pure TypeScript, no framework deps
├── graphql/
│   ├── resolvers/         — NestJS @Resolver classes
│   └── types/             — @ObjectType / @InputType / enums
├── infrastructure/
│   ├── persistence/       — Prisma repository implementations
│   ├── github/            — Octokit adapter
│   └── http/              — REST controllers (auth, card image, Stripe webhook)
└── ports/                 — TypeScript interfaces (IGitHubPort, IMetricsRepository, …)
```

Domain services depend only on port interfaces injected via NestJS DI. They never import adapters or infrastructure directly.

---

## Key Services

### AnalyticsService
Central orchestrator for all analytics. All expensive operations are Redis-cached via `getOrSet` helper.

- `getDashboardMetrics(userId, from, to)` — daily metrics aggregated across all tracked repos; 5m TTL
- `getTechGraph(userId)` — repo × language constellation data; 1h TTL
- `getLanguageHistory(userId)` — year-over-year language adoption (streamgraph-ready `{ years, series }`); 1h TTL
- `getHourlyActivity(userId)` — real UTC hour buckets from GitHub commit history (up to 20 repos); 1h TTL; cold path 1–3 min
- `getInsights(userId)` — burnout signal (14-day window) + tech graduation detection; derived from stored metrics
- `getRepositoryDetail(userId, repoId)` — health score, PR timeline, file hotspots, ecosystem connections, code ownership, curiosities; 10m TTL
- `getPersonalRecords(userId)` — compare today's commits/additions/netLines against all-time daily best
- `triggerSync(userId, repoId)` — enqueues BullMQ job, deduped by job ID `sync-{repoId}`
- `scheduledSync()` — per-user cron; reads `autoSyncEnabled` + `autoSyncIntervalHours` (1/6/24h)
- `importFromGitHub(userId)` — sorts by `pushedAt` desc, tracks up to plan cap, returns `{ imported, tracked }`

### SyncRepositoryProcessor (BullMQ, concurrency=5)
Ingests one repository's history from GitHub into `DailyMetrics` rows.

1. Sets `syncState = SYNCING`
2. Fetches commits, PRs, reviews from `IGitHubPort` incrementally (since `lastSyncedAt − 1 day`)
3. Aggregates into per-day buckets (`commits`, `additions`, `deletions`, `prsOpened`, `prsMerged`, `reviewsDone`)
4. `batchUpsertMetrics` — upsert on composite unique key `(userId, repoId, date)`
5. Sets `syncState = IDLE`, stamps `lastSyncedAt`, recalculates streak, invalidates Redis dashboard cache

### PublicProfileService
Builds and caches the anonymous-readable public profile for `/u/[username]`.

- Checks `user.publicProfile` opt-in flag; returns `null` if `false` (profiles are private by default)
- Assembles: top 5 languages from tech graph, 365-day heatmap, all-time commit total, streak (if `publicShowStreak`), tracked public repos (if `publicShowRepos`), rank pills (gated on `userCount ≥ 10`)
- Cached at `public-profile:{username}`, 5m TTL
- **Redis trap:** dates come back as JSON strings; coerce with `new Date(val)` before GraphQL serialization

### BillingService
Stripe integration via `StripeAdapter` (lazy init — boots without keys, returns graceful error when unconfigured).

- `createCheckoutSession(userId, priceId)` — creates Stripe Checkout session
- `createPortalSession(userId)` — creates Stripe Customer Portal session
- Webhook handler at `/api/v1/stripe/webhook` — handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- After `checkout.session.completed` → updates `plan`, `subscriptionStatus`, `currentPeriodEnd` on User → auto-imports all repos for PRO upgrade

### StreakService
Recalculates streak from raw `DailyMetrics` after every sync.

- Pure domain logic in `StreakCalculator` (`analytics/domain/services/`)
- Upserts `Streak` row, triggers Resend streak alert email when at-risk threshold crossed

### GitHubLookupService
Anonymous GitHub API fallback for `searchProfile` and `searchRepo`.

- Used when queried username is not in DevPulse
- Returns top repos, languages, bio, follower count from public GitHub API
- No auth token; subject to 60 req/hour anonymous rate limit

---

## Ports (interfaces)

### IGitHubPort (`analytics/ports/github.port.ts`)
```typescript
getAuthenticatedUser(token: string): Promise<GitHubUserDto>
getUserRepositories(token: string): Promise<GitHubRepoDto[]>        // includes pushed_at
getCommitActivity(token, owner, repo, since): Promise<CommitActivityDto[]>
getPullRequests(token, owner, repo, since): Promise<PullRequestDto[]>
getReviews(token, owner, repo, since): Promise<ReviewDto[]>
getRepositoryInsights(token, owner, repo): Promise<RepoInsightsDto>
getRepositoryLanguages(token, owner, repo): Promise<Record<string, number>>
getRepositoryFileTree(token, owner, repo): Promise<string[]>
getDependencyManifest(token, owner, repo): Promise<string | null>
getCommitHours(token, owner, repo): Promise<number[]>               // 24-element array
```

### IMetricsRepository (`analytics/ports/metrics.repository.port.ts`)
```typescript
findRepositoriesByUser(userId, trackedOnly?): Promise<Repository[]>
findRepositoryById(repoId): Promise<Repository | null>
upsertRepository(data): Promise<Repository>
updateRepositorySyncState(repoId, state, pushedAt?, lastSyncedAt?): Promise<void>
getDailyMetrics(userId, from, to, repoId?): Promise<DailyMetrics[]>
batchUpsertMetrics(metrics[]): Promise<void>
getStreak(userId): Promise<Streak | null>
upsertStreak(userId, data): Promise<Streak>
```

### IUserRepository (`identity/ports/user.repository.port.ts`)
```typescript
findById(id): Promise<User | null>
findByGithubId(githubId): Promise<User | null>
findByUsername(username): Promise<User | null>
upsert(data): Promise<User>
update(id, data): Promise<User>
```

---

## Data Flows

### Authenticated Dashboard Request
```
Frontend (Apollo Client, JWT in Authorization header)
  → POST /api/graphql
  → GqlAuthGuard validates JWT (passport-jwt)
  → GraphQL resolver → AnalyticsService.getDashboardMetrics(userId, from, to)
  → Redis cache check (analytics:dashboard:{userId}:{from}:{to}, 5m TTL)
  → Cache miss: IMetricsRepository.getDailyMetrics → Prisma → PostgreSQL
  → Response marshalled as ObjectType and returned
```

### Repository Sync
```
syncRepository mutation  OR  per-user cron
  → AnalyticsService.triggerSync → BullMQ enqueue (job ID: sync-{repoId})
  → SyncRepositoryProcessor.process (concurrency=5)
      → updateRepositorySyncState(SYNCING)
      → getDecryptedToken → IGitHubPort × 3 (commits, PRs, reviews)
      → aggregate into per-day map
      → batchUpsertMetrics (upsert on userId+repoId+date)
      → updateRepositorySyncState(IDLE, lastSyncedAt)
      → StreakService.recalculate
      → AnalyticsService.invalidateDashboardCache
  → Frontend polls repositories query every 3s until syncState = IDLE
  → Apollo resetStore() + full refetch on SYNCING→IDLE transition
```

### Public Profile (SSR)
```
Next.js Server Component: /u/[username]/page.tsx
  → ssrGraphQL (plain fetch, no JWT, Next.js ISR revalidate: 60s)
  → publicProfile resolver → PublicProfileService.getPublicProfile
      → Check user.publicProfile flag (returns null if false)
      → Redis cache (public-profile:{username}, 5m TTL)
      → Cache miss: findByUsername, parallel: streak, techGraph, repos, allMetrics, platformStats
      → Build PublicProfileData, cache it
  → Falls back to GitHubLookupService.lookup for non-DevPulse usernames

og:image (Edge runtime): /u/[username]/opengraph-image.tsx
  → Fetches same publicProfile query independently
  → Renders 1200×627 PNG via ImageResponse/Satori (inline styles only, display:flex required)
  → Revalidates every 300s
```

### Stripe Billing Flow
```
User clicks "Upgrade"
  → UpgradeModal → createCheckoutSession mutation
  → BillingService → StripeAdapter.createCheckoutSession → Stripe API
  → Returns { url } → Frontend redirects to Stripe Checkout
  → User completes payment → Stripe sends POST /api/v1/stripe/webhook
  → WebhookController verifies signature → BillingService.handleWebhook
  → checkout.session.completed → fetchSubscription → update User plan/status/dates
  → Auto-trigger importFromGitHub for PRO upgrade
  → Redirect to /settings?billing=success
```

---

## Frontend Architecture

### Data Fetching
- **Apollo Client 4** with `InMemoryCache` for all authenticated data
- `fetchPolicy: 'network-only'` on all metric queries to prevent stale charts
- `resetStore()` called after sync completes to force full refetch
- **ssrGraphQL** (`packages/web/src/lib/graphql-ssr.ts`) — plain `fetch` for public SSR pages only

### State Management
- **Apollo InMemoryCache** — all server state
- **Zustand** (`packages/web/src/store/ui-store.ts`) — sidebar open/collapsed, mobile menu open, upgrade modal open

### Routing
```
app/
├── page.tsx                      — Marketing landing (public)
├── auth/callback/page.tsx        — OAuth token handler → localStorage → /dashboard
├── u/[username]/
│   ├── page.tsx                  — Public profile (SSR, ISR 60s)
│   └── opengraph-image.tsx       — OG image (Edge, revalidate 300s)
├── r/[owner]/[repo]/page.tsx     — Public repo analysis (SSR)
└── (app)/                        — Auth-gated, sidebar layout
    ├── dashboard/page.tsx
    ├── repos/
    │   ├── page.tsx              — Repo list + Stack tab + Evolution tab
    │   └── [id]/page.tsx         — Repo detail
    ├── streaks/page.tsx
    ├── year/[year]/page.tsx      — Year in Code (PRO gate)
    ├── team/page.tsx             — Waitlist skeleton
    └── settings/page.tsx
```

### Authentication Guard
`packages/web/src/components/providers.tsx` checks localStorage for JWT on mount. If absent, redirects to `/`. Apollo Client sends it as `Authorization: Bearer {token}` on every GraphQL request.

---

## Infrastructure

### PostgreSQL 16
Schema models: `User`, `Repository`, `DailyMetrics`, `Streak`, `WeeklyDigest`, `Webhook`, `Team`, `TeamMember`, `TeamInvite`, `WaitlistEntry`

`DailyMetrics` composite unique key `(userId, repoId, date)` enables idempotent upsert-based incremental sync.

Connection via Prisma 7 + `@prisma/adapter-pg` (explicit driver adapter — `url` in `prisma.config.ts`, not `schema.prisma`).

9 applied migrations from `20260429162154_init` through `20260510_add_waitlist`.

### Redis 7
Used for:
- Application cache (10+ namespaces, 30s–2h TTLs)
- BullMQ job queue storage

Key namespaces: `analytics:dashboard:*`, `analytics:tech-graph:*`, `analytics:repo-insight:*`, `analytics:hourly:*`, `analytics:lang-history:*`, `analytics:ecosystem:*`, `analytics:deps:*`, `analytics:file-ownership:*`, `analytics:file-churn:*`, `analytics:repo-prs:*`, `public-profile:*`

### BullMQ
Queue: `QUEUE_SYNC_REPOSITORY`. Job ID: `sync-{repositoryId}` (deduplicates concurrent sync requests for same repo). Worker concurrency: 5. Backed by Redis.

**Known inconsistency:** `GitHubEventProcessor` uses `sync:${id}` (colon separator) while `AnalyticsService` uses `sync-${id}` (hyphen). This breaks deduplication between webhook-triggered and cron-triggered syncs. Fix: standardize to `sync-${id}` everywhere.

---

## Security

- **GitHub access tokens** — AES-256-GCM encrypted at rest (`packages/api/src/infrastructure/crypto/`)
- **JWT** — HS256, 15-day expiry, validated by `passport-jwt` via `GqlAuthGuard` on all authenticated resolvers
- **Public resolvers** (`publicProfile`, `searchProfile`, `searchRepo`) — no auth guard; public by design
- **Rate limiting** — `@nestjs/throttler` on REST endpoints; `@octokit/plugin-throttling` + `plugin-retry` on GitHub API calls
- **Plan limits** — single source of truth in `packages/api/src/modules/identity/domain/plan-limits.ts`; enforced at `trackRepository`, `triggerSync`, and `importFromGitHub`
- **Stripe webhooks** — verified via `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`

---

*Last updated: 2026-05-12*
