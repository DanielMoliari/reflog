# DevPulse — Domain Design

## Overview

DevPulse follows Domain-Driven Design (DDD) principles organized into five bounded contexts. Each context owns its data and communicates with others via application service calls (NestJS DI) rather than direct DB coupling.

---

## Bounded Contexts

### 1. Identity Context
**Responsibility:** User accounts, GitHub OAuth, session management, plan assignment, public profile opt-in.

**Owns:** User registration and authentication, GitHub token storage (encrypted), plan/subscription status, `publicProfile` opt-in flag, `username` (public handle).

**Key services:** `IdentityService`, `GitHubStrategy`, `JwtStrategy`, `PrismaUserRepository`

---

### 2. Analytics Context
**Responsibility:** Aggregating and serving developer productivity metrics from GitHub activity.

**Owns:** Repository tracking configuration, daily metrics ingestion (`DailyMetrics`), streak calculation (`Streak`), tech graph, language history, hourly activity, repo insights, public profile assembly.

**Key services:** `AnalyticsService`, `SyncRepositoryProcessor`, `StreakService`, `PublicProfileService`, `GitHubLookupService`

---

### 3. Notifications Context
**Responsibility:** Weekly digest generation, streak alert emails.

**Owns:** Digest scheduling and delivery (Resend), notification preferences per user (`streakAlertsEnabled`, `weeklyDigestEnabled`).

**Key services:** `DigestService`, `ResendAdapter`

---

### 4. Billing Context
**Responsibility:** Stripe subscription lifecycle, plan upgrades, feature gating.

**Owns:** Stripe customer/subscription IDs, `subscriptionStatus`, `currentPeriodEnd`, `billingInterval` on User.

**Key services:** `BillingService`, `StripeAdapter` (lazy init — boots without keys)

---

### 5. Webhooks Context
**Responsibility:** Receiving GitHub push/PR events and routing them to sync jobs.

**Owns:** `Webhook` table schema (populated if webhook registration is ever implemented).

**Key services:** `GitHubEventProcessor`, `WebhooksController`

**Note:** Receiver is functional; GitHub webhook registration at repo-track time is not implemented. `Webhook` table is always empty. Sync is cron/manual-only.

---

## Prisma Schema (source of truth)

### User
```
id, email, name, avatarUrl, githubId, githubUsername, username (public handle)
encryptedGithubToken, plan (FREE|PRO|TEAM)
publicProfile, publicShowStreak, publicShowRepos
streakAlertsEnabled, weeklyDigestEnabled
autoSyncEnabled, autoSyncIntervalHours
stripeCustomerId, stripeSubscriptionId, subscriptionStatus, currentPeriodEnd, billingInterval
createdAt, updatedAt
```

### Repository
```
id, userId, githubRepoId, fullName, description, language
isTracked, isPrivate, stars, forks, pushedAt
syncState (IDLE|SYNCING|ERROR), lastSyncedAt
createdAt, updatedAt
```

### DailyMetrics
```
id, userId, repoId, date
commits, additions, deletions, prsOpened, prsMerged, reviewsDone
UNIQUE (userId, repoId, date)   ← enables idempotent incremental upsert
```

### Streak
```
id, userId (unique)
currentStreak, longestStreak, lastActiveDate, freezesUsed
```

### WeeklyDigest
```
id, userId, weekStart (unique per user)
summary (JSON), sentAt
```

### Team / TeamMember / TeamInvite
Schema exists with `Team`, `TeamMember` (roles: ADMIN|MANAGER|MEMBER), `TeamInvite`. No application logic or UI implemented — waitlist only.

### WaitlistEntry
```
id, email (unique), name, company, teamSize, source, createdAt
```

### Webhook
```
id, repoId, githubHookId, events, secret, active
```
Schema exists; table is always empty (no registration code).

---

## Plan Limits (domain object)

Single source of truth: `packages/api/src/modules/identity/domain/plan-limits.ts`

```typescript
export const PLAN_LIMITS = {
  FREE:  { maxTrackedRepos: 10,   historyDays: 90,   streakFreezes: 1,    yearInCode: false, rankPills: false },
  PRO:   { maxTrackedRepos: null, historyDays: null,  streakFreezes: null, yearInCode: true,  rankPills: true  },
  TEAM:  { maxTrackedRepos: null, historyDays: null,  streakFreezes: null, yearInCode: true,  rankPills: true  },
}
```

`null` means unlimited. `historyDays` is enforced in `AnalyticsService.getDashboardMetrics` and the `metrics` GraphQL resolver. `streakFreezes` is compared against `Streak.freezesUsed` in `useStreakFreeze` mutation.

---

## Key Domain Logic

### Streak Calculation (`StreakCalculator`)
Pure TypeScript class with no framework dependencies. Given a sorted array of active dates:
- Counts consecutive days from today backwards (gap tolerance: 1 day)
- Returns `currentStreak`, `longestStreak`
- Triggered after every `SyncRepositoryProcessor` completion via `StreakService.recalculate`

### Burnout Signal
Computed in `AnalyticsService.getInsights`. Looks at the trailing 14 days:
- `atRisk: true` when `consecutiveDays ≥ 14` AND `netLinesTrend < 0` (declining output)
- Returns `consecutiveDays`, `netLinesTrend` (float), `message` (string), `atRisk` (boolean)

### Tech Graduation Detection
Detects language migration events (e.g., JavaScript → TypeScript). Compares year-over-year byte share per language. A "graduation" is detected when a language's share drops by ≥ 30% while a related language grows by ≥ 30% in the same period. Returns confidence score 0–1.

### Public Profile Assembly (`PublicProfileService`)
1. Checks `user.publicProfile` — returns `null` if `false` (private by default)
2. Assembles: streak (if `publicShowStreak`), tracked public repos (if `publicShowRepos`), top 5 languages from tech graph, 365-day heatmap, all-time commit/lines/PR totals, rank pills (gated on `userCount ≥ 10`)
3. Caches at `public-profile:{username}` with 5m TTL

### Personal Records
`getPersonalRecords` queries `MAX(commits)`, `MAX(additions)`, `MAX(netLines)` across all `DailyMetrics` for the user. Frontend compares against today's values post-sync and shows a trophy toast if any record is broken.

---

## Context Map

```
┌─────────────────┐                              ┌──────────────────┐
│  Identity       │ ── user lookup / token ────► │  Analytics       │
│  Context        │                              │  Context         │
│                 │ ◄── publicProfile data ───── │                  │
└─────────────────┘                              └────────┬─────────┘
        │                                                 │
        │ plan upgrade (webhook)               RepositorySynced
        ▼                                      StreakUpdated
┌─────────────────┐                            │
│  Billing        │                            ▼
│  Context        │           ┌──────────────────────┐
│  (Stripe)       │           │  Notifications       │
└─────────────────┘           │  Context (Resend)    │
                              └──────────────────────┘
```

---

*Last updated: 2026-05-12*
