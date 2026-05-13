# DevPulse — API Reference

## Overview

DevPulse exposes two API surfaces:
1. **GraphQL** — primary interface for the web dashboard (queries + mutations)
2. **REST** — OAuth auth flow, Stripe webhook, and card image endpoint

Base URL: `http://localhost:17642/api/v1`
Swagger docs: `http://localhost:17642/api/docs`
GraphQL endpoint: `http://localhost:17642/api/graphql`

---

## Authentication

All authenticated GraphQL operations require a Bearer JWT:

```
Authorization: Bearer <jwt_token>
```

JWTs are issued after completing GitHub OAuth and expire per `JWT_EXPIRES_IN` (default `15d`). No refresh token — users re-authenticate via OAuth.

### Auth Flow

```
1. Frontend → GET /api/v1/auth/github
        │
        └─► Redirect to github.com/login/oauth/authorize
                │
                └─► GitHub → GET /api/v1/auth/github/callback?code=xxx
                        │
                        └─► API issues JWT
                                │
                                └─► Redirect to /auth/callback?token=xxx
                                        │
                                        └─► Frontend stores token, redirects to /dashboard
```

---

## GraphQL Operations

All operations are defined code-first. The auto-generated schema lives at `packages/api/src/graphql/schema.gql`.

### Queries

| Operation | Auth | Description |
|---|---|---|
| `me` | ✅ | Current user: id, name, email, avatarUrl, plan, githubUsername, autoSyncEnabled, autoSyncIntervalHours, subscriptionStatus, currentPeriodEnd |
| `repositories` | ✅ | All repos (tracked + untracked); each has id, fullName, language, isTracked, isPrivate, syncState, pushedAt, lastSyncedAt |
| `metrics(input: { from, to })` | ✅ | Daily metric rows aggregated across all tracked repos; history window clamped to plan's `historyDays` (FREE=90d, PRO/TEAM=all-time) |
| `streak` | ✅ | currentStreak, longestStreak, lastActiveDate, freezesUsed |
| `heatmap(year?, metric?)` | ✅ | 365-day grid; metric: COMMITS \| LINES \| CHURN \| PRS |
| `techGraph` | ✅ | Repo × language constellation nodes and links (byte weights) |
| `languageHistory` | ✅ | Year-over-year cumulative adoption `{ years[], series[] }` for streamgraph |
| `insights` | ✅ | Burnout signal (atRisk, consecutiveDays, netLinesTrend) + tech graduations list |
| `hourlyActivity` | ✅ | 24-slot UTC hour distribution `{ hours[], peakHour, peakRatio }`; 1–3 min cold path |
| `repositoryDetail(id)` | ✅ | Health score, PR timeline, file hotspots, ecosystem connections, code ownership, curiosities |
| `platformStats` | ❌ | Live userCount + commitCount from DB (used on landing page) |
| `publicProfile(username)` | ❌ | Public profile data; returns null if user hasn't opted in or doesn't exist in DevPulse |
| `searchProfile(query)` | ❌ | DevPulse profile search, falls back to GitHub API |
| `searchRepo(owner, repo)` | ❌ | Anonymous GitHub repo analysis |
| `billingStatus` | ✅ | isConfigured (Stripe keys present), subscriptionStatus, currentPeriodEnd, plan |
| `personalRecords` | ✅ | All-time daily bests for commits, additions, netLines; compare against today |

### Mutations

| Operation | Auth | Description |
|---|---|---|
| `trackRepository(githubRepoId)` | ✅ | Start tracking a repo; enforces plan cap |
| `untrackRepository(id)` | ✅ | Stop tracking a repo |
| `syncRepository(id)` | ✅ | Enqueue a sync job; enforces plan cap |
| `syncAllRepositories` | ✅ | Enqueue sync for all tracked repos |
| `importFromGitHub` | ✅ | Re-import all GitHub repos, track up to plan cap; returns `{ imported, tracked }` |
| `updateProfile(input)` | ✅ | Update display name |
| `updateNotificationPrefs(input)` | ✅ | Toggle streakAlerts + weeklyDigest |
| `updatePublicProfilePrefs(input)` | ✅ | Toggle publicShowStreak + publicShowRepos |
| `enablePublicProfile(input: { username })` | ✅ | Opt in to public profile at `/u/{username}`; validates username format + reserved names |
| `disablePublicProfile` | ✅ | Opt out; profile returns 404/GitHub-fallback |
| `updateAutoSyncPrefs(input)` | ✅ | Toggle autoSyncEnabled, set autoSyncIntervalHours (1/6/24) |
| `useStreakFreeze` | ✅ | Apply a freeze for today; FREE plan: 1 lifetime freeze; PRO: unlimited |
| `deleteAccount` | ✅ | Wipes user row + all related data via Prisma cascade; clears token |
| `createCheckoutSession(priceId)` | ✅ | Create Stripe Checkout session; returns `{ url }` |
| `createPortalSession` | ✅ | Create Stripe Customer Portal session; returns `{ url }` |
| `joinWaitlist(input)` | ❌ | Add entry to `WaitlistEntry` table (Team plan waitlist) |
| `sendTestDigest` | ✅ | Trigger weekly digest email immediately (developer-only; no UI) |

---

## REST Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/auth/github` | Initiate GitHub OAuth flow |
| GET | `/api/v1/auth/github/callback` | GitHub OAuth callback — issues JWT, redirects to frontend |

### Stripe

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/stripe/webhook` | Receive Stripe events (signature verified via `STRIPE_WEBHOOK_SECRET`) |

Handled events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Card Image

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/card/:username` | SVG profile card for README embedding |

### GitHub Webhooks

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/webhooks/github` | Receive GitHub push/PR events |

**Note:** Webhook receiver is wired and functional, but DevPulse never registers webhooks with GitHub at repo-track time. The `Webhook` DB table is always empty. Sync is cron-only.

### Documentation

| Method | Path | Description |
|---|---|---|
| GET | `/api/docs` | Swagger/OpenAPI UI |

---

## Plan Limits

Enforced server-side at `trackRepository`, `triggerSync`, and `importFromGitHub`. Single source of truth: `packages/api/src/modules/identity/domain/plan-limits.ts`.

| Feature | FREE | PRO | TEAM |
|---|---|---|---|
| Tracked repos | 10 | Unlimited | Unlimited |
| History window | 90 days | All-time | All-time |
| Year in Code | ❌ | ✅ | ✅ |
| Rank pills on public profile | ❌ | ✅ | ✅ |
| Streak freezes | 1 (lifetime) | Unlimited | Unlimited |
| Weekly digest | ✅ | ✅ | ✅ |

---

## Rate Limiting

### GitHub API
- Authenticated REST: 5,000 req/hour per user token
- Managed by `@octokit/plugin-throttling` + `@octokit/plugin-retry`

### NestJS Throttler (REST endpoints)
Applied globally; GraphQL endpoint uses per-resolver guards where needed.

---

## Error Handling

### GraphQL Errors
```json
{
  "errors": [{
    "message": "Repository not found",
    "extensions": { "code": "NOT_FOUND" }
  }]
}
```

### REST Errors
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "JWT has expired"
}
```

### Error Codes

| Code | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `PLAN_LIMIT_EXCEEDED` | 402 | Plan repo or history limit reached |
| `BILLING_NOT_CONFIGURED` | 503 | Stripe keys not set |

---

*Last updated: 2026-05-12*
